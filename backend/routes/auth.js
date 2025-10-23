const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/auth/setup
// @desc    Create the initial Super Admin user (one-time use)
// @access  Public
router.post('/setup', async (req, res) => {
    try {
        // Check if a Super Admin already exists
        let adminUser = await User.findOne({ role: 'Super Admin' });
        if (adminUser) {
            return res.status(400).json({ message: 'Super Admin user already exists.' });
        }

        const newUser = new User({
            name: 'Super Admin',
            email: 'superadmin@test.com',
            password: 'password123', // Will be hashed below
            role: 'Super Admin',
        });

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(newUser.password, salt);

        await newUser.save();
        res.status(201).json({ message: 'Super Admin user created successfully. Please login.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // This validation is important
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // User is valid, create JWT payload
        const payload = {
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        };

        // Sign the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, // Token expires in 5 hours
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

