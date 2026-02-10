const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Survey = require('../models/Survey');
const Vote = require('../models/Vote');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

// Get results for a survey (admin)
router.get('/:surveyId', adminAuth, async (req, res) => {
    try {
        const survey = await Survey.findOne({ survey_id: req.params.surveyId }).lean();
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }

        // Get all votes for this survey
        const votes = await Vote.find({ survey_id: req.params.surveyId }).lean();

        // Get unique user IDs from votes
        const userIds = [...new Set(votes.map(v => v.user_id))];

        // Get users info
        const users = await User.find({ _id: { $in: userIds } }).lean();
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = u;
        });

        // Map results
        const results = votes.map(v => {
            const user = userMap[v.user_id] || {};
            const option = survey.options.find(o => o.option_id === v.selected_option_id) || {};
            return {
                nama: user.nama || 'Unknown',
                no_id: user.username || 'Unknown', // mapped from no_id
                kelas: user.kelas || '-',
                pilihan: option.label || 'Unknown',
                timestamp: v.timestamp
            };
        });

        // Sort by timestamp desc
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Chart Data
        const voteCounts = {};
        votes.forEach(v => {
            voteCounts[v.selected_option_id] = (voteCounts[v.selected_option_id] || 0) + 1;
        });

        const chartData = survey.options.map(opt => ({
            label: opt.label,
            option_id: opt.option_id,
            vote_count: voteCounts[opt.option_id] || 0
        }));

        const totalVoters = userIds.length;

        return res.json({
            survey,
            results,
            chartData,
            totalVoters
        });

    } catch (err) {
        console.error('Get results error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Export results (admin)
router.get('/:surveyId/export', adminAuth, async (req, res) => {
    const format = req.query.format || 'xlsx';

    try {
        const survey = await Survey.findOne({ survey_id: req.params.surveyId }).lean();
        if (!survey) {
            return res.status(404).json({ error: 'Survei tidak ditemukan.' });
        }

        const votes = await Vote.find({ survey_id: req.params.surveyId }).sort({ timestamp: 1 }).lean();

        const userIds = [...new Set(votes.map(v => v.user_id))];
        const users = await User.find({ _id: { $in: userIds } }).lean();
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = u;
        });

        const data = votes.map((v, index) => {
            const user = userMap[v.user_id] || {};
            const option = survey.options.find(o => o.option_id === v.selected_option_id) || {};
            return {
                'No': index + 1,
                'Nama': user.nama || '',
                'No ID': user.username || '',
                'Kelas': user.kelas || '',
                'Pilihan': option.label || '',
                'Waktu': new Date(v.timestamp).toLocaleString('id-ID')
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hasil Survei');

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // No
            { wch: 25 },  // Nama
            { wch: 15 },  // No ID
            { wch: 8 },   // Kelas
            { wch: 30 },  // Pilihan
            { wch: 20 },  // Waktu
        ];

        const safeTitle = survey.title.replace(/[^a-zA-Z0-9]/g, '_');

        if (format === 'csv') {
            const csvBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Hasil_${safeTitle}.csv"`);
            return res.send(csvBuffer);
        } else {
            const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Hasil_${safeTitle}.xlsx"`);
            return res.send(xlsxBuffer);
        }
    } catch (err) {
        console.error('Export error:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
