const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const Vote = require('../models/Vote');
const User = require('../models/User');

// Submit vote
router.post('/', async (req, res) => {
    const { selected_option_ids } = req.body;

    // Check student session
    if (!req.session.userId || !req.session.surveyId) {
        return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    }

    if (!selected_option_ids || !Array.isArray(selected_option_ids) || selected_option_ids.length === 0) {
        return res.status(400).json({ error: 'Pilih minimal satu opsi.' });
    }

    const userId = req.session.userId;
    const surveyId = req.session.surveyId;

    try {
        // Check survey is still active
        const survey = await Survey.findOne({ survey_id: surveyId, is_active: true });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan atau sudah ditutup.' });
        }

        // Validate max_options
        if (selected_option_ids.length > survey.max_options) {
            return res.status(400).json({
                error: `Maksimal ${survey.max_options} pilihan yang diperbolehkan.`
            });
        }

        // For single choice, only 1 allowed
        if (survey.type === 'single_choice' && selected_option_ids.length > 1) {
            return res.status(400).json({ error: 'Hanya boleh memilih satu opsi.' });
        }

        // Check double-entry
        const alreadyVoted = await Vote.findOne({ user_id: userId, survey_id: surveyId });
        if (alreadyVoted) {
            return res.status(409).json({ error: 'Anda sudah mengisi survei ini.' });
        }

        // Validate all option_ids belong to this survey
        const validOptionIds = survey.options.map(o => o.option_id);
        for (const optId of selected_option_ids) {
            if (!validOptionIds.includes(optId)) {
                return res.status(400).json({ error: 'Opsi tidak valid.' });
            }
        }

        // Create votes
        // Since we designed Vote model to have one entry per selection?
        // Wait, my Vote model: `selected_option_id: { type: String, required: true }`.
        // If multiple choice, we need multiple Vote documents?
        // "Compound index to ensure uniqueness if needed per survey per user" 
        // If I create multiple documents (one per option), I might trigger unique index violation if I index { user_id: 1, survey_id: 1 }.
        // Let's check my Vote model again.
        // `VoteSchema.index({ user_id: 1, survey_id: 1, selected_option_id: 1 }, { unique: true });`
        // This allows multiple votes for same survey/user IF option is different.
        // BUT `alreadyVoted` check above: `await Vote.findOne({ user_id: userId, survey_id: surveyId });`
        // This will find ANY vote for that survey.
        // So if I save multiple documents sequentially, the second one might fail the CHECK if I don't handle it carefully?
        // No, the check `alreadyVoted` is done BEFORE saving.
        // So I can save all of them.

        const voteDocs = selected_option_ids.map(optId => ({
            user_id: userId,
            survey_id: surveyId,
            selected_option_id: optId,
            timestamp: new Date()
        }));

        await Vote.insertMany(voteDocs);

        // Clear student session after voting
        req.session.destroy(() => { });

        return res.json({ success: true, message: 'Vote berhasil disimpan. Terima kasih!' });
    } catch (err) {
        console.error('Vote error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
