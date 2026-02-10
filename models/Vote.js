const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    user_id: { type: String, required: true }, // Using session ID or student ID string
    survey_id: { type: String, required: true, ref: 'Survey' },
    selected_option_id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
    // User metadata (optional, for tracking)
    // ip_address: String,
    // user_agent: String
});

// Compound index to ensure uniqueness if needed per survey per user (though logic handles this)
VoteSchema.index({ user_id: 1, survey_id: 1, selected_option_id: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
