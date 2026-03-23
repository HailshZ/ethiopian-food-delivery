// routes/auth.js – Authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Order = require('../models/Order');
const { isLoggedIn } = require('../middleware/auth');

// GET /register
router.get('/register', (req, res) => {
    res.render('auth/register', { title: 'Register' });
});

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, password2, phone } = req.body;
        let errors = [];
        if (!name || !phone || !password || !password2) {
            errors.push({ msg: 'Please fill in all required fields (name, phone, password)' });
        }
        if (password !== password2) {
            errors.push({ msg: 'Passwords do not match' });
        }
        if (password.length < 6) {
            errors.push({ msg: 'Password should be at least 6 characters' });
        }
        if (errors.length > 0) {
            return res.render('auth/register', { title: 'Register', errors, name, email, phone });
        }
        // Check for existing phone
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            req.flash('error', 'Phone number is already registered');
            return res.redirect('/register');
        }
        // Check for existing email if provided
        if (email && email.trim()) {
            const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
            if (existingEmail) {
                req.flash('error', 'Email is already registered');
                return res.redirect('/register');
            }
        }
        const userData = { name, password, phone };
        if (email && email.trim()) {
            userData.email = email.trim();
        }
        const newUser = new User(userData);
        await newUser.save();
        req.flash('success', 'You are now registered. Please log in.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/register');
    }
});

// GET /login
router.get('/login', (req, res) => {
    res.render('auth/login', { title: 'Login' });
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        // Try to find user by email or phone
        let user = await User.findOne({ email: identifier.trim().toLowerCase() });
        if (!user) {
            user = await User.findOne({ phone: identifier.trim() });
        }
        if (!user) {
            req.flash('error', 'Invalid email/phone or password');
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid email/phone or password');
            return res.redirect('/login');
        }
        // Block deactivated accounts
        if (!user.isActive) {
            req.flash('error', 'Your account has been deactivated. Contact support.');
            return res.redirect('/login');
        }
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.isAdmin = user.isAdmin;
        req.session.role = user.role || 'user';
        req.session.restaurantName = user.restaurantName || '';
        req.flash('success', 'Logged in successfully');
        if (user.role === 'owner') {
            return res.redirect('/owner/dashboard');
        }
        if (user.isAdmin || user.role === 'superadmin') {
            return res.redirect('/admin');
        }
        res.redirect('/menu');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/login');
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// GET /profile
router.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-password');
        const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(10);
        const totalSpent = orders.reduce((sum, o) => o.paymentStatus === 'paid' ? sum + o.totalAmount : sum, 0);
        res.render('auth/profile', { title: 'Profile', user, orders, totalSpent });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

module.exports = router;
