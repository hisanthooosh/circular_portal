const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware Functions for Role Checks
const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    }
    next();
};

const isAdminOrSuperAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Super Admin')) {
        return res.status(403).json({ message: 'Access denied. Admin or Super Admin role required.' });
    }
    next();
};

// @route   POST api/users
// @desc    Create a new user (Super Admin creates Admins/Others, Admin creates CC/CV)
// @access  Private (Admin or Super Admin)
router.post('/', [authMiddleware, isAdminOrSuperAdmin], async (req, res) => {
    const { name, email, password, role, department } = req.body;
    const loggedInUser = req.user; // Info of the user making the request

    try {
        // Role Validation: Who can create whom?
        if (loggedInUser.role === 'Admin' && (role === 'Super Admin' || role === 'Admin' || role === 'Circular Approver')) {
            return res.status(403).json({ message: 'Admins can only create Circular Creators or Viewers.' });
        }
        // Add more validation if needed (e.g., ensure required fields based on role)

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Determine the manager (managedBy)
        let managerId = null;
        if (role === 'Circular Creator' || role === 'Circular Viewer') {
             // If created by Admin or SA, set them as manager
             if (loggedInUser.role === 'Admin' || loggedInUser.role === 'Super Admin'){
                 managerId = loggedInUser.id;
             }
        }
        // Note: Super Admin creating an Admin - managerId remains null

        user = new User({
            name,
            email,
            password,
            role,
            department: department || undefined, // Set department only if provided
            managedBy: managerId // Set the determined manager
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const userToReturn = user.toObject();
        delete userToReturn.password;

        res.status(201).json({ message: 'User created successfully', user: userToReturn });

    } catch (err) {
        console.error("Error creating user:", err.message);
        res.status(500).json({ message: 'Server Error creating user' });
    }
});
// @route   GET api/users
// @desc    Get users (Super Admin sees all, Admin sees their managed users)
// @access  Private (Admin or Super Admin)
router.get('/', [authMiddleware, isAdminOrSuperAdmin], async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Admin') {
            // Admin only sees users they manage
            query = { managedBy: req.user.id };
        }
        // Super Admin sees all (empty query)

        // Find users based on the query, exclude passwords
        const users = await User.find(query).select('-password').populate('managedBy', 'name email'); // Populate manager info
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ message: 'Server Error fetching users' });
    }
});
// @route   DELETE api/users/:id
// @desc    Delete a user (Super Admin deletes anyone, Admin deletes their managed users)
// @access  Private (Admin or Super Admin)
router.delete('/:id', [authMiddleware, isAdminOrSuperAdmin], async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        const loggedInUser = req.user;

        // Prevent deleting oneself
        if (userToDelete.id === loggedInUser.id) {
             return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        // Check permissions
        let canDelete = false;
        if (loggedInUser.role === 'Super Admin') {
            canDelete = true; // Super Admin can delete anyone (except self)
        } else if (loggedInUser.role === 'Admin') {
            // Admin can only delete users they manage
            if (userToDelete.managedBy && userToDelete.managedBy.toString() === loggedInUser.id) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return res.status(403).json({ message: 'You do not have permission to delete this user.' });
        }

        // Perform deletion
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ message: 'Server Error deleting user' });
    }
});
module.exports = router;

