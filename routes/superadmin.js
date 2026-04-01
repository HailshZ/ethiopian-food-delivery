// routes/superadmin.js – Super Admin system settings and user management (Sequelize)
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const isSuperAdmin = require('../middleware/superadmin');
const { SystemSettings, User } = require('../models');

router.use(isLoggedIn, isSuperAdmin);

// GET /superadmin/settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await SystemSettings.getSettings();
        res.render('superadmin/settings', { title: 'System Settings', sysSettings: settings });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading settings');
        res.redirect('/admin');
    }
});

// POST /superadmin/settings
router.post('/settings', async (req, res) => {
    try {
        const { systemName, currency, currencySymbol, currencyPosition, contactEmail, contactPhone, address, deliveryFeePerKm, baseDeliveryFee, minOrderAmount, restaurantLat, restaurantLng } = req.body;
        let settings = await SystemSettings.getSettings();

        settings.systemName = systemName || settings.systemName;
        settings.currency = currency || settings.currency;
        settings.currencySymbol = currencySymbol || settings.currencySymbol;
        settings.currencyPosition = currencyPosition || settings.currencyPosition;
        settings.contactEmail = contactEmail || settings.contactEmail;
        settings.contactPhone = contactPhone || settings.contactPhone;
        settings.address = address || settings.address;
        settings.deliveryFeePerKm = parseFloat(deliveryFeePerKm) || settings.deliveryFeePerKm;
        settings.baseDeliveryFee = parseFloat(baseDeliveryFee) || settings.baseDeliveryFee;
        settings.minOrderAmount = parseFloat(minOrderAmount) || settings.minOrderAmount;
        if (restaurantLat && restaurantLng) {
            settings.restaurantLat = parseFloat(restaurantLat);
            settings.restaurantLng = parseFloat(restaurantLng);
        }

        await settings.save();
        req.flash('success', 'System settings updated successfully');
        res.redirect('/superadmin/settings');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating settings');
        res.redirect('/superadmin/settings');
    }
});

// GET /superadmin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.render('superadmin/users', { title: 'Manage Users', users });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading users');
        res.redirect('/superadmin/settings');
    }
});

// POST /superadmin/admin/add
router.post('/admin/add', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            req.flash('error', 'Name, email and password are required');
            return res.redirect('/superadmin/users');
        }
        const exists = await User.findOne({ where: { email: email.toLowerCase() } });
        if (exists) {
            req.flash('error', 'Email already registered');
            return res.redirect('/superadmin/users');
        }
        await User.create({
            name, email: email.toLowerCase(), password,
            phone: phone || '', isAdmin: true, role: 'admin'
        });
        req.flash('success', `Admin "${name}" created successfully`);
        res.redirect('/superadmin/users');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error creating admin: ' + err.message);
        res.redirect('/superadmin/users');
    }
});

// POST /superadmin/user/:id/toggle
router.post('/user/:id/toggle', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/superadmin/users');
        }
        if (user.id === req.session.userId) {
            req.flash('error', 'Cannot deactivate your own account');
            return res.redirect('/superadmin/users');
        }
        user.isActive = !user.isActive;
        await user.save();
        req.flash('success', `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/superadmin/users');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error toggling user status');
        res.redirect('/superadmin/users');
    }
});

// POST /superadmin/user/:id/role
router.post('/user/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin', 'superadmin', 'provider'].includes(role)) {
            req.flash('error', 'Invalid role');
            return res.redirect('/superadmin/users');
        }
        const user = await User.findByPk(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/superadmin/users');
        }
        if (user.id === req.session.userId && role !== 'superadmin') {
            req.flash('error', 'Cannot change your own superadmin role');
            return res.redirect('/superadmin/users');
        }
        user.role = role;
        user.isAdmin = (role === 'admin' || role === 'superadmin');
        await user.save();
        req.flash('success', `User role updated to ${role}`);
        res.redirect('/superadmin/users');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error updating user role');
        res.redirect('/superadmin/users');
    }
});

module.exports = router;
