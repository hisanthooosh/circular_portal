const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware to check if the user is a Super Admin
const isSuperAdmin = (req, res, next) => {
    // We need to check if req.user exists first
    if (!req.user || req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    }
    next();
};

// @route   POST api/users
// @desc    Create a new user (Super Admin only)
// @access  Private (Super Admin)
router.post('/', [authMiddleware, isSuperAdmin], async (req, res) => {
    const { name, email, password, role, department } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        user = new User({ name, email, password, role, department });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        // Return the user object but without the password for security
        const userToReturn = user.toObject();
        delete userToReturn.password;
        
        res.status(201).json({ message: 'User created successfully', user: userToReturn });

    } catch (err) {
        console.error(err.message);
        // THIS IS THE FIX: We now send a proper JSON error response
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET api/users
// @desc    Get all users (Super Admin only)
// @access  Private (Super Admin)
router.get('/', [authMiddleware, isSuperAdmin], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE api/users/:id
// @desc    Delete a user (Super Admin only)
// @access  Private (Super Admin)
router.delete('/:id', [authMiddleware, isSuperAdmin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.id === req.user.id) {
             return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;

