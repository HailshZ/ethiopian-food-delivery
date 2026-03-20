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
        if (!name || !email || !password || !password2) {
            errors.push({ msg: 'Please fill in all required fields' });
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
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email is already registered');
            return res.redirect('/register');
        }
        const newUser = new User({ name, email, password, phone });
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
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.isAdmin = user.isAdmin;
        req.session.role = user.role || 'user';
        req.flash('success', 'Logged in successfully');
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
