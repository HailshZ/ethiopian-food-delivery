// routes/owner.js – Provider dashboard, dish/meal plan management, order flow, push notifications
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const isOwner = require('../middleware/owner');
const Dish = require('../models/Dish');
const MealPlan = require('../models/MealPlan');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

router.use(isLoggedIn, isOwner);

// ──────────────── DASHBOARD ────────────────
router.get('/dashboard', async (req, res) => {
    try {
        const ownerId = req.session.userId;
        const dishes = await Dish.find({ owner: ownerId }).sort({ createdAt: -1 });
        const mealPlans = await MealPlan.find({ owner: ownerId }).sort({ createdAt: -1 });

        const totalDishes = dishes.length;
        const approvedDishes = dishes.filter(d => d.approvalStatus === 'approved').length;
        const pendingDishes = dishes.filter(d => d.approvalStatus === 'pending').length;
        const rejectedDishes = dishes.filter(d => d.approvalStatus === 'rejected').length;
        const unreadNotifications = await Notification.countDocuments({ owner: ownerId, isRead: false });

        // Count active orders for this provider
        const dishIds = dishes.map(d => d._id);
        const activeOrders = await Order.countDocuments({
            'items.dishId': { $in: dishIds },
            orderStatus: { $in: ['confirmed', 'preparing', 'delivering'] }
        });

        res.render('owner/dashboard', {
            title: 'Provider Dashboard',
            dishes,
            mealPlans,
            totalDishes,
            approvedDishes,
            pendingDishes,
            rejectedDishes,
            unreadNotifications,
            activeOrders
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});

// ──────────────── DISH MANAGEMENT ────────────────
router.get('/dish/add', (req, res) => {
    res.render('owner/add-dish', { title: 'Add New Dish', dish: null });
});

router.post('/dish/add', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, category, imageUrl, spiceLevel } = req.body;
        const dish = new Dish({
            name,
            nameAm: nameAm || name,
            description,
            descriptionAm: descriptionAm || description,
            price: parseFloat(price),
            category: category || 'food',
            imageUrl: imageUrl || '/images/placeholder.jpg',
            spiceLevel: spiceLevel || '',
            owner: req.session.userId,
            approvalStatus: 'pending'
        });
        await dish.save();
        req.flash('success', 'Dish submitted for admin approval!');
        res.redirect('/owner/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error adding dish: ' + err.message);
        res.redirect('/owner/dish/add');
    }
});

router.get('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findOne({ _id: req.params.id, owner: req.session.userId });
        if (!dish) {
            req.flash('error', 'Dish not found or not yours');
            return res.redirect('/owner/dashboard');
        }
        res.render('owner/add-dish', { title: 'Edit Dish', dish });
    } catch (err) {
        console.error(err);
        res.redirect('/owner/dashboard');
    }
});

router.post('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findOne({ _id: req.params.id, owner: req.session.userId });
        if (!dish) {
            req.flash('error', 'Dish not found or not yours');
            return res.redirect('/owner/dashboard');
        }
        const { name, nameAm, description, descriptionAm, price, category, imageUrl, spiceLevel } = req.body;
        dish.name = name;
        dish.nameAm = nameAm || name;
        dish.description = description;
        dish.descriptionAm = descriptionAm || description;
        dish.price = parseFloat(price);
        dish.category = category || dish.category;
        dish.imageUrl = imageUrl || dish.imageUrl;
        dish.spiceLevel = spiceLevel || '';
        dish.approvalStatus = 'pending';
        await dish.save();
        req.flash('success', 'Dish updated and re-submitted for approval!');
        res.redirect('/owner/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating dish');
        res.redirect('/owner/dashboard');
    }
});

// ──────────────── MEAL PLAN MANAGEMENT ────────────────
router.get('/meal-plan/add', async (req, res) => {
    try {
        const dishes = await Dish.find({ owner: req.session.userId, approvalStatus: 'approved' });
        res.render('owner/add-meal-plan', { title: 'Add Meal Plan', dishes, plan: null });
    } catch (err) {
        console.error(err);
        res.redirect('/owner/dashboard');
    }
});

