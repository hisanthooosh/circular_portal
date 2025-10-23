const express = require('express');
const router = express.Router();
const SignatoryAuthority = require('../models/SignatoryAuthority');
const authMiddleware = require('../middleware/auth');

// Middleware to check if the user is a Super Admin
const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    }
    next();
};

// @route   POST api/signatories
// @desc    Create a new signatory authority
// @access  Private (Super Admin)
router.post('/', [authMiddleware, isSuperAdmin], async (req, res) => {
    const { name, position } = req.body;
    try {
        // Simple check for existing? Maybe not needed if names/positions can repeat.
        const newSignatory = new SignatoryAuthority({ name, position });
        await newSignatory.save();
        res.status(201).json(newSignatory);
    } catch (err) {
        console.error("Error creating signatory:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET api/signatories
// @desc    Get all signatory authorities
// @access  Private (Authenticated users - needed for dropdowns)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const signatories = await SignatoryAuthority.find().sort({ name: 1 }); // Sort alphabetically
        res.json(signatories);
    } catch (err) {
        console.error("Error fetching signatories:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE api/signatories/:id
// @desc    Delete a signatory authority
// @access  Private (Super Admin)
router.delete('/:id', [authMiddleware, isSuperAdmin], async (req, res) => {
    try {
        const signatory = await SignatoryAuthority.findById(req.params.id);
        if (!signatory) {
            return res.status(404).json({ message: 'Signatory Authority not found' });
        }
        await SignatoryAuthority.findByIdAndDelete(req.params.id);
        res.json({ message: 'Signatory Authority deleted successfully' });
    } catch (err) {
        console.error("Error deleting signatory:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;