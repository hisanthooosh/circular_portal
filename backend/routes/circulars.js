

const express = require('express');
const router = express.Router(); // Ensure this line is present at the top
const Circular = require('../models/Circular');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// --- Middleware for Role Checking ---

// UPDATED: Added 'Admin' role
const isCreatorOrAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Super Admin' && req.user.role !== 'Circular Creator' && req.user.role !== 'Admin')) {
        return res.status(403).json({ message: 'Access denied. Creator, Admin, or Super Admin role required.' });
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
// @access  Private (Creator, Admin, or Super Admin)
router.post('/', [authMiddleware, isCreatorOrAdmin], async (req, res) => { // Uses corrected middleware
    const { type, subject, body, circularNumber, date, signatories, agendaPoints, copyTo } = req.body;
    try {
        if (!type || !subject || !body || !circularNumber || !date || !signatories || signatories.length === 0) {
            return res.status(400).json({ message: 'Missing required circular fields.' });
        }
        if (!signatories.every(s => s.authority && typeof s.order === 'number')) {
            return res.status(400).json({ message: 'Each signatory must have an authority ID and a valid order number.' });
        }

        const newCircular = new Circular({
            type, subject, body, circularNumber, date, signatories,
            agendaPoints: agendaPoints || [],
            copyTo: copyTo || [],
            author: req.user.id,
            status: 'Draft', // Always start as Draft
        });

        const savedCircular = await newCircular.save();
        const populatedCircular = await Circular.findById(savedCircular._id)
            .populate('signatories.authority', 'name position')
            .populate('author', 'name email');
        res.status(201).json(populatedCircular);
    } catch (err) {
        console.error("Error creating circular:", err.message);
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server Error creating circular' });
    }
});

// @route   PATCH api/circulars/:id
// @desc    Update an existing circular (Draft or Rejected only)
// @access  Private (Author or Super Admin)
router.patch('/:id', authMiddleware, async (req, res) => {
    const { type, subject, body, circularNumber, date, signatories, agendaPoints, copyTo } = req.body;
    const circularId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        let circular = await Circular.findById(circularId);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        const isAuthor = circular.author.toString() === userId;
        const canEditStatus = circular.status === 'Draft' || circular.status === 'Rejected';

        if (userRole !== 'Super Admin' && !(isAuthor && canEditStatus)) {
            return res.status(403).json({ message: `Permission denied. Cannot edit circular with status '${circular.status}'.` });
        }

        if (!type || !subject || !body || !circularNumber || !date || !signatories || signatories.length === 0) {
            return res.status(400).json({ message: 'Missing required circular fields.' });
        }
        if (!signatories.every(s => s.authority && typeof s.order === 'number')) {
            return res.status(400).json({ message: 'Each signatory must have an authority ID and a valid order number.' });
        }

        circular.type = type;
        circular.subject = subject;
        circular.body = body;
        circular.circularNumber = circularNumber;
        circular.date = date;
        circular.signatories = signatories;
        circular.agendaPoints = agendaPoints || [];
        circular.copyTo = copyTo || [];
        circular.status = 'Draft'; // Reset status to Draft after edit
        circular.rejectionReason = undefined;
        circular.submittedTo = undefined;
        circular.approvers = [];

        const updatedCircular = await circular.save();
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error updating circular:", err.message, err.stack);
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server Error updating circular' });
    }
});

// @route   GET api/circulars
// @desc    Get circulars based on user role and management hierarchy
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    console.log("--- GET /api/circulars (Role-Based View) ---");
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        let query = {};
        let sort = { createdAt: -1 };

        console.log(`Fetching circulars for User ID: ${userId}, Role: ${userRole}`);

        if (userRole === 'Circular Creator') {
            query = { author: userId };
            console.log("Applying CC filter:", JSON.stringify(query));
        } else if (userRole === 'Admin') {
            // Replaced .distinct() with .find() and .map() to avoid API version error
            const managedUsers = await User.find({ managedBy: userId }).select('_id');
            const managedUserIds = managedUsers.map(user => user._id);
            query = {
                $or: [
                    { status: 'Pending Admin', submittedTo: userId },
                    { author: userId },
                    { author: { $in: managedUserIds } }
                ]
            };
            console.log("Applying Admin filter:", JSON.stringify(query));
        } else if (userRole === 'Super Admin') {
            query = {}; // SA sees all on main dashboard
            console.log("Applying Super Admin filter (no filter - get all)");
        } else if (userRole === 'Circular Approver') {
            query = { status: 'Pending Higher Approval', 'approvers.user': userId };
            console.log("Applying CA filter:", JSON.stringify(query));
        } else if (userRole === 'Circular Viewer') {
            query = { status: 'Published' };
            sort = { publishedAt: -1 };
            console.log("Applying CV filter:", JSON.stringify(query));
        } else {
            console.warn(`Unexpected role accessing GET /circulars: ${userRole}`);
            return res.json([]);
        }

        const circulars = await Circular.find(query)
            .populate('author', 'name email')
            .populate('submittedTo', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email')
            .sort(sort);

        console.log(`Found ${circulars ? circulars.length : 'null'} circulars matching query for role ${userRole}.`);
        res.json(circulars);

    } catch (err) {
        console.error("Error fetching circulars:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching circulars' });
    }
    console.log("--- END GET /api/circulars ---");
});

