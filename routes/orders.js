// routes/orders.js – Checkout, order placement (Sequelize)
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Order, OrderItem, DeliveryUpdate, User, PromoCode, Dish, Notification, SystemSettings } = require('../models');
const cartHelper = require('../middleware/cart');
const { isLoggedIn } = require('../middleware/auth');
const { sendPushToUser } = require('../utils/pushNotify');

// GET /checkout
router.get('/checkout', isLoggedIn, async (req, res) => {
    const cart = cartHelper.getCart(req.session);
    if (cart.items.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/menu');
    }
    res.render('checkout', { title: 'Checkout', cart });
});

// POST /api/validate-promo
router.post('/api/validate-promo', isLoggedIn, async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        if (!code) return res.status(400).json({ error: 'Promo code is required' });

        const promo = await PromoCode.findOne({ where: { code: code.toUpperCase().trim() } });
        if (!promo) return res.status(404).json({ error: 'Invalid promo code' });

        const validation = promo.isValid(orderAmount);
        if (!validation.valid) return res.status(400).json({ error: validation.reason });

        const discount = promo.calculateDiscount(orderAmount);
        res.json({
            success: true,
            discount,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            finalAmount: orderAmount - discount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Haversine formula
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// POST /api/calculate-delivery
router.post('/api/calculate-delivery', isLoggedIn, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

        const settings = await SystemSettings.getSettings();
        const rLat = parseFloat(settings.restaurantLat);
        const rLng = parseFloat(settings.restaurantLng);

        const distance = haversineDistance(rLat, rLng, parseFloat(lat), parseFloat(lng));
        const deliveryFee = parseFloat(settings.baseDeliveryFee) + (distance * parseFloat(settings.deliveryFeePerKm));

        res.json({
            success: true,
            distance: Math.round(distance * 10) / 10,
            deliveryFee: Math.round(deliveryFee * 100) / 100,
            baseDeliveryFee: parseFloat(settings.baseDeliveryFee),
            perKmRate: parseFloat(settings.deliveryFeePerKm)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/place-order
router.post('/api/place-order', isLoggedIn, async (req, res) => {
    const { paymentMethod, amount, cart, shippingAddress, promoCode, deliveryLocation } = req.body;

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: 'Shipping address is required' });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
        let discount = 0;
        let validPromoCode = '';
        if (promoCode) {
            const promo = await PromoCode.findOne({ where: { code: promoCode.toUpperCase().trim() } });
            if (promo) {
                const validation = promo.isValid(amount);
                if (validation.valid) {
                    discount = promo.calculateDiscount(amount);
                    validPromoCode = promo.code;
                    promo.usedCount += 1;
                    await promo.save();
                }
            }
        }

        const finalAmount = amount - discount;
        const estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000);

        const order = await Order.create({
            userId: req.session.userId,
            totalAmount: amount,
            discount: discount,
            promoCode: validPromoCode,
            finalAmount: finalAmount,
            shippingStreet: shippingAddress.street,
            shippingCity: shippingAddress.city,
            shippingZipCode: shippingAddress.zipCode,
            deliveryLat: deliveryLocation?.lat || 9.0192,
            deliveryLng: deliveryLocation?.lng || 38.7525,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            estimatedDelivery: estimatedDelivery
        });

        // Create order items
        for (const item of cart) {
            await OrderItem.create({
                orderId: order.id,
                dishId: item.dishId,
                name: item.name,
                nameAm: item.nameAm,
                price: item.price,
                qty: item.qty,
                totalPrice: item.totalPrice,
                imageUrl: item.imageUrl
            });
        }

        // Create initial delivery update
        await DeliveryUpdate.create({
            orderId: order.id,
            status: 'Order placed',
            timestamp: new Date(),
            note: 'Your order has been received and confirmed'
        });

        // Notify dish owners
        try {
            const dishIds = cart.map(item => item.dishId).filter(Boolean);
            if (dishIds.length > 0) {
                const dishes = await Dish.findAll({
                    where: { id: { [Op.in]: dishIds }, ownerId: { [Op.ne]: null } }
                });
                const ownerIds = [...new Set(dishes.map(d => d.ownerId))];
                for (const ownerId of ownerIds) {
                    const ownerDishes = dishes.filter(d => d.ownerId === ownerId);
                    const dishNames = ownerDishes.map(d => d.name).join(', ');
                    await Notification.create({
                        ownerId: ownerId,
                        type: 'new_order',
                        message: `🛒 New order received! Items: ${dishNames}. Total: ${finalAmount.toFixed(2)}`,
                        relatedOrderId: order.id
                    });
                    sendPushToUser(ownerId, {
                        title: '🛒 New Order!',
                        body: `Items: ${dishNames}. Total: ${finalAmount.toFixed(2)}`,
                        icon: '/images/icon-192.png',
                        url: '/owner/orders'
                    });
                }
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr.message);
        }

        cartHelper.clearCart(req.session);

        res.json({
            success: true,
            orderId: order.id,
            message: 'Order placed successfully!'
        });
    } catch (error) {
        console.error('Order placement error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /order-confirmation/:id
router.get('/order-confirmation/:id', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
                { model: OrderItem, as: 'items' }
            ]
        });
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/');
        }
        res.render('order-confirmation', { title: 'Order Confirmed!', order });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /order-confirmation (legacy)
router.get('/order-confirmation', (req, res) => {
    res.redirect('/');
});

// GET /order/:id
router.get('/order/:id', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: DeliveryUpdate, as: 'deliveryUpdates', order: [['timestamp', 'ASC']] }
            ]
        });
        if (!order) return res.status(404).send('Order not found');
        if (order.userId !== req.session.userId && !req.session.isAdmin) {
            return res.status(403).send('Unauthorized');
        }
        res.render('order-detail', {
            title: 'Order Details',
            order,
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET /orders
router.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { userId: req.session.userId },
            include: [{ model: OrderItem, as: 'items' }],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        res.render('orders', { title: 'My Orders', orders }, (err, html) => {
            if (err) {
                console.error('❌ Error rendering orders.ejs:', err);
                return res.status(500).send('Error rendering orders page: ' + err.message);
            }
            res.send(html);
        });
    } catch (err) {
        console.error('❌ Error in /orders route:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;