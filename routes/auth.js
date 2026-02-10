const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Survey = require('../models/Survey');
const Vote = require('../models/Vote');

// Student login / register for voting
router.post('/student-login', async (req, res) => {
    const { nama, no_id, kelas, survey_id } = req.body;

    if (!nama || !no_id || !kelas || !survey_id) {
        return res.status(400).json({ error: 'Semua field harus diisi.' });
    }

    if (!['X', 'XI', 'XII'].includes(kelas)) {
        return res.status(400).json({ error: 'Kelas tidak valid.' });
    }

    try {
        // Check if survey is active
        const survey = await Survey.findOne({ survey_id: survey_id, is_active: true });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan atau sudah ditutup.' });
        }

        // Check if user (student) exists
        // We use no_id as the unique identifier for students (mapped to username)
        let user = await User.findOne({ username: no_id, role: 'student' });

        if (user) {
            // Check double-entry
            const alreadyVoted = await Vote.findOne({ user_id: user._id, survey_id: survey_id });
            if (alreadyVoted) {
                return res.status(409).json({ error: 'Anda sudah mengisi survei ini. Satu ID hanya dapat mengisi satu kali.' });
            }
        } else {
            // Create new student user
            user = await User.create({
                username: no_id,
                nama: nama,
                kelas: kelas,
                role: 'student'
                // password is not set for students
            });
        }

        // Set session
        // Note: For MongoDB session store (if we used it), this would be persisted in DB.
        // With default MemoryStore, it's just in memory.
        req.session.userId = user._id;
        req.session.userName = user.nama;
        req.session.userNoId = user.username;
        req.session.userKelas = user.kelas;
        req.session.surveyId = survey_id;

        // Explicitly save session before responding
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Terjadi kesalahan server.' });
            }
            return res.json({ success: true, message: 'Login berhasil.', userId: user._id, surveyId: survey_id });
        });
    } catch (err) {
        console.error('Student login error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Admin login
router.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password harus diisi.' });
    }

    try {
        const admin = await User.findOne({ username: username, role: 'admin' });

        if (!admin || !bcrypt.compareSync(password, admin.password)) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        req.session.adminId = admin._id;
        req.session.adminUsername = admin.username;

        return res.json({ success: true, message: 'Admin login berhasil.' });
    } catch (err) {
        console.error('Admin login error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Gagal logout.' });
        }
        return res.json({ success: true, message: 'Logout berhasil.' });
    });
});

// Check session
router.get('/session', (req, res) => {
    if (req.session.adminId) {
        return res.json({ role: 'admin', username: req.session.adminUsername });
    }
    if (req.session.userId) {
        return res.json({
            role: 'student',
            userId: req.session.userId,
            nama: req.session.userName,
            surveyId: req.session.surveyId
        });
    }
    return res.json({ role: null });
});

module.exports = router;
