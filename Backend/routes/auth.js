import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin credentials
const ADMIN_EMAIL = 'mettumanikanta098@gmail.com';
const ADMIN_PASSWORD = 'Manikanta20@#';

// Mock user database
const users = [];

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
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
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check if admin login
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ email }, 'your_jwt_secret', { expiresIn: '1h' });
        return res.json({ token });
    }

    // Look for user in DB (mocked for this example)
    const user = users.find(user => user.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });
        return res.json({ token });
    }

    res.status(401).json({ message: 'Invalid credentials' });
});

// Signup route
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedPassword });
    res.status(201).json({ message: 'User created' });
});

// Protected route example
router.get('/dashboard', authenticateJWT, (req, res) => {
    res.json({ message: 'Welcome to the protected dashboard, ' + req.user.email });
});

export default router;
