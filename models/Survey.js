const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const OptionSchema = new mongoose.Schema({
    option_id: { type: String, default: uuidv4 },
    label: { type: String, required: true },
    description: String,
    youtube_link: String,
    image_url: String,
    sort_order: { type: Number, default: 0 }
});

const SurveySchema = new mongoose.Schema({
    survey_id: { type: String, default: uuidv4, unique: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['single_choice', 'multiple_choice'], default: 'multiple_choice' },
    max_options: { type: Number, default: 1 },
    is_active: { type: Boolean, default: false },
    options: [OptionSchema],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Survey', SurveySchema);
