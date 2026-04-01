// routes/subscription.js – Meal plan subscription routes (Sequelize)
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { MealPlan, MealSlot, Subscription, User, Dish } = require('../models');
const { isLoggedIn } = require('../middleware/auth');
const Chapa = require('chapa-nodejs').Chapa;

const chapa = new Chapa({ secretKey: process.env.CHAPA_SECRET_KEY || '' });

// GET /meal-plans
router.get('/meal-plans', async (req, res) => {
    try {
        const plans = await MealPlan.findAll({
            where: {
                isActive: true,
                approvalStatus: { [Op.in]: ['approved'] }
            },
            include: [{
                model: MealSlot,
                as: 'mealSlots',
                include: [{ model: Dish, as: 'dish' }]
            }]
        });
        res.render('meal-plans', { title: 'Meal Plans', plans });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /meal-plans/:id
router.get('/meal-plans/:id', async (req, res) => {
    try {
        const plan = await MealPlan.findByPk(req.params.id, {
            include: [{
                model: MealSlot,
                as: 'mealSlots',
                include: [{ model: Dish, as: 'dish' }]
            }]
        });
        if (!plan) return res.status(404).send('Plan not found');
        res.render('meal-plan-detail', { title: plan.name, plan });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/subscribe
router.post('/api/subscribe', isLoggedIn, async (req, res) => {
    const { planId, shippingAddress } = req.body;

    try {
        const plan = await MealPlan.findByPk(planId);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const user = await User.findByPk(req.session.userId);
        const txRef = `sub-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const startDate = new Date();
        const endDate = new Date();
        if (plan.duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setDate(endDate.getDate() + 7);
        }

        const response = await chapa.initialize({
            amount: parseFloat(plan.price),
            currency: 'ETB',
            email: user.email || `user-${user.phone || user.id}@ethiofood.local`,
            first_name: user.name.split(' ')[0],
            last_name: user.name.split(' ').slice(1).join(' ') || 'Customer',
            phone_number: user.phone || '0911000000',
            tx_ref: txRef,
            callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/subscription-callback`,
            return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/subscriptions?tx_ref=${txRef}`,
            customization: {
                title: 'EthioFood Meal Plan',
                description: `Subscription: ${plan.name}`
            }
        });

        if (response.status === 'success') {
            await Subscription.create({
                userId: req.session.userId,
                mealPlanId: planId,
                status: 'active',
                startDate,
                endDate,
                shippingStreet: shippingAddress.street,
                shippingCity: shippingAddress.city,
                shippingZipCode: shippingAddress.zipCode,
                paymentStatus: 'pending',
                chapaTxRef: txRef,
                totalPaid: parseFloat(plan.price)
            });

            res.json({ success: true, checkoutUrl: response.data.checkout_url });
        } else {
            res.status(400).json({ error: 'Payment initiation failed' });
        }
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subscription-callback
router.post('/api/subscription-callback', async (req, res) => {
    const { tx_ref } = req.body;
    try {
        const verification = await chapa.verify(tx_ref);
        if (verification.status === 'success') {
            const sub = await Subscription.findOne({ where: { chapaTxRef: tx_ref } });
            if (sub) {
                sub.paymentStatus = 'paid';
                await sub.save();
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error('Sub callback error:', err);
        res.sendStatus(500);
    }
});

// GET /subscriptions
router.get('/subscriptions', isLoggedIn, async (req, res) => {
    try {
        const subs = await Subscription.findAll({
            where: { userId: req.session.userId },
            include: [{ model: MealPlan, as: 'mealPlan' }],
            order: [['createdAt', 'DESC']]
        });
        res.render('subscriptions', { title: 'My Subscriptions', subscriptions: subs });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/subscription/:id/cancel
router.post('/api/subscription/:id/cancel', isLoggedIn, async (req, res) => {
    try {
        const sub = await Subscription.findOne({
            where: { id: req.params.id, userId: req.session.userId }
        });
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        sub.status = 'cancelled';
        await sub.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
