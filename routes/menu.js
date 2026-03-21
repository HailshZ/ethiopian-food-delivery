// routes/menu.js – Menu browsing routes
const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const DailySpecial = require('../models/DailySpecial');

// GET /menu
router.get('/menu', async (req, res) => {
    try {
        const dishes = await Dish.find({ isAvailable: true, approvalStatus: 'approved' });
        const today = new Date().getDay(); // 0=Sunday
        const todaysSpecials = await DailySpecial.find({ dayOfWeek: today, isActive: true }).populate('dish');
        res.render('menu', { title: 'Menu', dishes, todaysSpecials });
    } catch (err) {
        console.error('❌ Menu route error:', err);
        res.status(500).send('Error loading menu: ' + err.message);
    }
});

// API: search/filter dishes (AJAX)
router.get('/api/dishes', async (req, res) => {
    try {
        const { q, category } = req.query;
        const filter = { isAvailable: true, approvalStatus: 'approved' };
        if (category && category !== 'all') filter.category = category;
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { nameAm: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }
        const dishes = await Dish.find(filter);
        res.json({ success: true, dishes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
