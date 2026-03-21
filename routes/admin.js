// routes/admin.js – Admin dashboard with order, menu, promo code, owner, approval, meal plan, and subscription management
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const MealPlan = require('../models/MealPlan');
const Subscription = require('../models/Subscription');
const { isLoggedIn } = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

// Apply both middlewares to all admin routes
router.use(isLoggedIn, isAdmin);

// Admin Dashboard
router.get('/', async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalDishes = await Dish.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalPromos = await PromoCode.countDocuments({ isActive: true });
        const pendingApprovals = await Dish.countDocuments({ approvalStatus: 'pending' }) +
            await MealPlan.countDocuments({ approvalStatus: 'pending' });
        const totalOwners = await User.countDocuments({ role: 'owner' });

        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalDishes,
            totalUsers,
            totalPromos,
            pendingApprovals,
            totalOwners,
            recentOrders
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});

// ============== ORDERS ==============
router.get('/orders', async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status && status !== 'all') filter.orderStatus = status;
        const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user', 'name email');
        res.render('admin/orders', { title: 'Manage Orders', orders, currentStatus: status || 'all' });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading orders');
        res.redirect('/admin');
    }
});

router.post('/order/:id/update', async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) { req.flash('error', 'Order not found'); return res.redirect('/admin/orders'); }
        order.orderStatus = status;
        order.deliveryUpdates.push({
            status: `Order ${status}`,
            timestamp: new Date(),
            note: `Status updated to ${status} by admin`
        });
        await order.save();
        req.flash('success', 'Order status updated');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating order');
        res.redirect('/admin/orders');
    }
});

// ============== MENU ==============
router.get('/menu', async (req, res) => {
    try {
        const dishes = await Dish.find().populate('owner', 'name restaurantName').sort({ category: 1, name: 1 });
        res.render('admin/menu', { title: 'Manage Menu', dishes });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading menu'); res.redirect('/admin');
    }
});

router.get('/dish/add', (req, res) => {
    res.render('admin/add-dish', { title: 'Add New Dish' });
});

router.post('/dish/add', async (req, res) => {
    const { name, nameAm, description, descriptionAm, price, category, imageUrl, spiceLevel } = req.body;
    try {
        const dish = new Dish({
            name, nameAm, description, descriptionAm,
            price: parseFloat(price), category,
            imageUrl: imageUrl || '/images/placeholder.jpg',
            spiceLevel: spiceLevel || '',
            isAvailable: true,
            approvalStatus: 'approved' // Admin-added dishes auto-approve
        });
        await dish.save();
        req.flash('success', 'Dish added successfully');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err); req.flash('error', 'Error adding dish'); res.redirect('/admin/dish/add');
    }
});

router.get('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) { req.flash('error', 'Dish not found'); return res.redirect('/admin/menu'); }
        res.render('admin/edit-dish', { title: 'Edit Dish', dish });
    } catch (err) {
        console.error(err); res.redirect('/admin/menu');
    }
});

router.post('/dish/:id/edit', async (req, res) => {
    const { name, nameAm, description, descriptionAm, price, category, imageUrl, isAvailable, spiceLevel } = req.body;
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) { req.flash('error', 'Dish not found'); return res.redirect('/admin/menu'); }
        Object.assign(dish, { name, nameAm, description, descriptionAm, price: parseFloat(price), category, spiceLevel: spiceLevel || '' });
        dish.imageUrl = imageUrl || dish.imageUrl;
        dish.isAvailable = isAvailable === 'on';
        await dish.save();
        req.flash('success', 'Dish updated successfully');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err); req.flash('error', 'Error updating dish'); res.redirect(`/admin/dish/${req.params.id}/edit`);
    }
});

router.post('/dish/:id/delete', async (req, res) => {
    try {
        await Dish.findByIdAndDelete(req.params.id);
        req.flash('success', 'Dish deleted');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err); req.flash('error', 'Error deleting dish'); res.redirect('/admin/menu');
    }
});

// ============== APPROVALS ==============
router.get('/approvals', async (req, res) => {
    try {
        const pendingDishes = await Dish.find({ approvalStatus: 'pending' }).populate('owner', 'name restaurantName');
        const pendingPlans = await MealPlan.find({ approvalStatus: 'pending' }).populate('owner', 'name restaurantName');
        res.render('admin/approvals', {
            title: 'Pending Approvals',
            pendingDishes,
            pendingPlans
        });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading approvals'); res.redirect('/admin');
    }
});

router.post('/dish/:id/approve', async (req, res) => {
    try {
        await Dish.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });
        req.flash('success', 'Dish approved and is now live on the menu!');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error approving dish'); res.redirect('/admin/approvals');
    }
});

router.post('/dish/:id/reject', async (req, res) => {
    try {
        await Dish.findByIdAndUpdate(req.params.id, { approvalStatus: 'rejected' });
        req.flash('success', 'Dish rejected');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error rejecting dish'); res.redirect('/admin/approvals');
    }
});

router.post('/mealplan/:id/approve', async (req, res) => {
    try {
        await MealPlan.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });
        req.flash('success', 'Meal plan approved!');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error approving meal plan'); res.redirect('/admin/approvals');
    }
});

router.post('/mealplan/:id/reject', async (req, res) => {
    try {
        await MealPlan.findByIdAndUpdate(req.params.id, { approvalStatus: 'rejected' });
        req.flash('success', 'Meal plan rejected');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error rejecting meal plan'); res.redirect('/admin/approvals');
    }
});

