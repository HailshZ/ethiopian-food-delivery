// routes/admin.js – Admin dashboard (Sequelize)
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Order, OrderItem, DeliveryUpdate, Dish, User, PromoCode, MealPlan, Subscription, sequelize } = require('../models');
const { isLoggedIn } = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

router.use(isLoggedIn, isAdmin);

// Admin Dashboard
router.get('/', async (req, res) => {
    try {
        const totalOrders = await Order.count();
        const revenueResult = await Order.sum('totalAmount');
        const totalDishes = await Dish.count();
        const totalUsers = await User.count();
        const totalPromos = await PromoCode.count({ where: { isActive: true } });
        const pendingDishCount = await Dish.count({ where: { approvalStatus: 'pending' } });
        const pendingPlanCount = await MealPlan.count({ where: { approvalStatus: 'pending' } });
        const pendingApprovals = pendingDishCount + pendingPlanCount;
        const totalOwners = await User.count({ where: { role: 'provider' } });

        const recentOrders = await Order.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
        });

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            totalOrders,
            totalRevenue: revenueResult || 0,
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
        const where = {};
        if (status && status !== 'all') where.orderStatus = status;
        const orders = await Order.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'user', attributes: ['name', 'email'] },
                { model: OrderItem, as: 'items' }
            ]
        });
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
        const order = await Order.findByPk(req.params.id);
        if (!order) { req.flash('error', 'Order not found'); return res.redirect('/admin/orders'); }
        order.orderStatus = status;
        await order.save();
        await DeliveryUpdate.create({
            orderId: order.id,
            status: `Order ${status}`,
            timestamp: new Date(),
            note: `Status updated to ${status} by admin`
        });
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
        const dishes = await Dish.findAll({
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }],
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
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
        await Dish.create({
            name, nameAm, description, descriptionAm,
            price: parseFloat(price), category,
            imageUrl: imageUrl || '/images/placeholder.jpg',
            spiceLevel: spiceLevel || '',
            isAvailable: true,
            approvalStatus: 'approved'
        });
        req.flash('success', 'Dish added successfully');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err); req.flash('error', 'Error adding dish'); res.redirect('/admin/dish/add');
    }
});

router.get('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findByPk(req.params.id);
        if (!dish) { req.flash('error', 'Dish not found'); return res.redirect('/admin/menu'); }
        res.render('admin/edit-dish', { title: 'Edit Dish', dish });
    } catch (err) {
        console.error(err); res.redirect('/admin/menu');
    }
});

router.post('/dish/:id/edit', async (req, res) => {
    const { name, nameAm, description, descriptionAm, price, category, imageUrl, isAvailable, spiceLevel } = req.body;
    try {
        const dish = await Dish.findByPk(req.params.id);
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
        await Dish.destroy({ where: { id: req.params.id } });
        req.flash('success', 'Dish deleted');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err); req.flash('error', 'Error deleting dish'); res.redirect('/admin/menu');
    }
});

// ============== APPROVALS ==============
router.get('/approvals', async (req, res) => {
    try {
        const pendingDishes = await Dish.findAll({
            where: { approvalStatus: 'pending' },
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
        });
        const pendingPlans = await MealPlan.findAll({
            where: { approvalStatus: 'pending' },
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }]
        });
        res.render('admin/approvals', { title: 'Pending Approvals', pendingDishes, pendingPlans });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading approvals'); res.redirect('/admin');
    }
});

router.post('/dish/:id/approve', async (req, res) => {
    try {
        await Dish.update({ approvalStatus: 'approved' }, { where: { id: req.params.id } });
        req.flash('success', 'Dish approved and is now live on the menu!');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error approving dish'); res.redirect('/admin/approvals');
    }
});

router.post('/dish/:id/reject', async (req, res) => {
    try {
        await Dish.update({ approvalStatus: 'rejected' }, { where: { id: req.params.id } });
        req.flash('success', 'Dish rejected');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error rejecting dish'); res.redirect('/admin/approvals');
    }
});

router.post('/mealplan/:id/approve', async (req, res) => {
    try {
        await MealPlan.update({ approvalStatus: 'approved' }, { where: { id: req.params.id } });
        req.flash('success', 'Meal plan approved!');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error approving meal plan'); res.redirect('/admin/approvals');
    }
});

router.post('/mealplan/:id/reject', async (req, res) => {
    try {
        await MealPlan.update({ approvalStatus: 'rejected' }, { where: { id: req.params.id } });
        req.flash('success', 'Meal plan rejected');
        res.redirect('/admin/approvals');
    } catch (err) {
        console.error(err); req.flash('error', 'Error rejecting meal plan'); res.redirect('/admin/approvals');
    }
});

