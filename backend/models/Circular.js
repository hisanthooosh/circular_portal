const mongoose = require('mongoose');
const { Schema } = mongoose;

const CircularSchema = new mongoose.Schema({
    // --- Basic Info (from before) ---
    circularNumber: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    body: { type: String, required: true },
    agendaPoints: [String],
    issuedBy: { type: String, required: true },
    copyTo: [String],
    
    // --- NEW Workflow and Approval Fields ---
    status: {
        type: String,
        required: true,
        enum: [
            'Draft',              // Created but not submitted yet
            'Pending Super Admin',// Submitted by Creator, waiting for Super Admin
            'Pending Higher Approval',// Submitted by Super Admin, waiting for Approver
            'Approved',           // Fully approved, ready to be sent
            'Rejected',           // Rejected by Super Admin or Approver
            'Published'           // Sent to the final viewers
        ],
        default: 'Draft',
    },
    author: {
        type: Schema.Types.ObjectId, // A link to the user who created it
        ref: 'User',                 // This refers to our 'User' model
        required: true,
    },
    rejectionReason: {
        type: String, // A message from the Super Admin if they reject it
    },
    // --- Fields for Higher Approval ---
    approvers: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        decision: { type: String, enum: ['Approved', 'Rejected', 'Request Meeting', 'Pending'], default: 'Pending' },
        feedback: String,
    }],
    // --- Fields for Final Distribution ---
    viewers: [{
        type: Schema.Types.ObjectId, ref: 'User'
    }],
    publishedAt: {
        type: Date, // The date it was sent to viewers
    }
}, { timestamps: true });

module.exports = mongoose.model('Circular', CircularSchema);

