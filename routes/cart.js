// routes/cart.js – Cart routes (page + AJAX API)
const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const cartHelper = require('../middleware/cart');

// POST /cart/add/:id (traditional form)
router.post('/cart/add/:id', async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) return res.status(404).send('Dish not found');
        cartHelper.addToCart(req.session, dish, 1);
        // Check if AJAX
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true, cart: cartHelper.getCart(req.session) });
        }
        res.redirect('/menu');
    } catch (err) {
        console.error(err);
        if (req.xhr) return res.status(500).json({ success: false, error: 'Server Error' });
        res.status(500).send('Server Error');
    }
});

// GET /cart
router.get('/cart', (req, res) => {
    const cart = cartHelper.getCart(req.session);
    res.render('cart', { title: 'Your Cart', cart });
});

// POST /cart/update/:id
router.post('/cart/update/:id', (req, res) => {
    const { qty } = req.body;
    cartHelper.updateCartItem(req.session, req.params.id, parseInt(qty));
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.json({ success: true, cart: cartHelper.getCart(req.session) });
    }
    res.redirect('/cart');
});

// POST /cart/remove/:id
router.post('/cart/remove/:id', (req, res) => {
    cartHelper.removeFromCart(req.session, req.params.id);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.json({ success: true, cart: cartHelper.getCart(req.session) });
    }
    res.redirect('/cart');
});

// AJAX API endpoints
router.get('/api/cart', (req, res) => {
    res.json({ success: true, cart: cartHelper.getCart(req.session) });
});

router.post('/api/cart/add/:id', async (req, res) => {
    try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) return res.status(404).json({ success: false, error: 'Dish not found' });
        const qty = parseInt(req.body.qty) || 1;
        cartHelper.addToCart(req.session, dish, qty);
        res.json({ success: true, cart: cartHelper.getCart(req.session) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/api/cart/update/:id', (req, res) => {
    const { qty } = req.body;
    cartHelper.updateCartItem(req.session, req.params.id, parseInt(qty));
    res.json({ success: true, cart: cartHelper.getCart(req.session) });
});

router.delete('/api/cart/remove/:id', (req, res) => {
    cartHelper.removeFromCart(req.session, req.params.id);
    res.json({ success: true, cart: cartHelper.getCart(req.session) });
});

module.exports = router;
