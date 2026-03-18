// routes/delivery.js – Delivery tracking routes
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

// GET /delivery/:orderId – Delivery tracking page
router.get('/delivery/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).send('Order not found');
        if (order.user.toString() !== req.session.userId.toString() && !req.session.isAdmin) {
            return res.status(403).send('Unauthorized');
        }
        res.render('delivery-tracking', {
            title: 'Track Delivery',
            order,
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// API: Get delivery status (AJAX polling)
router.get('/api/delivery/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).select('orderStatus deliveryLocation estimatedDelivery deliveryUpdates');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({
            success: true,
            status: order.orderStatus,
            location: order.deliveryLocation,
            estimatedDelivery: order.estimatedDelivery,
            updates: order.deliveryUpdates
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Admin update delivery status/location
router.put('/api/delivery/:orderId', isAdmin, async (req, res) => {
    try {
        const { status, lat, lng, note } = req.body;
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (status) order.orderStatus = status;
        if (lat && lng) {
            order.deliveryLocation = { lat, lng };
        }

        order.deliveryUpdates.push({
            status: status || order.orderStatus,
            location: lat && lng ? { lat, lng } : order.deliveryLocation,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`
        });

        await order.save();
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
