// routes/superadmin.js – Super Admin system settings and user management
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const isSuperAdmin = require('../middleware/superadmin');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');

// Apply both middlewares
router.use(isLoggedIn, isSuperAdmin);

// GET /superadmin/settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await SystemSettings.getSettings();
        res.render('superadmin/settings', {
            title: 'System Settings',
            sysSettings: settings
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading settings');
        res.redirect('/admin');
    }
});

// POST /superadmin/settings
router.post('/settings', async (req, res) => {
    try {
        const { systemName, currency, currencySymbol, contactEmail, contactPhone, address, deliveryFee, minOrderAmount } = req.body;
        let settings = await SystemSettings.getSettings();

        settings.systemName = systemName || settings.systemName;
        settings.currency = currency || settings.currency;
        settings.currencySymbol = currencySymbol || settings.currencySymbol;
        settings.contactEmail = contactEmail || settings.contactEmail;
        settings.contactPhone = contactPhone || settings.contactPhone;
        settings.address = address || settings.address;
        settings.deliveryFee = parseFloat(deliveryFee) || settings.deliveryFee;
        settings.minOrderAmount = parseFloat(minOrderAmount) || settings.minOrderAmount;

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
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.render('superadmin/users', {
            title: 'Manage Users',
            users
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading users');
        res.redirect('/superadmin/settings');
    }
});

// POST /superadmin/user/:id/role
router.post('/user/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin', 'superadmin'].includes(role)) {
            req.flash('error', 'Invalid role');
            return res.redirect('/superadmin/users');
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/superadmin/users');
        }

        // Prevent removing own superadmin role
        if (user._id.toString() === req.session.userId && role !== 'superadmin') {
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