// ============== OWNERS ==============
router.get('/owners', async (req, res) => {
    try {
        const owners = await User.findAll({
            where: { role: 'provider' },
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
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
        const exists = await User.findOne({ where: { email: email.toLowerCase() } });
        if (exists) { req.flash('error', 'Email already registered'); return res.redirect('/admin/owners'); }
        await User.create({
            name, email: email.toLowerCase(), password, phone: phone || '',
            role: 'provider', isAdmin: false,
            restaurantName: restaurantName || ''
        });
        req.flash('success', `Owner "${name}" (${restaurantName || 'No restaurant name'}) created`);
        res.redirect('/admin/owners');
    } catch (err) {
        console.error(err); req.flash('error', 'Error creating owner: ' + err.message); res.redirect('/admin/owners');
    }
});

// ============== MEAL PLANS ==============
router.get('/meal-plans', async (req, res) => {
    try {
        const plans = await MealPlan.findAll({
            include: [{ model: User, as: 'owner', attributes: ['name', 'restaurantName'] }],
            order: [['createdAt', 'DESC']]
        });
        res.render('admin/meal-plans', { title: 'Manage Meal Plans', plans });
    } catch (err) {
        console.error(err); req.flash('error', 'Error loading meal plans'); res.redirect('/admin');
    }
});

router.get('/meal-plan/add', async (req, res) => {
    try {
        const dishes = await Dish.findAll({ where: { approvalStatus: 'approved', isAvailable: true } });
        res.render('admin/add-meal-plan', { title: 'Add Meal Plan', dishes, plan: null });
    } catch (err) {
        console.error(err); res.redirect('/admin/meal-plans');
    }
});

router.post('/meal-plan/add', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, duration, imageUrl } = req.body;
        await MealPlan.create({
            name, nameAm: nameAm || name, description: description || '', descriptionAm: descriptionAm || '',
            price: parseFloat(price), duration: duration || 'weekly', imageUrl: imageUrl || '',
            approvalStatus: 'approved'
        });
        req.flash('success', 'Meal plan created');
        res.redirect('/admin/meal-plans');
    } catch (err) {
        console.error(err); req.flash('error', 'Error creating meal plan'); res.redirect('/admin/meal-plan/add');
    }
});

router.post('/meal-plan/:id/toggle', async (req, res) => {
    try {
        const plan = await MealPlan.findByPk(req.params.id);
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
        const subscriptions = await Subscription.findAll({
            include: [
                { model: User, as: 'user', attributes: ['name', 'email'] },
                { model: MealPlan, as: 'mealPlan', attributes: ['name', 'price', 'duration'] }
            ],
            order: [['createdAt', 'DESC']]
        });
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
        await Subscription.update({ status }, { where: { id: req.params.id } });
        req.flash('success', `Subscription ${status}`);
        res.redirect('/admin/subscriptions');
    } catch (err) {
        console.error(err); req.flash('error', 'Error updating subscription'); res.redirect('/admin/subscriptions');
    }
});

// ============== PROMO CODES ==============
router.get('/promos', async (req, res) => {
    try {
        const promos = await PromoCode.findAll({ order: [['createdAt', 'DESC']] });
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
        await PromoCode.create({
            code: code.toUpperCase().trim(), discountType,
            discountValue: parseFloat(discountValue),
            minOrderAmount: parseFloat(minOrderAmount) || 0,
            maxUses: parseInt(maxUses) || 0,
            expiresAt: expiresAt ? new Date(expiresAt) : null, isActive: true
        });
        req.flash('success', 'Promo code created');
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err);
        const msg = err.name === 'SequelizeUniqueConstraintError' ? 'Promo code already exists' : 'Error creating promo code';
        req.flash('error', msg);
        res.redirect('/admin/promo/add');
    }
});

router.post('/promo/:id/toggle', async (req, res) => {
    try {
        const promo = await PromoCode.findByPk(req.params.id);
        if (promo) { promo.isActive = !promo.isActive; await promo.save(); }
        req.flash('success', `Promo code ${promo.isActive ? 'activated' : 'deactivated'}`);
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err); req.flash('error', 'Error toggling promo code'); res.redirect('/admin/promos');
    }
});

router.post('/promo/:id/delete', async (req, res) => {
    try {
        await PromoCode.destroy({ where: { id: req.params.id } });
        req.flash('success', 'Promo code deleted');
        res.redirect('/admin/promos');
    } catch (err) {
        console.error(err); req.flash('error', 'Error deleting promo code'); res.redirect('/admin/promos');
    }
});

module.exports = router;