router.post('/meal-plan/add', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, duration, imageUrl } = req.body;
        const plan = new MealPlan({
            name,
            nameAm: nameAm || name,
            description: description || '',
            descriptionAm: descriptionAm || '',
            price: parseFloat(price),
            duration: duration || 'weekly',
            imageUrl: imageUrl || '',
            owner: req.session.userId,
            approvalStatus: 'pending'
        });
        await plan.save();
        req.flash('success', 'Meal plan submitted for admin approval!');
        res.redirect('/owner/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error adding meal plan: ' + err.message);
        res.redirect('/owner/meal-plan/add');
    }
});

// ──────────────── ORDER MANAGEMENT ────────────────
// GET /owner/orders – View all orders containing this provider's dishes
router.get('/orders', async (req, res) => {
    try {
        const ownerId = req.session.userId;
        const dishes = await Dish.find({ owner: ownerId });
        const dishIds = dishes.map(d => d._id);

        const orders = await Order.find({
            'items.dishId': { $in: dishIds },
            paymentStatus: 'paid'
        })
            .populate('user', 'name phone')
            .sort({ createdAt: -1 })
            .limit(100);

        const unreadNotifications = await Notification.countDocuments({ owner: ownerId, isRead: false });

        res.render('owner/orders', {
            title: 'Manage Orders',
            orders,
            unreadNotifications,
            providerDishIds: dishIds.map(id => id.toString())
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading orders');
        res.redirect('/owner/dashboard');
    }
});

// POST /owner/orders/:id/preparing – Provider sets order to "preparing"
router.post('/orders/:id/preparing', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.orderStatus !== 'confirmed') {
            return res.status(400).json({ error: 'Order must be confirmed before preparing' });
        }

        order.orderStatus = 'preparing';
        order.deliveryUpdates.push({
            status: 'Preparing',
            timestamp: new Date(),
            note: 'Provider is preparing your order'
        });
        await order.save();
        res.json({ success: true, status: order.orderStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /owner/orders/:id/delivering – Provider sets order to "delivering" (generates OTP)
router.post('/orders/:id/delivering', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.orderStatus !== 'preparing') {
            return res.status(400).json({ error: 'Order must be in preparing state' });
        }

        // Generate a 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        order.otp = otp;
        order.otpExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
        order.orderStatus = 'delivering';
        order.deliveryUpdates.push({
            status: 'Out for delivery',
            timestamp: new Date(),
            note: 'Your order is on the way!'
        });
        await order.save();

        res.json({ success: true, status: order.orderStatus, otp: otp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /owner/orders/:id/complete – Delivery person verifies OTP to complete order
router.post('/orders/:id/complete', async (req, res) => {
    try {
        const { otp } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.orderStatus !== 'delivering') {
            return res.status(400).json({ error: 'Order must be in delivering state' });
        }
        if (!order.otp || order.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        if (order.otpExpiry && new Date() > order.otpExpiry) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        order.orderStatus = 'delivered';
        order.otp = null;
        order.otpExpiry = null;
        order.deliveryUpdates.push({
            status: 'Delivered',
            timestamp: new Date(),
            note: 'Order delivered successfully'
        });
        await order.save();

        res.json({ success: true, status: order.orderStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── NOTIFICATIONS ────────────────
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({ owner: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadNotifications = notifications.filter(n => !n.isRead).length;
        res.render('owner/notifications', {
            title: 'Notifications',
            notifications,
            unreadNotifications
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading notifications');
        res.redirect('/owner/dashboard');
    }
});

router.post('/notifications/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { owner: req.session.userId, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/notifications/:id/read', async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, owner: req.session.userId },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── PUSH SUBSCRIPTIONS ────────────────
// POST /owner/push/subscribe – Save browser push subscription
router.post('/push/subscribe', async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        // Upsert: update if same endpoint exists, else create
        await PushSubscription.findOneAndUpdate(
            { user: req.session.userId, 'subscription.endpoint': subscription.endpoint },
            { user: req.session.userId, subscription },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Push subscribe error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /owner/push/subscribe – Remove a push subscription
router.delete('/push/subscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

        await PushSubscription.findOneAndDelete({
            user: req.session.userId,
            'subscription.endpoint': endpoint
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