// @route   PATCH api/circulars/submit/:id
// @desc    Submit a draft circular for approval
// @access  Private (Author)
router.patch('/submit/:id', authMiddleware, async (req, res) => {
    console.log(`--- PATCH /submit/${req.params.id} ---`); // Log route entry
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        // 1. Check permissions
        if (circular.author.toString() !== req.user.id && req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'User not authorized' });
        }
        if (circular.status !== 'Draft' && circular.status !== 'Rejected') {
            return res.status(400).json({ message: 'Only Draft or Rejected circulars can be submitted' });
        }

        // 2. Get author's details, including their manager's role
        const author = await User.findById(circular.author).populate('managedBy');
        if (!author) return res.status(404).json({ message: 'Author user not found' });

        // Find the Super Admin's ID (we always need this)
        const superAdmin = await User.findOne({ role: 'Super Admin' }).select('_id');
        if (!superAdmin) {
            console.error("CRITICAL: No Super Admin found during submit.");
            return res.status(500).json({ message: 'System Error: Cannot find Super Admin.' });
        }

        // 3. Apply routing logic based on author's role
        if (author.role === 'Circular Creator') {
            const manager = author.managedBy; // This is the populated manager object
            if (manager) {
                if (manager.role === 'Admin') {
                    // Submit to Admin
                    circular.status = 'Pending Admin';
                    circular.submittedTo = manager._id; // Assign to the Admin
                    console.log(`Submit: CC ${author._id} submitting to Admin ${manager._id}`);
                } else if (manager.role === 'Super Admin') {
                    // Submit to Super Admin (if SA is manager)
                    circular.status = 'Pending Super Admin';
                    circular.submittedTo = manager._id; // Assign to the SA
                    console.log(`Submit: CC ${author._id} submitting to Manager (SA) ${manager._id}`);
                } else {
                    // Manager has weird role? Default to SA.
                    console.warn(`Submit: CC ${author._id} has manager with invalid role (${manager.role}). Submitting to SA.`);
                    circular.status = 'Pending Super Admin';
                    circular.submittedTo = superAdmin._id;
                }
            } else {
                // CC has no manager (legacy or direct SA creation)
                console.log(`Submit: CC ${author._id} has no manager. Submitting to SA ${superAdmin._id}.`);
                circular.status = 'Pending Super Admin';
                circular.submittedTo = superAdmin._id; // Assign to SA
            }
        } else if (author.role === 'Admin' || author.role === 'Super Admin') {
            // Admins and Super Admins submit their own circulars directly to the Super Admin
            console.log(`Submit: ${author.role} ${author._id} submitting their own circular. Submitting to SA ${superAdmin._id}.`);
            circular.status = 'Pending Super Admin';
            circular.submittedTo = superAdmin._id; // Assign to SA
        } else {
            // Should not happen
            console.error(`Submit: User with role ${author.role} attempted to submit.`);
            return res.status(403).json({ message: 'Your role does not have permission to submit circulars.' });
        }
        // --- END NEW LOGIC ---

        circular.rejectionReason = undefined; // Clear rejection reason

        const updatedCircular = await circular.save(); // Save the changes

        console.log(`Submit: Saved circular ${updatedCircular._id} with status '${updatedCircular.status}' and submittedTo '${updatedCircular.submittedTo}'`);

        // Populate details before sending back
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('submittedTo', 'name email');

        res.json(populatedCircular);
    } catch (err) {
        console.error("Error submitting circular:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error submitting circular' });
    }
});
// @route   PATCH api/circulars/admin-review/:id
// @desc    Admin reviews a circular (Forward to Super Admin or Reject)
// @access  Private (Admin)
router.patch('/admin-review/:id', [authMiddleware, isAdmin], async (req, res) => {
    const { decision, rejectionReason } = req.body;
    const adminUserId = req.user.id;
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });
        if (circular.status !== 'Pending Admin') {
            return res.status(400).json({ message: 'Circular is not pending review by Admin.' });
        }
        if (!circular.submittedTo || circular.submittedTo.toString() !== adminUserId) {
            return res.status(403).json({ message: 'You are not assigned to review this circular.' });
        }

        circular.rejectionReason = undefined;

        if (decision === 'Reject') {
            circular.status = 'Rejected';
            circular.rejectionReason = rejectionReason || 'No reason provided by Admin.';
            circular.submittedTo = undefined;
            circular.approvers = [];
        } else if (decision === 'Forward') {
            const superAdmin = await User.findOne({ role: 'Super Admin' }).select('_id');
            if (!superAdmin) {
                console.error("CRITICAL: Super Admin account not found during Admin review.");
                return res.status(500).json({ message: 'System configuration error: Cannot find Super Admin.' });
            }
            circular.status = 'Pending Super Admin';
            circular.submittedTo = superAdmin._id;
        } else {
            return res.status(400).json({ message: 'Invalid decision provided. Must be "Forward" or "Reject".' });
        }

        const updatedCircular = await circular.save();
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('submittedTo', 'name email');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error during Admin review:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error during Admin review' });
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
            return res.status(400).json({ message: 'Circular is not pending review by Super Admin.' });
        }

        circular.rejectionReason = undefined;

        if (decision === 'Reject') {
            circular.status = 'Rejected';
            circular.rejectionReason = rejectionReason || 'No reason provided by Super Admin.';
            circular.approvers = [];
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
                circular.approvers = [];
            }
        } else {
            return res.status(400).json({ message: 'Invalid decision provided.' });
        }

        const updatedCircular = await circular.save();
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
// @access  Private (Approver assigned)
router.patch('/higher-review/:id', authMiddleware, async (req, res) => {
    const { decision, feedback } = req.body;
    const approverUserId = req.user.id;
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });
        if (circular.status !== 'Pending Higher Approval') {
            return res.status(400).json({ message: 'Circular is not pending higher approval.' });
        }

        const approverEntry = circular.approvers.find(appr => appr.user.toString() === approverUserId);

        if (!approverEntry) {
            return res.status(403).json({ message: 'You are not assigned to approve this circular.' });
        }
        if (approverEntry.decision !== 'Pending') {
            return res.status(400).json({ message: 'You have already submitted your decision.' });
        }
        if (!['Approved', 'Rejected'].includes(decision)) { // Removed 'Request Meeting'
            return res.status(400).json({ message: 'Invalid decision submitted.' });
        }

        approverEntry.decision = decision;
        approverEntry.feedback = feedback || '';

        const allDecided = circular.approvers.every(appr => appr.decision !== 'Pending');

        if (allDecided) {
            const rejected = circular.approvers.some(appr => appr.decision === 'Rejected');
            if (rejected) {
                circular.status = 'Rejected';
                circular.rejectionReason = circular.approvers.find(appr => appr.decision === 'Rejected')?.feedback || 'Rejected by higher authority.';
            } else {
                circular.status = 'Approved';
            }
        }

        const updatedCircular = await circular.save();
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error during higher review:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error during higher review' });
    }
});

