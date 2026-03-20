// routes/admin.js – Admin dashboard with order and menu management
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const User = require('../models/User');
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

        // Recent orders
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
            recentOrders
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Manage Orders (with filter by status)
router.get('/orders', async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status && status !== 'all') {
            filter.orderStatus = status;
        }
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
        res.render('admin/orders', {
            title: 'Manage Orders',
            orders,
            currentStatus: status || 'all'  // this is the missing variable
        });
    } catch (err) {
        console.error('❌ Error in /admin/orders:', err);
        req.flash('error', 'Error loading orders: ' + err.message);
        res.redirect('/admin');
    }
});

// Update Order Status
router.post('/order/:id/update', async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/admin/orders');
        }
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

// Manage Menu
router.get('/menu', async (req, res) => {
    try {
        const dishes = await Dish.find().sort({ category: 1, name: 1 });
        res.render('admin/menu', { title: 'Manage Menu', dishes });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading menu');
        res.redirect('/admin');
    }
});

// Add Dish Form
router.get('/dish/add', (req, res) => {
    res.render('admin/add-dish', { title: 'Add New Dish' });
});

// Add Dish POST
router.post('/dish/add', async (req, res) => {
    const { name, nameAm, description, descriptionAm, price, category, imageUrl } = req.body;
    try {
        const dish = new Dish({
            name,
            nameAm,
            description,
            descriptionAm,
            price: parseFloat(price),
            category,
            imageUrl: imageUrl || '/images/placeholder.jpg',
            isAvailable: true
        });
        await dish.save();
        req.flash('success', 'Dish added successfully');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error adding dish');
        res.redirect('/admin/dish/add');
    }
});

// Edit Dish Form
router.get('/dish/:id/edit', async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) {
            req.flash('error', 'Dish not found');
            return res.redirect('/admin/menu');
        }
        res.render('admin/edit-dish', { title: 'Edit Dish', dish });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading dish');
        res.redirect('/admin/menu');
    }
});

// Edit Dish POST
router.post('/dish/:id/edit', async (req, res) => {
    const { name, nameAm, description, descriptionAm, price, category, imageUrl, isAvailable } = req.body;
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) {
            req.flash('error', 'Dish not found');
            return res.redirect('/admin/menu');
        }
        dish.name = name;
        dish.nameAm = nameAm;
        dish.description = description;
        dish.descriptionAm = descriptionAm;
        dish.price = parseFloat(price);
        dish.category = category;
        dish.imageUrl = imageUrl || dish.imageUrl;
        dish.isAvailable = isAvailable === 'on';
        await dish.save();
        req.flash('success', 'Dish updated successfully');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating dish');
        res.redirect(`/admin/dish/${req.params.id}/edit`);
    }
});

// Delete Dish
router.post('/dish/:id/delete', async (req, res) => {
    try {
        await Dish.findByIdAndDelete(req.params.id);
        req.flash('success', 'Dish deleted');
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error deleting dish');
        res.redirect('/admin/menu');
    }
});

module.exports = router;