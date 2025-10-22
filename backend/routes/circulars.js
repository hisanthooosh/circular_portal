const express = require('express');
const router = express.Router(); // Ensure this line is present at the top
const Circular = require('../models/Circular');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// --- Middleware for Role Checking ---
const isCreatorOrAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Super Admin' && req.user.role !== 'Circular Creator')) {
        return res.status(403).json({ message: 'Access denied. Creator or Super Admin role required.' });
    }
    next();
};

const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    }
    next();
};

const isSuperAdminOrApprover = (req, res, next) => {
     if (!req.user || (req.user.role !== 'Super Admin' && req.user.role !== 'Circular Approver')) {
        return res.status(403).json({ message: 'Access denied. Approver or Super Admin role required.' });
    }
    next();
};


// @route   POST api/circulars
// @desc    Create a new circular (as a Draft)
// @access  Private (Creator or Super Admin)
router.post('/', [authMiddleware, isCreatorOrAdmin], async (req, res) => {
    // Destructure new fields from request body
    const {
        type,
        subject,
        body,
        circularNumber,
        date,
        signatories, // Expecting an array like [{ authority: 'id', order: 1 }, ...]
        agendaPoints,
        copyTo
    } = req.body;

    try {
        // Basic validation
        if (!type || !subject || !body || !circularNumber || !date || !signatories || signatories.length === 0) {
             return res.status(400).json({ message: 'Missing required circular fields.' });
        }

        // Ensure signatories have authority and order
        if (!signatories.every(s => s.authority && typeof s.order === 'number')) { // Check order is a number too
             return res.status(400).json({ message: 'Each signatory must have an authority ID and a valid order number.' });
        }

        const newCircular = new Circular({
            type,
            subject,
            body,
            circularNumber,
            date,
            signatories, // Save the array directly
            agendaPoints: agendaPoints || [], // Handle optional fields
            copyTo: copyTo || [], // Handle optional fields
            author: req.user.id,
            status: 'Draft',
        });

        const savedCircular = await newCircular.save();

        // Populate signatory details before sending back
        const populatedCircular = await Circular.findById(savedCircular._id)
            .populate('signatories.authority', 'name position')
            .populate('author', 'name email'); // Populate author too

        res.status(201).json(populatedCircular);
    } catch (err) {
        console.error("Error creating circular:", err.message);
        // Provide more specific error if possible (e.g., validation error)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Server Error creating circular' });
    }
});

// @route   GET api/circulars
// @desc    Get circulars based on user role
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = {};
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'Circular Creator') {
            query = { author: userId };
        } else if (userRole === 'Circular Approver') {
            query = { status: 'Pending Higher Approval', 'approvers.user': userId };
        } else if (userRole === 'Circular Viewer') {
             query = { status: 'Published' }; // Assuming 'Published' status exists
        } else if (userRole !== 'Super Admin') {
             // For any other unexpected role, show nothing or handle error
             console.warn(`Unexpected role accessing GET /circulars: ${userRole}`);
             return res.json([]); // Return empty array safely
        }
        // Super Admin gets everything (empty query)

        const circulars = await Circular.find(query)
            .populate('author', 'name email') // Get author details
            .populate('signatories.authority', 'name position') // Get signatory details
            .populate('approvers.user', 'name email') // Get approver details
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

        res.json(circulars);
    } catch (err) {
        console.error("Error fetching circulars:", err.message);
        res.status(500).json({ message: 'Server Error fetching circulars' });
    }
});

// @route   PATCH api/circulars/submit/:id
// @desc    Submit a draft circular for approval
// @access  Private (Creator or Super Admin who authored it)
router.patch('/submit/:id', authMiddleware, async (req, res) => {
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        // Ensure only the author can submit (unless Super Admin override?)
        if (circular.author.toString() !== req.user.id && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'User not authorized' });
        }
        if (circular.status !== 'Draft' && circular.status !== 'Rejected') {
             return res.status(400).json({ message: 'Only Draft or Rejected circulars can be submitted' });
        }

        circular.status = 'Pending Super Admin';
        circular.rejectionReason = undefined; // Clear rejection reason on resubmission
        const updatedCircular = await circular.save();
         // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error submitting circular:", err.message);
        res.status(500).json({ message: 'Server Error submitting circular' });
    }
});