// @route   PATCH api/circulars/publish/:id
// @desc    Publish an Approved circular
// @access  Private (Super Admin)
router.patch('/publish/:id', [authMiddleware, isSuperAdmin], async (req, res) => {
    const circularId = req.params.id;
    try {
        const circular = await Circular.findById(circularId);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });
        if (circular.status !== 'Approved') {
            return res.status(400).json({ message: `Cannot publish circular with status '${circular.status}'. Must be 'Approved'.` });
        }

        circular.status = 'Published';
        circular.publishedAt = new Date();
        const updatedCircular = await circular.save();
        const populatedCircular = await Circular.findById(updatedCircular._id)
            .populate('author', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email');
        res.json(populatedCircular);
    } catch (err) {
        console.error("Error publishing circular:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error publishing circular' });
    }
});

// @route   DELETE api/circulars/:id
// @desc    Delete a circular
// @access  Private (Super Admin, or Author if Draft/Rejected)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const circular = await Circular.findById(req.params.id);
        if (!circular) return res.status(404).json({ message: 'Circular not found' });

        const userRole = req.user.role;
        const userId = req.user.id;
        const canDeleteStatus = circular.status === 'Draft' || circular.status === 'Rejected';
        let isAuthor = false;
        if (circular.author) { isAuthor = circular.author.toString() === userId; }

        if (userRole === 'Super Admin' || (isAuthor && canDeleteStatus)) {
            await Circular.findByIdAndDelete(req.params.id);
            return res.json({ message: 'Circular deleted successfully' });
        } else {
            if (!isAuthor) return res.status(403).json({ message: 'User not authorized to delete this circular.' });
            else return res.status(403).json({ message: `Cannot delete circular with status '${circular.status}'.` });
        }
    } catch (err) {
        console.error("Error deleting circular:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error deleting circular' });
    }
});
// @route   GET api/circulars/all
// @desc    Get ALL circulars with detailed population for SA overview
// @access  Private (Super Admin ONLY)
router.get('/all', [authMiddleware, isSuperAdmin], async (req, res) => {
    console.log("--- GET /api/circulars/all (SA Overview) ---");
    try {
        const allCirculars = await Circular.find({})
            .populate('author', 'name email')
            .populate('submittedTo', 'name email')
            .populate('signatories.authority', 'name position')
            .populate('approvers.user', 'name email')
            .sort({ createdAt: -1 });

        console.log(`Found ${allCirculars.length} total users for SA overview.`);
        res.json(allCirculars);
    } catch (err) {
        console.error("Error fetching all circulars:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching all circulars' });
    }
    console.log("--- END GET /api/circulars/all (SA Overview) ---");
});

module.exports = router; // Ensure this is at the very end




