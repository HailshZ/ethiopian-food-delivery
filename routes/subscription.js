// routes/subscription.js – Meal plan subscription routes
const express = require('express');
const router = express.Router();
const MealPlan = require('../models/MealPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { isLoggedIn } = require('../middleware/auth');
const Chapa = require('chapa-nodejs').Chapa;

const chapa = new Chapa({ secretKey: process.env.CHAPA_SECRET_KEY || '' });

// GET /meal-plans – Browse plans
router.get('/meal-plans', async (req, res) => {
    try {
        const plans = await MealPlan.find({ isActive: true, approvalStatus: { $in: ['approved', null] } }).populate('meals.monday.dish meals.tuesday.dish meals.wednesday.dish meals.thursday.dish meals.friday.dish meals.saturday.dish meals.sunday.dish');
        res.render('meal-plans', { title: 'Meal Plans', plans });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /meal-plans/:id – Plan detail
router.get('/meal-plans/:id', async (req, res) => {
    try {
        const plan = await MealPlan.findById(req.params.id).populate('meals.monday.dish meals.tuesday.dish meals.wednesday.dish meals.thursday.dish meals.friday.dish meals.saturday.dish meals.sunday.dish');
        if (!plan) return res.status(404).send('Plan not found');
        res.render('meal-plan-detail', { title: plan.name, plan });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/subscribe – Subscribe to a meal plan via Chapa
router.post('/api/subscribe', isLoggedIn, async (req, res) => {
    const { planId, shippingAddress } = req.body;

    try {
        const plan = await MealPlan.findById(planId);
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const user = await User.findById(req.session.userId);
        const txRef = `sub-${user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date();
        if (plan.duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setDate(endDate.getDate() + 7);
        }

        const response = await chapa.initialize({
            amount: plan.price,
            currency: 'ETB',
            email: user.email || `user-${user.phone || user._id}@ethiofood.local`,
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
            const subscription = new Subscription({
                user: req.session.userId,
                mealPlan: planId,
                status: 'active',
                startDate,
                endDate,
                shippingAddress,
                paymentStatus: 'pending',
                chapaTxRef: txRef,
                totalPaid: plan.price
            });
            await subscription.save();

            res.json({ success: true, checkoutUrl: response.data.checkout_url });
        } else {
            res.status(400).json({ error: 'Payment initiation failed' });
        }
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/subscription-callback – Chapa webhook for subscriptions
router.post('/api/subscription-callback', async (req, res) => {
    const { tx_ref } = req.body;
    try {
        const verification = await chapa.verify(tx_ref);
        if (verification.status === 'success') {
            const sub = await Subscription.findOne({ chapaTxRef: tx_ref });
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

// GET /subscriptions – User's subscriptions
router.get('/subscriptions', isLoggedIn, async (req, res) => {
    try {
        const subs = await Subscription.find({ user: req.session.userId })
            .populate('mealPlan')
            .sort({ createdAt: -1 });
        res.render('subscriptions', { title: 'My Subscriptions', subscriptions: subs });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/subscription/:id/cancel
router.post('/api/subscription/:id/cancel', isLoggedIn, async (req, res) => {
    try {
        const sub = await Subscription.findOne({ _id: req.params.id, user: req.session.userId });
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        sub.status = 'cancelled';
        await sub.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
