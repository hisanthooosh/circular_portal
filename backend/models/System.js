const mongoose = require('mongoose');

const SystemSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    departmentName: {
        type: String,
        required: true,
        trim: true
    },
    // A reference to the user who added this system
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

const System = mongoose.model('System', SystemSchema);

module.exports = System;
