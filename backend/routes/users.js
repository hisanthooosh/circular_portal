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

// --- REPLACE the existing isAdminOrSuperAdmin function with this ---
const isAdminOrSuperAdmin = (req, res, next) => {
    console.log("--- isAdminOrSuperAdmin middleware ---"); // Log entry point

    // Check 1: Did authMiddleware run and set req.user?
    if (!req.user) {
        console.log("isAdminOrSuperAdmin: FAILED - req.user is undefined. Authentication might have failed or middleware order is wrong.");
        // If authMiddleware failed, it should have sent 401. This case indicates a potential setup issue.
        return res.status(500).json({ message: 'Middleware configuration error.' });
    }

    const userRole = req.user.role;
    console.log(`isAdminOrSuperAdmin: Checking user info passed from authMiddleware: ID=${req.user.id}, Role=${userRole}`); // Log user info

    // Check 2: Is the role allowed?
    if (userRole === 'Admin' || userRole === 'Super Admin') {
        console.log(`isAdminOrSuperAdmin: Access GRANTED for role "${userRole}". Calling next().`);
        next(); // Allow access
    } else {
        console.log(`isAdminOrSuperAdmin: Access DENIED. Role "${userRole}" is not Admin or Super Admin.`);
        return res.status(403).json({ message: 'Access denied. Admin or Super Admin role required.' });
    }
};
// --- END REPLACEMENT ---

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
            if (loggedInUser.role === 'Admin' || loggedInUser.role === 'Super Admin') {
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
// @desc    Get users (Super Admin sees ALL, Admin sees ONLY their managed users)
// @access  Private (Admin or Super Admin)
router.get('/', [authMiddleware, isAdminOrSuperAdmin], async (req, res) => {
    console.log("--- GET /api/users ---"); // Simplified log message
    try {
        const loggedInUserId = req.user.id;
        const loggedInUserRole = req.user.role;

        let query = {}; // Default: empty query (gets all users)

        console.log(`Fetching users for: ID=${loggedInUserId}, Role=${loggedInUserRole}`);

        // --- Apply filter ONLY if the logged-in user is an Admin ---
        if (loggedInUserRole === 'Admin') {
            // Admin sees ONLY users they directly manage
            query = { managedBy: loggedInUserId };
            console.log("Applying Admin filter:", JSON.stringify(query));
        } else if (loggedInUserRole === 'Super Admin') {
            // Super Admin uses the default empty query to get ALL users
            console.log("Applying Super Admin filter (no filter - get all):", JSON.stringify(query));
        }
        // --- End Filter Logic ---

        // Find users based on the query, exclude passwords, populate manager info
        const users = await User.find(query)
            .select('-password')
            .populate('managedBy', 'name email') // Populate manager info
            .sort({ role: 1, name: 1 }); // Sort by role, then name

        console.log(`Found ${users.length} users with query for role ${loggedInUserRole}.`);

        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching users' });
    }
    console.log("--- END GET /api/users ---");
});



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

// --- NEW ROUTE for Super Admin All Users View ---
// @route   GET api/users/all
// @desc    Get ALL users in the system
// @access  Private (Super Admin ONLY)
router.get('/all', [authMiddleware, isSuperAdmin], async (req, res) => { // Uses isSuperAdmin middleware
    console.log("--- GET /api/users/all (SA Overview) ---");
    try {
        // Find ALL users, exclude passwords, populate manager info
        const allUsers = await User.find({}) // Empty query {} fetches all
            .select('-password')
            .populate('managedBy', 'name email') // Populate manager details
            .sort({ role: 1, name: 1 }); // Sort by role, then name

        console.log(`Found ${allUsers.length} total users for SA overview.`);

        res.json(allUsers);
    } catch (err) {
        console.error("Error fetching all users:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching all users' });
    }
    console.log("--- END GET /api/users/all (SA Overview) ---");
});
// --- END NEW ROUTE ---

// --- NEW ROUTE for Super Admin All Users View ---
// @route   GET api/users/all
// @desc    Get ALL users in the system
// @access  Private (Super Admin ONLY)
router.get('/all', [authMiddleware, isSuperAdmin], async (req, res) => { // Uses isSuperAdmin middleware
    console.log("--- GET /api/users/all (SA Overview) ---");
    try {
        // Find ALL users, exclude passwords, populate manager info
        const allUsers = await User.find({}) // Empty query {} fetches all
            .select('-password')
            .populate('managedBy', 'name email') // Populate manager details
            .sort({ role: 1, name: 1 }); // Sort by role, then name

        console.log(`Found ${allUsers.length} total users for SA overview.`);

        res.json(allUsers);
    } catch (err) {
        console.error("Error fetching all users:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching all users' });
    }
    console.log("--- END GET /api/users/all (SA Overview) ---");
});
// --- END NEW ROUTE ---
module.exports = router;

