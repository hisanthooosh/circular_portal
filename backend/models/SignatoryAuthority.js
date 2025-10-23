const mongoose = require('mongoose');

const SignatoryAuthoritySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true, // Removes whitespace from ends
    },
    position: {
        type: String,
        required: true,
        trim: true,
    },
    // We can add more details later if needed, like department
}, { timestamps: true });

module.exports = mongoose.model('SignatoryAuthority', SignatoryAuthoritySchema);
