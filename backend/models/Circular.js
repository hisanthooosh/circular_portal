const mongoose = require('mongoose');
const { Schema } = mongoose;

const CircularSchema = new mongoose.Schema({
    // --- OLD Fields Removed ---
    // title: String,
    // issuedBy: String,

    // --- NEW Core Fields ---
    type: { // Replaces 'title'
        type: String,
        required: true,
        enum: ['Circular', 'Order', 'Memo'],
        default: 'Circular',
    },
    subject: { // New field for description
        type: String,
        required: true,
    },
    body: { type: String, required: true },
    circularNumber: { type: String, required: true },
    date: { type: Date, required: true },

    // --- NEW Signatories Field ---
    signatories: [{
        authority: {
            type: Schema.Types.ObjectId,
            ref: 'SignatoryAuthority', // Link to the new model
            required: true
        },
        order: { // To control the display order
            type: Number,
            required: true,
            default: 1,
        },
        // Position is stored in the SignatoryAuthority model, but we might copy it here for historical record? For now, just link.
    }],

    // --- Workflow Fields (remain the same) ---
    status: { type: String, required: true, enum: ['Draft', 'Pending Admin', 'Pending Super Admin', 'Pending Higher Approval', 'Approved', 'Rejected', 'Published'], default: 'Draft' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedTo: { // Tracks the Admin or Super Admin currently responsible
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false // Only required when status is Pending Admin or Pending SA
    },
    rejectionReason: { type: String },
    approvers: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, decision: { type: String, enum: ['Approved', 'Rejected', 'Request Meeting', 'Pending'], default: 'Pending' }, feedback: String }],
    viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    publishedAt: { type: Date },

    // --- Other fields (can keep or remove as needed) ---
    agendaPoints: [String], // Still relevant? Keep for now.
    copyTo: [String], // Still relevant? Keep for now.

}, { timestamps: true });

// Ensure correct display order for signatories if needed later
CircularSchema.pre('save', function (next) {
    if (this.signatories && this.signatories.length > 0) {
        this.signatories.sort((a, b) => a.order - b.order);
    }
    next();
});


module.exports = mongoose.model('Circular', CircularSchema);