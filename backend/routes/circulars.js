const express = require('express');
const router = express.Router();
const Circular = require('../models/Circular');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// --- Middleware for Role Checking ---
const isCreatorOrAdmin = (req, res, next) => {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Circular Creator') {
        return res.status(403).json({ message: 'Access denied. Creator or Super Admin role required.' });
    }
    next();
};

const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    }
    next();
};

const isApprover = (req, res, next) => {
    if (req.user.role !== 'Circular Approver') {
        return res.status(403).json({ message: 'Access denied. Approver role required.' });
    }
    next();
};


// @route   POST api/circulars
// @desc    Create a new circular (as a Draft)
// @access  Private (Creator or Super Admin)
router.post('/', [authMiddleware, isCreatorOrAdmin], async (req, res) => {
    try {
        const newCircular = new Circular({
            ...req.body,
            author: req.user.id,
            status: 'Draft', // All new circulars start as a Draft
        });

        const savedCircular = await newCircular.save();
        res.status(201).json(savedCircular);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET api/circulars
// @desc    Get circulars based on user role
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        let circulars;
        const userRole = req.user.role;

        if (userRole === 'Super Admin') {
            // Super Admin sees all circulars
            circulars = await Circular.find().populate('author', 'name').sort({ createdAt: -1 });
        } else if (userRole === 'Circular Creator') {
            // Creator sees only the circulars they created
            circulars = await Circular.find({ author: req.user.id }).sort({ createdAt: -1 });
        } else if (userRole === 'Circular Approver') {
            // Approver sees circulars assigned to them
            circulars = await Circular.find({ 'approvers.user': req.user.id }).sort({ createdAt: -1 });
        } else if (userRole === 'Circular Viewer') {
            // Viewer sees only Published circulars
            circulars = await Circular.find({ status: 'Published' }).sort({ publishedAt: -1 });
        } else {
            return res.status(403).json({ message: 'Invalid user role' });
        }
        
        res.json(circulars);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PATCH api/circulars/submit/:id
// @desc    Submit a draft circular for approval
// @access  Private (Creator)
router.patch('/submit/:id', authMiddleware, async (req, res) => {
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) {
            return res.status(404).json({ message: 'Circular not found' });
        }
        // Ensure the person submitting is the author
        if (circular.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized to perform this action' });
        }
        circular.status = 'Pending Super Admin';
        await circular.save();
        res.json(circular);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   PATCH api/circulars/review/:id
// @desc    Super Admin reviews a circular (Approve or Reject)
// @access  Private (Super Admin)
router.patch('/review/:id', [authMiddleware, isSuperAdmin], async (req, res) => {
    const { decision, rejectionReason, higherApproverIds } = req.body; // decision can be 'Approve' or 'Reject'

    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        if (decision === 'Reject') {
            circular.status = 'Rejected';
            circular.rejectionReason = rejectionReason || 'No reason provided.';
        } else if (decision === 'Approve') {
            // Check if it needs higher approval
            if (higherApproverIds && higherApproverIds.length > 0) {
                circular.status = 'Pending Higher Approval';
                circular.approvers = higherApproverIds.map(id => ({ user: id, decision: 'Pending' }));
            } else {
                circular.status = 'Approved';
            }
        } else {
            return res.status(400).json({ message: 'Invalid decision provided.' });
        }

        await circular.save();
        res.json(circular);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ... More routes for Higher Approval and Publishing will be added later ...

module.exports = router;