// ============== OWNERS ==============
router.get('/owners', async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' }).select('-password').sort({ createdAt: -1 });
        res.render('admin/owners', { title: 'Restaurant Owners', owners });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading owners'); res.redirect('/admin');
    }
});

router.post('/owner/add', async (req, res) => {
    try {
        const { name, email, password, phone, restaurantName } = req.body;
        if (!name || !email || !password) {
            req.flash('error', 'Name, email and password are required');
            return res.redirect('/admin/owners');
        }
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) { req.flash('error', 'Email already registered'); return res.redirect('/admin/owners'); }

        const owner = new User({
            name, email: email.toLowerCase(), password, phone: phone || '',
            role: 'owner', isAdmin: false,
            restaurantName: restaurantName || ''
        });
        await owner.save();
        req.flash('success', `Owner "${name}" (${restaurantName || 'No restaurant name'}) created`);
        res.redirect('/admin/owners');
    } catch (err) {
        console.error(err); req.flash('error', 'Error creating owner: ' + err.message); res.redirect('/admin/owners');
    }
});

// ============== MEAL PLANS ==============
router.get('/meal-plans', async (req, res) => {
    try {
        const plans = await MealPlan.find().populate('owner', 'name restaurantName').sort({ createdAt: -1 });
        res.render('admin/meal-plans', { title: 'Manage Meal Plans', plans });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading meal plans'); res.redirect('/admin');
    }
});

router.get('/meal-plan/add', async (req, res) => {
    try {
        const dishes = await Dish.find({ approvalStatus: 'approved', isAvailable: true });
        res.render('admin/add-meal-plan', { title: 'Add Meal Plan', dishes, plan: null });
    } catch (err) {
        console.error(err); res.redirect('/admin/meal-plans');
    }
});

router.post('/meal-plan/add', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, duration, imageUrl } = req.body;
        const plan = new MealPlan({
            name, nameAm: nameAm || name, description: description || '', descriptionAm: descriptionAm || '',
            price: parseFloat(price), duration: duration || 'weekly', imageUrl: imageUrl || '',
            approvalStatus: 'approved' // Admin-added plans auto-approve
        });
        await plan.save();
        req.flash('success', 'Meal plan created');
        res.redirect('/admin/meal-plans');
    } catch (err) {
        console.error(err); req.flash('error', 'Error creating meal plan'); res.redirect('/admin/meal-plan/add');
    }
});

router.post('/meal-plan/:id/toggle', async (req, res) => {
    try {
        const plan = await MealPlan.findById(req.params.id);
        if (plan) { plan.isActive = !plan.isActive; await plan.save(); }
        req.flash('success', `Meal plan ${plan.isActive ? 'activated' : 'deactivated'}`);
        res.redirect('/admin/meal-plans');
    } catch (err) {
        console.error(err); req.flash('error', 'Error toggling meal plan'); res.redirect('/admin/meal-plans');
    }
});

// ============== SUBSCRIPTIONS ==============
router.get('/subscriptions', async (req, res) => {
    try {
        const subscriptions = await Subscription.find()
            .populate('user', 'name email')
            .populate('mealPlan', 'name price duration')
            .sort({ createdAt: -1 });
        res.render('admin/subscriptions', { title: 'Manage Subscriptions', subscriptions });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading subscriptions'); res.redirect('/admin');
    }
});

router.post('/subscription/:id/update', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'paused', 'cancelled', 'expired'].includes(status)) {
            req.flash('error', 'Invalid status'); return res.redirect('/admin/subscriptions');
        }
        await Subscription.findByIdAndUpdate(req.params.id, { status });
        req.flash('success', `Subscription ${status}`);
        res.redirect('/admin/subscriptions');
    } catch (err) {
        console.error(err); req.flash('error', 'Error updating subscription'); res.redirect('/admin/subscriptions');
    }
});

// ============== PROMO CODES ==============
router.get('/promos', async (req, res) => {
    try {
        const promos = await PromoCode.find().sort({ createdAt: -1 });
        res.render('admin/promos', { title: 'Manage Promo Codes', promos });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading promo codes'); res.redirect('/admin');
    }
});

router.get('/promo/add', (req, res) => {
    res.render('admin/promo-form', { title: 'Add Promo Code' });
});

router.post('/promo/add', async (req, res) => {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    try {
        const promo = new PromoCode({
            code: code.toUpperCase().trim(), discountType,
            discountValue: parseFloat(discountValue),
            minOrderAmount: parseFloat(minOrderAmount) || 0,
            maxUses: parseInt(maxUses) || 0,
            expiresAt: expiresAt ? new Date(expiresAt) : null, isActive: true
        });
        await promo.save();
        req.flash('success', 'Promo code created');
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err);
        req.flash('error', err.code === 11000 ? 'Promo code already exists' : 'Error creating promo code');
        res.redirect('/admin/promo/add');
    }
});

router.post('/promo/:id/toggle', async (req, res) => {
    try {
        const promo = await PromoCode.findById(req.params.id);
        if (promo) { promo.isActive = !promo.isActive; await promo.save(); }
        req.flash('success', `Promo code ${promo.isActive ? 'activated' : 'deactivated'}`);
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err); req.flash('error', 'Error toggling promo code'); res.redirect('/admin/promos');
    }
});

router.post('/promo/:id/delete', async (req, res) => {
    try {
        await PromoCode.findByIdAndDelete(req.params.id);
        req.flash('success', 'Promo code deleted');
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err); req.flash('error', 'Error deleting promo code'); res.redirect('/admin/promos');
    }
});

module.exports = router;