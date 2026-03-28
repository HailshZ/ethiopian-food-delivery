// routes/menu.js – Menu browsing routes with social-media-style feed
const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const MealPlan = require('../models/MealPlan');
const Order = require('../models/Order');
const DailySpecial = require('../models/DailySpecial');

// GET /menu
router.get('/menu', async (req, res) => {
    try {
        const dishes = await Dish.find({ isAvailable: true, approvalStatus: { $in: ['approved', null] } })
            .populate('owner', 'name restaurantName');

        const today = new Date().getDay();
        const todaysSpecials = await DailySpecial.find({ dayOfWeek: today, isActive: true }).populate('dish');

        // Most ordered dishes (top 6 by order frequency)
        let mostOrdered = [];
        try {
            const topDishes = await Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $unwind: '$items' },
                { $group: { _id: '$items.dishId', totalOrdered: { $sum: '$items.qty' }, name: { $first: '$items.name' } } },
                { $sort: { totalOrdered: -1 } },
                { $limit: 6 }
            ]);
            const topDishIds = topDishes.map(d => d._id);
            const topDishDocs = await Dish.find({
                _id: { $in: topDishIds },
                isAvailable: true,
                approvalStatus: { $in: ['approved', null] }
            }).populate('owner', 'name restaurantName');

            // Merge order count with dish data
            mostOrdered = topDishDocs.map(dish => {
                const stats = topDishes.find(t => t._id && t._id.toString() === dish._id.toString());
                return { ...dish.toObject(), totalOrdered: stats ? stats.totalOrdered : 0 };
            }).sort((a, b) => b.totalOrdered - a.totalOrdered);
        } catch (aggErr) {
            console.error('Aggregation error:', aggErr.message);
        }

        // Most ordered meal plans (top 3)
        let topMealPlans = [];
        try {
            const Subscription = require('../models/Subscription');
            const topPlans = await Subscription.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: '$mealPlan', totalSubs: { $sum: 1 } } },
                { $sort: { totalSubs: -1 } },
                { $limit: 3 }
            ]);
            const planIds = topPlans.map(p => p._id);
            const planDocs = await MealPlan.find({
                _id: { $in: planIds },
                isActive: true,
                approvalStatus: { $in: ['approved', null] }
            }).populate('owner', 'name restaurantName');
            topMealPlans = planDocs.map(plan => {
                const stats = topPlans.find(t => t._id && t._id.toString() === plan._id.toString());
                return { ...plan.toObject(), totalSubs: stats ? stats.totalSubs : 0 };
            }).sort((a, b) => b.totalSubs - a.totalSubs);
        } catch (planErr) {
            console.error('Meal plan aggregation error:', planErr.message);
        }

        res.render('menu', {
            title: 'Menu',
            dishes,
            todaysSpecials,
            mostOrdered,
            topMealPlans
        });
    } catch (err) {
        console.error('❌ Menu route error:', err);
        res.status(500).send('Error loading menu: ' + err.message);
    }
});

// API: search/filter dishes (AJAX) – now includes owner info
router.get('/api/dishes', async (req, res) => {
    try {
        const { q, category } = req.query;
        const filter = { isAvailable: true, approvalStatus: { $in: ['approved', null] } };
        if (category && category !== 'all') filter.category = category;
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { nameAm: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }
        const dishes = await Dish.find(filter).populate('owner', 'name restaurantName');
        res.json({ success: true, dishes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
