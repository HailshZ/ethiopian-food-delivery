// routes/owner.js – Restaurant Owner dashboard and dish/meal plan management
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const isOwner = require('../middleware/owner');
const Dish = require('../models/Dish');
const MealPlan = require('../models/MealPlan');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

router.use(isLoggedIn, isOwner);

// GET /owner/dashboard
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

        res.render('owner/dashboard', {
            title: 'Owner Dashboard',
            dishes,
            mealPlans,
            totalDishes,
            approvedDishes,
            pendingDishes,
            rejectedDishes,
            unreadNotifications
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});

// GET /owner/dish/add
router.get('/dish/add', (req, res) => {
    res.render('owner/add-dish', {
        title: 'Add New Dish',
        dish: null
    });
});

// POST /owner/dish/add
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

// GET /owner/dish/:id/edit
router.get('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findOne({ _id: req.params.id, owner: req.session.userId });
        if (!dish) {
            req.flash('error', 'Dish not found or not yours');
            return res.redirect('/owner/dashboard');
        }
        res.render('owner/add-dish', {
            title: 'Edit Dish',
            dish
        });
    } catch (err) {
        console.error(err);
        res.redirect('/owner/dashboard');
    }
});

// POST /owner/dish/:id/edit
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
        dish.approvalStatus = 'pending'; // Re-approve after edit
        await dish.save();
        req.flash('success', 'Dish updated and re-submitted for approval!');
        res.redirect('/owner/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating dish');
        res.redirect('/owner/dashboard');
    }
});

// GET /owner/meal-plan/add
router.get('/meal-plan/add', async (req, res) => {
    try {
        const dishes = await Dish.find({ owner: req.session.userId, approvalStatus: 'approved' });
        res.render('owner/add-meal-plan', {
            title: 'Add Meal Plan',
            dishes,
            plan: null
        });
    } catch (err) {
        console.error(err);
        res.redirect('/owner/dashboard');
    }
});

// POST /owner/meal-plan/add
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

// GET /owner/notifications
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

// POST /owner/notifications/read-all
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

// POST /owner/notifications/:id/read
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

module.exports = router;