// @route   PATCH api/circulars/review/:id
// @desc    Super Admin reviews a circular (Approve, Reject, or Send Higher)
// @access  Private (Super Admin)
router.patch('/review/:id', [authMiddleware, isSuperAdmin], async (req, res) => {
    const { decision, rejectionReason, higherApproverIds } = req.body;

    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });
        if (circular.status !== 'Pending Super Admin') {
            return res.status(400).json({ message: 'Circular is not pending review by Super Admin' });
        }

        circular.rejectionReason = undefined; // Clear previous rejection reason

        if (decision === 'Reject') {
            circular.status = 'Rejected';
            circular.rejectionReason = rejectionReason || 'No reason provided by Super Admin.';
            circular.approvers = []; // Clear any potential approvers if rejected now
        } else if (decision === 'Approve') {
            if (higherApproverIds && higherApproverIds.length > 0) {
                const approverUsers = await User.find({ _id: { $in: higherApproverIds }, role: 'Circular Approver' });
                if(approverUsers.length !== higherApproverIds.length) {
                    return res.status(400).json({ message: 'One or more selected higher approvers are invalid.' });
                }
                circular.status = 'Pending Higher Approval';
                circular.approvers = higherApproverIds.map(id => ({ user: id, decision: 'Pending', feedback: '' }));
            } else {
                circular.status = 'Approved';
                circular.approvers = []; // No higher approval needed
            }
        } else {
            return res.status(400).json({ message: 'Invalid decision provided.' });
        }

        const updatedCircular = await circular.save();
         // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error reviewing circular:", err.message);
        res.status(500).json({ message: 'Server Error reviewing circular' });
    }
});

// @route   PATCH api/circulars/higher-review/:id
// @desc    Circular Approver submits their decision
// @access  Private (Approver assigned to this circular)
router.patch('/higher-review/:id', authMiddleware, async (req, res) => {
    const { decision, feedback } = req.body; // 'Approved', 'Rejected', 'Request Meeting'
    const approverUserId = req.user.id;
    const userRole = req.user.role;

    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });
        if (circular.status !== 'Pending Higher Approval') {
            return res.status(400).json({ message: 'Circular is not pending higher approval.' });
        }

        // Find the specific approver entry for the current user
        const approverEntry = circular.approvers.find(appr => appr.user.toString() === approverUserId);

        // Only assigned approvers can review
        if (!approverEntry) {
             return res.status(403).json({ message: 'You are not assigned to approve this circular.' });
        }
        if (approverEntry.decision !== 'Pending') {
            return res.status(400).json({ message: 'You have already submitted your decision for this circular.' });
        }
        if (!['Approved', 'Rejected', 'Request Meeting'].includes(decision)) {
             return res.status(400).json({ message: 'Invalid decision submitted.' });
        }


        // Update the decision and feedback
        approverEntry.decision = decision;
        approverEntry.feedback = feedback || '';

        // Check if all approvers have made a decision
        const allDecided = circular.approvers.every(appr => appr.decision !== 'Pending');

        if (allDecided) {
            const rejected = circular.approvers.some(appr => appr.decision === 'Rejected');
            const meetingRequested = circular.approvers.some(appr => appr.decision === 'Request Meeting');

            if (rejected) {
                circular.status = 'Rejected';
                circular.rejectionReason = circular.approvers.find(appr => appr.decision === 'Rejected')?.feedback || 'Rejected by higher authority.';
            } else if (meetingRequested) {
                 circular.status = 'Pending Higher Approval'; // Keep status, maybe add flag later
                 console.log(`Meeting requested for circular ${circular._id}`);
            } else {
                circular.status = 'Approved'; // All approved
            }
        }
        // If not all decided, status remains 'Pending Higher Approval'

        const updatedCircular = await circular.save();
        // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email');
        res.json(populatedCircular);

    } catch (err) {
        console.error("Error during higher review:", err.message);
        res.status(500).json({ message: 'Server Error during higher review' });
    }
});


// @route   DELETE api/circulars/:id
// @desc    Delete a circular (Maybe only if Draft/Rejected? Or only by Super Admin?)
// @access  Private (Super Admin for now, or Author if Draft/Rejected)
router.delete('/:id', [authMiddleware, isSuperAdmin], async (req, res) => { // Restricted to Super Admin for simplicity now
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) {
            return res.status(404).json({ message: 'Circular not found' });
        }

        // Add more checks if needed, e.g., prevent deletion of Approved/Published?
        // if (circular.author.toString() !== req.user.id && req.user.role !== 'Super Admin') {
        //    return res.status(403).json({ message: 'User not authorized' });
        // }
        // if (circular.status !== 'Draft' && circular.status !== 'Rejected' && req.user.role !== 'Super Admin') {
        //     return res.status(400).json({ message: 'Cannot delete circular once submitted, unless you are Super Admin.' });
        // }


        await Circular.findByIdAndDelete(req.params.id);
        res.json({ message: 'Circular deleted successfully' });
    } catch (err) {
        console.error("Error deleting circular:", err.message);
        res.status(500).json({ message: 'Server Error deleting circular' });
    }
});


module.exports = router; // Ensure this is at the very end

