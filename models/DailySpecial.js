const mongoose = require('mongoose');

const dailySpecialSchema = new mongoose.Schema({
    dayOfWeek: {
        type: Number, // 0=Sunday, 1=Monday, ... 6=Saturday
        required: true,
        min: 0,
        max: 6
    },
    dish: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
    specialPrice: { type: Number, required: true },
    description: { type: String, default: '' },
    descriptionAm: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('DailySpecial', dailySpecialSchema);
