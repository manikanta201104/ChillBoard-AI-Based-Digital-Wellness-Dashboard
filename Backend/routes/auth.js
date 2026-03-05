'use strict';

const express = require('express');
const router = express.Router();

const ADMIN_EMAIL = 'mettumanikanta098@gmail.com';
const ADMIN_PASSWORD = 'Manikanta20@#';

// Signup route
router.post('/signup', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL) {
        return res.status(403).json({ message: 'Admin email is not allowed to signup.' });
    }
    // Code for handling signup for other users
});

// Login route
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.status(200).json({ message: 'Welcome Admin!' });
    }
    // Code for handling login for other users
});

module.exports = router;