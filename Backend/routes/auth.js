import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// Admin credentials
const ADMIN_EMAIL = "mettumanikanta098@gmail.com";
const ADMIN_PASSWORD = "Manikanta20@#";

// Mock user database
const users = [];

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (token) {
    jwt.verify(token, "your_jwt_secret", (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check if admin login
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { email, userId: "admin", role: "admin" },
      "your_jwt_secret",
      { expiresIn: "1h" },
    );
    const refreshToken = jwt.sign(
      { email, userId: "admin", role: "admin" },
      "your_jwt_secret",
      { expiresIn: "7d" },
    );
    return res.json({
      token,
      refreshToken,
      userId: "admin",
      role: "admin",
      message: "Admin login successful",
    });
  }

  // Look for user in DB (mocked for this example)
  const user = users.find((user) => user.email === email);
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign(
      { email: user.email, userId: `user_${Date.now()}`, role: "user" },
      "your_jwt_secret",
      { expiresIn: "1h" },
    );
    const refreshToken = jwt.sign(
      { email: user.email, userId: `user_${Date.now()}`, role: "user" },
      "your_jwt_secret",
      { expiresIn: "7d" },
    );
    return res.json({
      token,
      refreshToken,
      userId: `user_${Date.now()}`,
      role: "user",
      message: "Login successful",
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

// Signup route
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.status(201).json({ message: "User created" });
});

// Protected route example
router.get("/dashboard", authenticateJWT, (req, res) => {
  res.json({
    message: "Welcome to the protected dashboard, " + req.user.email,
  });
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, "your_jwt_secret");

    // Generate new tokens
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      "your_jwt_secret",
      { expiresIn: "1h" },
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      "your_jwt_secret",
      { expiresIn: "7d" },
    );

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

// Admin login HTML page
router.get("/admin-login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - ChillBoard</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #475569; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
        button:hover { background: #334155; }
        .error { color: red; margin-top: 10px; }
        .success { color: green; margin-top: 10px; }
        .info { background: #f0f9ff; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #0ea5e9; }
    </style>
</head>
<body>
    <h1>Admin Login</h1>
    <div class="info">
        <strong>Admin Credentials:</strong><br>
        Email: mettumanikanta098@gmail.com<br>
        Password: Manikanta20@#
    </div>
    <form id="loginForm">
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Login</button>
    </form>
    <div id="message"></div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="success">Login successful! Token: ' + data.token + '</div>';
                    localStorage.setItem('adminToken', data.token);
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    messageDiv.innerHTML = '<div class="error">' + data.message + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">Login failed. Please try again.</div>';
            }
        });
    </script>
</body>
</html>
    `);
});

export default router;
