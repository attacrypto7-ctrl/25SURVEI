const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Survey = require('../models/Survey');
const Vote = require('../models/Vote');
const adminAuth = require('../middleware/adminAuth');

// Get all active surveys (public - for students)
router.get('/active', async (req, res) => {
    try {
        const surveys = await Survey.find({ is_active: true })
            .select('survey_id title description type max_options')
            .sort({ created_at: -1 });
        return res.json(surveys);
    } catch (err) {
        console.error('Get active surveys error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Get all surveys (admin) - with counts
router.get('/all', adminAuth, async (req, res) => {
    try {
        const surveys = await Survey.find().sort({ created_at: -1 }).lean();

        // Populate counts manually or via aggregation
        // Since we need total voters (unique users) per survey
        // and total options (which is length of options array)

        const enhancedSurveys = await Promise.all(surveys.map(async (s) => {
            const voterCount = await Vote.distinct('user_id', { survey_id: s.survey_id }).then(ids => ids.length);
            return {
                ...s,
                total_voters: voterCount,
                total_options: s.options ? s.options.length : 0
            };
        }));

        return res.json(enhancedSurveys);
    } catch (err) {
        console.error('Get all surveys error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Get single survey with options (public)
router.get('/:id', async (req, res) => {
    try {
        const survey = await Survey.findOne({ survey_id: req.params.id });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }
        // sort options
        survey.options.sort((a, b) => a.sort_order - b.sort_order);
        return res.json(survey);
    } catch (err) {
        console.error('Get survey error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Create survey (admin)
router.post('/', adminAuth, async (req, res) => {
    const { title, description, type, max_options, options } = req.body;

    if (!title || !type) {
        return res.status(400).json({ error: 'Judul dan tipe survei harus diisi.' });
    }

    try {
        const newSurvey = new Survey({
            title,
            description,
            type,
            max_options: max_options || 1,
            is_active: false,
            options: options ? options.map((opt, startParams) => ({
                option_id: uuidv4(),
                label: opt.label,
                description: opt.description,
                youtube_link: opt.youtube_link,
                image_url: opt.image_url,
                sort_order: startParams // using index from map
            })) : []
        });

        await newSurvey.save();
        return res.json({ success: true, survey_id: newSurvey.survey_id, message: 'Survei berhasil dibuat.' });
    } catch (err) {
        console.error('Create survey error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Update survey (admin)
router.put('/:id', adminAuth, async (req, res) => {
    const { title, description, type, max_options, options } = req.body;

    try {
        const survey = await Survey.findOne({ survey_id: req.params.id });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }

        survey.title = title || survey.title;
        if (description !== undefined) survey.description = description;
        survey.type = type || survey.type;
        survey.max_options = max_options || survey.max_options;
        survey.updated_at = Date.now();

        if (options && Array.isArray(options)) {
            // Replace options
            survey.options = options.map((opt, index) => ({
                option_id: opt.option_id || uuidv4(),
                label: opt.label,
                description: opt.description,
                youtube_link: opt.youtube_link,
                image_url: opt.image_url,
                sort_order: index
            }));
        }

        await survey.save();
        return res.json({ success: true, message: 'Survei berhasil diupdate.' });
    } catch (err) {
        console.error('Update survey error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Toggle survey active status (admin)
router.patch('/:id/toggle', adminAuth, async (req, res) => {
    try {
        const survey = await Survey.findOne({ survey_id: req.params.id });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }

        survey.is_active = !survey.is_active;
        survey.updated_at = Date.now();
        await survey.save();

        return res.json({
            success: true,
            is_active: survey.is_active,
            message: survey.is_active ? 'Survei dipublish.' : 'Survei diarsipkan.'
        });
    } catch (err) {
        console.error('Toggle survey error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Delete survey (admin)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const survey = await Survey.findOne({ survey_id: req.params.id });
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }

        // Delete results associated with survey
        await Vote.deleteMany({ survey_id: req.params.id });

        // Delete survey
        await Survey.deleteOne({ survey_id: req.params.id });

        return res.json({ success: true, message: 'Survei berhasil dihapus.' });
    } catch (err) {
        console.error('Delete survey error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
