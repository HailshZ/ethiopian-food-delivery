// routes/delivery.js – Delivery tracking routes (Sequelize)
const express = require('express');
const router = express.Router();
const { Order, DeliveryUpdate } = require('../models');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

// GET /delivery/:orderId
router.get('/delivery/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.orderId, {
            include: [{ model: DeliveryUpdate, as: 'deliveryUpdates', order: [['timestamp', 'ASC']] }]
        });
        if (!order) return res.status(404).send('Order not found');
        if (order.userId !== req.session.userId && !req.session.isAdmin) {
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
        const order = await Order.findByPk(req.params.orderId, {
            attributes: ['orderStatus', 'deliveryLat', 'deliveryLng', 'estimatedDelivery'],
            include: [{ model: DeliveryUpdate, as: 'deliveryUpdates', order: [['timestamp', 'ASC']] }]
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({
            success: true,
            status: order.orderStatus,
            location: { lat: parseFloat(order.deliveryLat), lng: parseFloat(order.deliveryLng) },
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
        const order = await Order.findByPk(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (status) order.orderStatus = status;
        if (lat && lng) {
            order.deliveryLat = lat;
            order.deliveryLng = lng;
        }
        await order.save();

        await DeliveryUpdate.create({
            orderId: order.id,
            status: status || order.orderStatus,
            locationLat: lat || order.deliveryLat,
            locationLng: lng || order.deliveryLng,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`
        });

        // Re-fetch with updates
        const updated = await Order.findByPk(order.id, {
            include: [{ model: DeliveryUpdate, as: 'deliveryUpdates', order: [['timestamp', 'ASC']] }]
        });
        res.json({ success: true, order: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
