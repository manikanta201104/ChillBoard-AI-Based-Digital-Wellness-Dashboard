import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/user.js";

const router = express.Router();

// Admin credentials from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mettumanikanta098@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Manikanta20@#";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Mock user database
const users = [];

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (token) {
    try {
      jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
          console.warn("JWT verification failed:", err.message);
          return res.sendStatus(403);
        }
        req.user = user;
        next();
      });
    } catch (error) {
      console.error("JWT error:", error);
      return res.sendStatus(403);
    }
  } else {
    res.sendStatus(401);
  }
};

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check if admin login
  if (email === ADMIN_EMAIL) {
    let passwordMatch = false;

    // If hash is available, use it; otherwise compare plain text (for development)
    if (ADMIN_PASSWORD_HASH) {
      passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    } else {
      passwordMatch = password === ADMIN_PASSWORD;
    }

    if (passwordMatch) {
      console.log("Admin login successful for:", email);
      const token = jwt.sign(
        { email, userId: "admin", role: "admin" },
        config.jwtSecret,
        { expiresIn: "1h" },
      );
      const refreshToken = jwt.sign(
        { email, userId: "admin", role: "admin" },
        config.jwtSecret,
        { expiresIn: "7d" },
      );
      console.log("Generated admin tokens");
      return res.json({
        token,
        refreshToken,
        userId: "admin",
        role: "admin",
        message: "Admin login successful",
      });
    }
  }

  // Look for user in DB (mocked for this example)
  const user = users.find((user) => user.email === email);
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign(
      { email: user.email, userId: `user_${Date.now()}`, role: "user" },
      config.jwtSecret,
      { expiresIn: "1h" },
    );
    const refreshToken = jwt.sign(
      { email: user.email, userId: `user_${Date.now()}`, role: "user" },
      config.jwtSecret,
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
  const { email, password, username } = req.body;

  try {
    // Generate username from email if not provided
    const generatedUsername = username || email.split("@")[0];

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username: generatedUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or username",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
    const newUser = new User({
      userId: `user_${Date.now()}`,
      username: generatedUsername,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate tokens for new user
    const token = jwt.sign(
      {
        email,
        userId: newUser.userId,
        role: "user",
        username: generatedUsername,
      },
      config.jwtSecret,
      { expiresIn: "1h" },
    );
    const refreshToken = jwt.sign(
      {
        email,
        userId: newUser.userId,
        role: "user",
        username: generatedUsername,
      },
      config.jwtSecret,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      refreshToken,
      userId: newUser.userId,
      username: generatedUsername,
      role: "user",
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
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
    const decoded = jwt.verify(refreshToken, config.jwtSecret);

    // Generate new tokens
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwtSecret,
      { expiresIn: "1h" },
    );

    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      config.jwtSecret,
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

// Profile endpoint
router.get("/profile", authenticateJWT, (req, res) => {
  // Extract username from email or use userId as fallback
  const username = req.user.email
    ? req.user.email.split("@")[0]
    : req.user.userId;

  res.json({
    userId: req.user.userId,
    email: req.user.email,
    username: username,
    role: req.user.role,
  });
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
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; background: #f8fafc; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: #374151; }
        input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
        input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        button { background: #3b82f6; color: white; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-size: 14px; font-weight: 600; }
        button:hover { background: #2563eb; }
        .error { color: #dc2626; margin-top: 10px; padding: 10px; background: #fef2f2; border-radius: 6px; border: 1px solid #fecaca; }
        .success { color: #059669; margin-top: 10px; padding: 10px; background: #ecfdf5; border-radius: 6px; border: 1px solid #a7f3d0; }
        .info { background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        h1 { text-align: center; margin-bottom: 30px; color: #1f2937; font-size: 24px; }
    </style>
</head>
<body>
    <div class="container">
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
    </div>

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
                    messageDiv.innerHTML = '<div class="success">Login successful! Redirecting to admin dashboard...</div>';
                    localStorage.setItem('jwt', data.token);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('role', data.role);
                    
                    // Redirect to frontend admin dashboard
                    setTimeout(() => {
                        window.location.href = 'https://www.chillboard.in/admin';
                    }, 1500);
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
