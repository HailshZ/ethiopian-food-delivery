// routes/menu.js – Menu browsing routes (Sequelize)
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Dish, MealPlan, Order, OrderItem, DailySpecial, Subscription, User, sequelize } = require('../models');

// GET /menu
router.get('/menu', async (req, res) => {
    try {
        const dishes = await Dish.findAll({
            where: {
                isAvailable: true,
                approvalStatus: { [Op.in]: ['approved'] }
            },
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
        });

        const today = new Date().getDay();
        const todaysSpecials = await DailySpecial.findAll({
            where: { dayOfWeek: today, isActive: true },
            include: [{ model: Dish, as: 'dish' }]
        });

        // Most ordered dishes (top 6 by order frequency)
        let mostOrdered = [];
        try {
            const topDishes = await OrderItem.findAll({
                attributes: [
                    'dishId',
                    [sequelize.fn('SUM', sequelize.col('qty')), 'totalOrdered']
                ],
                include: [{
                    model: Order,
                    attributes: [],
                    where: { paymentStatus: 'paid' }
                }],
                group: ['dishId'],
                order: [[sequelize.fn('SUM', sequelize.col('qty')), 'DESC']],
                limit: 6,
                raw: true
            });

            if (topDishes.length > 0) {
                const topDishIds = topDishes.map(d => d.dishId);
                const topDishDocs = await Dish.findAll({
                    where: {
                        id: { [Op.in]: topDishIds },
                        isAvailable: true,
                        approvalStatus: { [Op.in]: ['approved'] }
                    },
                    include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
                });

                mostOrdered = topDishDocs.map(dish => {
                    const stats = topDishes.find(t => t.dishId === dish.id);
                    return { ...dish.toJSON(), totalOrdered: stats ? parseInt(stats.totalOrdered) : 0 };
                }).sort((a, b) => b.totalOrdered - a.totalOrdered);
            }
        } catch (aggErr) {
            console.error('Aggregation error:', aggErr.message);
        }

        // Most subscribed meal plans (top 3)
        let topMealPlans = [];
        try {
            const topPlans = await Subscription.findAll({
                attributes: [
                    'mealPlanId',
                    [sequelize.fn('COUNT', sequelize.col('Subscription.id')), 'totalSubs']
                ],
                where: { paymentStatus: 'paid' },
                group: ['mealPlanId'],
                order: [[sequelize.fn('COUNT', sequelize.col('Subscription.id')), 'DESC']],
                limit: 3,
                raw: true
            });

            if (topPlans.length > 0) {
                const planIds = topPlans.map(p => p.mealPlanId);
                const planDocs = await MealPlan.findAll({
                    where: {
                        id: { [Op.in]: planIds },
                        isActive: true,
                        approvalStatus: { [Op.in]: ['approved'] }
                    },
                    include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
                });

                topMealPlans = planDocs.map(plan => {
                    const stats = topPlans.find(t => t.mealPlanId === plan.id);
                    return { ...plan.toJSON(), totalSubs: stats ? parseInt(stats.totalSubs) : 0 };
                }).sort((a, b) => b.totalSubs - a.totalSubs);
            }
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

// API: search/filter dishes (AJAX)
router.get('/api/dishes', async (req, res) => {
    try {
        const { q, category } = req.query;
        const where = {
            isAvailable: true,
            approvalStatus: { [Op.in]: ['approved'] }
        };
        if (category && category !== 'all') where.category = category;
        if (q) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${q}%` } },
                { nameAm: { [Op.iLike]: `%${q}%` } },
                { description: { [Op.iLike]: `%${q}%` } }
            ];
        }
        const dishes = await Dish.findAll({
            where,
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
        });
        res.json({ success: true, dishes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
