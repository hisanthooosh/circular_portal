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

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
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

// --- NEW ROUTE for Updating Circulars ---
// @route   PATCH api/circulars/:id
// @desc    Update an existing circular (Draft or Rejected only)
// @access  Private (Author or Super Admin)
router.patch('/:id', authMiddleware, async (req, res) => {
    // Destructure the fields that can be updated from the request body
    const {
        type,
        subject,
        body,
        circularNumber,
        date,
        signatories,
        agendaPoints,
        copyTo
    } = req.body;
    const circularId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        // Find the existing circular
        let circular = await Circular.findById(circularId);
        if (!circular) {
            return res.status(404).json({ message: 'Circular not found' });
        }

        // --- Permission Check ---
        const isAuthor = circular.author.toString() === userId;
        const canEditStatus = circular.status === 'Draft' || circular.status === 'Rejected';

        // Allow update only if:
        // 1. User is Super Admin OR
        // 2. User is the Author AND status is Draft/Rejected
        if (userRole !== 'Super Admin' && !(isAuthor && canEditStatus)) {
            return res.status(403).json({ message: `Permission denied. Cannot edit circular with status '${circular.status}'.` });
        }

        // --- Validation (Similar to Create) ---
        if (!type || !subject || !body || !circularNumber || !date || !signatories || signatories.length === 0) {
            return res.status(400).json({ message: 'Missing required circular fields.' });
        }
        if (!signatories.every(s => s.authority && typeof s.order === 'number')) {
            return res.status(400).json({ message: 'Each signatory must have an authority ID and a valid order number.' });
        }

        // --- Update the Fields ---
        circular.type = type;
        circular.subject = subject;
        circular.body = body;
        circular.circularNumber = circularNumber;
        circular.date = date;
        circular.signatories = signatories;
        circular.agendaPoints = agendaPoints || [];
        circular.copyTo = copyTo || [];
        // When editing, reset status to Draft? Or keep Rejected if it was Rejected?
        // Let's keep it simple: if edited, it becomes a Draft again.
        circular.status = 'Draft';
        circular.rejectionReason = undefined; // Clear rejection reason upon edit
        circular.submittedTo = undefined; // Clear who it was submitted to
        circular.approvers = []; // Clear higher approvers

        const updatedCircular = await circular.save();

        // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position');

        res.json(populatedCircular); // Send back the updated circular

    } catch (err) {
        console.error("Error updating circular:", err.message, err.stack);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Server Error updating circular' });
    }
});
// --- END NEW UPDATE ROUTE ---

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
            query = { 'approvers.user': userId }; // Fetch ALL circulars assigned to this approver
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

        // Check authorization (Author or SA can submit?) - Keep author only for now
        if (circular.author.toString() !== req.user.id) { // Only author can submit their own draft
            return res.status(403).json({ message: 'User not authorized' });
        }
        if (circular.status !== 'Draft' && circular.status !== 'Rejected') {
            return res.status(400).json({ message: 'Only Draft or Rejected circulars can be submitted' });
        }

        // --- NEW: Find the manager ---
        const authorDetails = await User.findById(req.user.id).select('managedBy');
        if (!authorDetails || !authorDetails.managedBy) {
            // If CC has no manager (maybe managed by SA?), submit directly to SA
            const superAdmin = await User.findOne({ role: 'Super Admin' });
            if (!superAdmin) {
                return res.status(500).json({ message: 'System Error: Cannot find manager or Super Admin to submit to.' });
            }
            circular.status = 'Pending Super Admin';
            circular.submittedTo = superAdmin._id;
            console.log(`Circular ${circular._id} submitted directly to Super Admin ${superAdmin._id} as author has no manager.`);

        } else {
            // Submit to the author's manager (Admin)
            circular.status = 'Pending Admin';
            circular.submittedTo = authorDetails.managedBy;
            console.log(`Circular ${circular._id} submitted to Admin ${authorDetails.managedBy}`);
        }
        // --- END NEW ---

        circular.rejectionReason = undefined; // Clear rejection reason on resubmission
        const updatedCircular = await circular.save();
        // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('submittedTo', 'name email'); // Also populate submittedTo
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error submitting circular:", err.message);
        res.status(500).json({ message: 'Server Error submitting circular' });
    }
});
// --- NEW ROUTE for Admin Review ---
// @route   PATCH api/circulars/admin-review/:id
// @desc    Admin reviews a circular (Forward to Super Admin or Reject)
// @access  Private (Admin)
router.patch('/admin-review/:id', [authMiddleware, isAdmin], async (req, res) => {
    const { decision, rejectionReason } = req.body; // 'Forward' or 'Reject'
    const adminUserId = req.user.id;

    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        // Validation: Correct status and assigned Admin
        if (circular.status !== 'Pending Admin') {
            return res.status(400).json({ message: 'Circular is not pending review by Admin.' });
        }
        // Ensure submittedTo exists before calling toString()
        if (!circular.submittedTo || circular.submittedTo.toString() !== adminUserId) {
            return res.status(403).json({ message: 'You are not assigned to review this circular.' });
        }

        circular.rejectionReason = undefined; // Clear previous reason

        if (decision === 'Reject') {
            circular.status = 'Rejected';
            circular.rejectionReason = rejectionReason || 'No reason provided by Admin.';
            circular.submittedTo = undefined; // No longer submitted to anyone
            circular.approvers = []; // Clear any higher approvers if rejected now

        } else if (decision === 'Forward') {
            // Find the Super Admin (Assuming only one for now)
            // It's better practice to fetch the Super Admin dynamically
            const superAdmin = await User.findOne({ role: 'Super Admin' }).select('_id'); // Only select the ID
            if (!superAdmin) {
                // Log the error for server admins
                console.error("CRITICAL: Super Admin account not found during Admin review.");
                return res.status(500).json({ message: 'System configuration error: Cannot find Super Admin.' });
            }

            circular.status = 'Pending Super Admin';
            circular.submittedTo = superAdmin._id; // Assign to the Super Admin's ID

        } else {
            return res.status(400).json({ message: 'Invalid decision provided. Must be "Forward" or "Reject".' });
        }

        const updatedCircular = await circular.save();

        // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('submittedTo', 'name email'); // Populate the new submittedTo user

        res.json(populatedCircular);

    } catch (err) {
        console.error("Error during Admin review:", err.message, err.stack); // Log stack too
        res.status(500).json({ message: 'Server Error during Admin review' });
    }
});
// --- END NEW ROUTE ---

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
                if (approverUsers.length !== higherApproverIds.length) {
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
// @desc    Delete a circular
// @access  Private (Super Admin, or Author if Draft/Rejected)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) {
            return res.status(404).json({ message: 'Circular not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const canDeleteStatus = circular.status === 'Draft' || circular.status === 'Rejected';

        // --- UPDATED LOGIC ---
        let isAuthor = false;
        // Safely check if author exists before comparing
        if (circular.author) {
            isAuthor = circular.author.toString() === userId;
        }

        // Check permissions:
        // 1. Super Admin can always delete.
        if (userRole === 'Super Admin') {
            await Circular.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Circular deleted successfully (by Admin)' });
        }
        // 2. Author can delete ONLY if status is Draft or Rejected.
        else if (isAuthor && canDeleteStatus) {
            await Circular.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Circular deleted successfully (by Author)' });
        }
        // 3. Otherwise, deny permission
        else {
            if (!isAuthor) {
                return res.status(403).json({ message: 'User not authorized to delete this circular.' });
            } else { // Must be the author, but status is wrong
                return res.status(403).json({ message: `Cannot delete circular with status '${circular.status}'. Only Draft or Rejected can be deleted by the author.` });
            }
        }
        // --- END UPDATED LOGIC ---

    } catch (err) {
        console.error("Error deleting circular:", err.message, err.stack); // Added stack trace for better debugging
        res.status(500).json({ message: 'Server Error deleting circular' });
    }
});

// --- NEW ROUTE for Super Admin All Circulars View ---
// @route   GET api/circulars/all
// @desc    Get ALL circulars with detailed population for SA overview
// @access  Private (Super Admin ONLY)
router.get('/all', [authMiddleware, isSuperAdmin], async (req, res) => { // Uses isSuperAdmin middleware
    console.log("--- GET /api/circulars/all (SA Overview) ---");
    try {
        // Find ALL circulars
        const allCirculars = await Circular.find({}) // Empty query {} fetches all
            .populate('author', 'name email') // Get author details
            .populate('submittedTo', 'name email') // Get details of Admin/SA it's pending with
            .populate('signatories.authority', 'name position') // Get signatory details
            .populate('approvers.user', 'name email') // Get higher approver details
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

        console.log(`Found ${allCirculars.length} total circulars for SA overview.`);

        res.json(allCirculars);
    } catch (err) {
        console.error("Error fetching all circulars:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching all circulars' });
    }
    console.log("--- END GET /api/circulars/all (SA Overview) ---");
});
// --- END NEW ROUTE ---


module.exports = router; // Ensure this is at the very end

