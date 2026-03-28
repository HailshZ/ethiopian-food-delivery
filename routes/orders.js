// routes/orders.js – Checkout, order placement, and order routes (no payment gateway)
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const Dish = require('../models/Dish');
const Notification = require('../models/Notification');
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
    res.render('checkout', {
        title: 'Checkout',
        cart
    });
});

// POST /api/validate-promo – Validate promo code
router.post('/api/validate-promo', isLoggedIn, async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        if (!code) return res.status(400).json({ error: 'Promo code is required' });

        const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });
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

// Haversine formula – calculate distance in km
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

// POST /api/calculate-delivery – Calculate delivery fee from customer location
router.post('/api/calculate-delivery', isLoggedIn, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

        const SystemSettings = require('../models/SystemSettings');
        const settings = await SystemSettings.getSettings();
        const rLat = settings.restaurantLocation.lat;
        const rLng = settings.restaurantLocation.lng;

        const distance = haversineDistance(rLat, rLng, parseFloat(lat), parseFloat(lng));
        const deliveryFee = settings.baseDeliveryFee + (distance * settings.deliveryFeePerKm);

        res.json({
            success: true,
            distance: Math.round(distance * 10) / 10,
            deliveryFee: Math.round(deliveryFee * 100) / 100,
            baseDeliveryFee: settings.baseDeliveryFee,
            perKmRate: settings.deliveryFeePerKm
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/place-order – Place order directly (no payment gateway)
router.post('/api/place-order', isLoggedIn, async (req, res) => {
    const { paymentMethod, amount, cart, shippingAddress, promoCode, deliveryLocation } = req.body;

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: 'Shipping address is required' });
    }

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
        // Calculate discount
        let discount = 0;
        let validPromoCode = '';
        if (promoCode) {
            const promo = await PromoCode.findOne({ code: promoCode.toUpperCase().trim() });
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

        const order = new Order({
            user: req.session.userId,
            items: cart.map(item => ({
                dishId: item.dishId,
                name: item.name,
                nameAm: item.nameAm,
                price: item.price,
                qty: item.qty,
                totalPrice: item.totalPrice,
                imageUrl: item.imageUrl
            })),
            totalAmount: amount,
            discount: discount,
            promoCode: validPromoCode,
            finalAmount: finalAmount,
            shippingAddress: shippingAddress,
            deliveryLocation: deliveryLocation || {},
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            estimatedDelivery: estimatedDelivery,
            deliveryUpdates: [{
                status: 'Order placed',
                timestamp: new Date(),
                note: 'Your order has been received and confirmed'
            }]
        });
        await order.save();

        // Notify dish owners about the new order
        try {
            const dishIds = cart.map(item => item.dishId).filter(Boolean);
            if (dishIds.length > 0) {
                const dishes = await Dish.find({ _id: { $in: dishIds }, owner: { $ne: null } });
                const ownerIds = [...new Set(dishes.map(d => d.owner.toString()))];
                for (const ownerId of ownerIds) {
                    const ownerDishes = dishes.filter(d => d.owner.toString() === ownerId);
                    const dishNames = ownerDishes.map(d => d.name).join(', ');
                    await Notification.create({
                        owner: ownerId,
                        type: 'new_order',
                        message: `🛒 New order received! Items: ${dishNames}. Total: ${finalAmount.toFixed(2)}`,
                        relatedOrder: order._id
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

        // Clear cart
        cartHelper.clearCart(req.session);

        res.json({
            success: true,
            orderId: order._id,
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
        const order = await Order.findById(req.params.id).populate('user', 'name email phone');
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

// GET /order-confirmation (legacy with tx_ref – redirect to home)
router.get('/order-confirmation', (req, res) => {
    res.redirect('/');
});

// GET /order/:id – Single order view
router.get('/order/:id', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send('Order not found');
        if (order.user.toString() !== req.session.userId.toString() && !req.session.isAdmin) {
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
        const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(20);
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