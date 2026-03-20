// routes/orders.js – Checkout, payment, and order routes (with promo codes and email)
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const cartHelper = require('../middleware/cart');
const { isLoggedIn } = require('../middleware/auth');
const Chapa = require('chapa-nodejs').Chapa;
const { sendOrderConfirmation } = require('../utils/email');

const chapa = new Chapa({ secretKey: process.env.CHAPA_SECRET_KEY || '' });
const USD_TO_ETB_RATE = parseFloat(process.env.USD_TO_ETB_RATE) || 55;

// GET /checkout
router.get('/checkout', isLoggedIn, async (req, res) => {
    const cart = cartHelper.getCart(req.session);
    if (cart.items.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/menu');
    }
    res.render('checkout', {
        title: 'Checkout',
        cart,
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY
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

// POST /api/initiate-payment – Chapa payment with promo support
router.post('/api/initiate-payment', isLoggedIn, async (req, res) => {
    const { paymentMethod, amount, cart, shippingAddress, promoCode } = req.body;
    const user = await User.findById(req.session.userId);

    console.log('========== CHAPA PAYLOAD DEBUG ==========');
    console.log('User ID:', req.session.userId);
    console.log('Payment Method:', paymentMethod);
    console.log('Original amount:', amount, typeof amount);
    console.log('Promo Code:', promoCode);

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: 'Shipping address is required' });
    }

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
                // Increment usage
                promo.usedCount += 1;
                await promo.save();
            }
        }
    }

    const finalAmount = amount - discount;
    console.log('Discount:', discount, 'Final Amount:', finalAmount);

    const txRef = `order-${user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Convert amount to ETB for Chapa
        let amountETB = finalAmount;
        if (req.session.currency !== 'ETB') {
            amountETB = finalAmount * USD_TO_ETB_RATE;
        }

        const amountInCents = Math.round(amountETB * 100);
        const amountStr = String(amountInCents);

        const formattedPhone = '0911000000';

        const customerInfo = {
            email: String(user.email),
            first_name: String(user.name.split(' ')[0] || 'Customer'),
            last_name: String(user.name.split(' ').slice(1).join(' ') || 'Name'),
            phone_number: formattedPhone
        };

        const payload = {
            amount: amountStr,
            currency: 'ETB',
            email: customerInfo.email,
            first_name: customerInfo.first_name,
            last_name: customerInfo.last_name,
            phone_number: customerInfo.phone_number,
            tx_ref: txRef,
            callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment-callback`,
            return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/order-confirmation?tx_ref=${txRef}`,
            customization: {
                title: 'EthioFood Delivery',
                description: 'Payment for your order'
            }
        };

        function deepStringify(obj) {
            if (obj === null || obj === undefined) return '';
            if (typeof obj === 'string') return obj;
            if (typeof obj === 'number') return String(obj);
            if (typeof obj === 'boolean') return String(obj);
            if (Array.isArray(obj)) return obj.map(item => deepStringify(item));
            if (typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                    result[key] = deepStringify(obj[key]);
                }
                return result;
            }
            return String(obj);
        }

        const finalPayload = deepStringify(payload);
        const response = await chapa.initialize(finalPayload);

        if (response.status === 'success') {
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
                paymentMethod: paymentMethod,
                chapaTxRef: txRef,
                paymentStatus: 'pending',
                orderStatus: 'pending',
                estimatedDelivery: estimatedDelivery,
                deliveryUpdates: [{
                    status: 'Order placed',
                    timestamp: new Date(),
                    note: 'Your order has been received'
                }]
            });
            await order.save();

            res.json({
                success: true,
                checkoutUrl: response.data.checkout_url
            });
        } else {
            res.status(400).json({ error: 'Payment initiation failed' });
        }
    } catch (error) {
        console.error('Chapa error caught:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/payment-callback – Chapa webhook
router.post('/api/payment-callback', async (req, res) => {
    const { tx_ref } = req.body;

    try {
        const verification = await chapa.verify(tx_ref);

        if (verification.status === 'success') {
            const order = await Order.findOne({ chapaTxRef: tx_ref }).populate('user', 'name email');
            if (order) {
                order.paymentStatus = 'paid';
                order.orderStatus = 'confirmed';
                order.deliveryUpdates.push({
                    status: 'Payment confirmed',
                    timestamp: new Date(),
                    note: 'Payment verified successfully'
                });
                await order.save();

                // Send confirmation email
                if (order.user) {
                    const SystemSettings = require('../models/SystemSettings');
                    const settings = await SystemSettings.getSettings();
                    sendOrderConfirmation(order, order.user, settings);
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Callback error:', error);
        res.sendStatus(500);
    }
});

// GET /order-confirmation
router.get('/order-confirmation', async (req, res) => {
    const { tx_ref } = req.query;
    if (!tx_ref) return res.redirect('/');

    try {
        const order = await Order.findOne({ chapaTxRef: tx_ref }).populate('user', 'name email');
        if (!order) return res.status(404).send('Order not found');

        cartHelper.clearCart(req.session);

        // Send confirmation email if not sent yet (fallback for when callback didn't fire)
        if (order.user && order.paymentStatus !== 'paid') {
            const SystemSettings = require('../models/SystemSettings');
            const settings = await SystemSettings.getSettings();
            sendOrderConfirmation(order, order.user, settings);
        }

        res.render('order-confirmation', { title: 'Order Confirmation', order });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
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

// GET /orders – with error handling callback
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