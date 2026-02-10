const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // For students: no_id. For admin: username.
    password: { type: String }, // Required for admin only
    nama: String, // For students
    kelas: String, // For students
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
