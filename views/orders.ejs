// routes/orders.js – Checkout, payment, and order routes (with deep string conversion)
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const cartHelper = require('../middleware/cart');
const { isLoggedIn } = require('../middleware/auth');
const Chapa = require('chapa-nodejs').Chapa;

const chapa = new Chapa({ secretKey: process.env.CHAPA_SECRET_KEY || '' });

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

// POST /api/initiate-payment – Chapa payment with deep string conversion
router.post('/api/initiate-payment', isLoggedIn, async (req, res) => {
    const { paymentMethod, amount, cart, shippingAddress } = req.body;
    const user = await User.findById(req.session.userId);

    console.log('========== CHAPA PAYLOAD DEBUG ==========');
    console.log('User ID:', req.session.userId);
    console.log('Payment Method:', paymentMethod);
    console.log('Original amount:', amount, typeof amount);
    console.log('Cart items count:', cart ? cart.length : 0);
    console.log('Shipping Address:', shippingAddress);

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: 'Shipping address is required' });
    }

    const txRef = `order-${user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log('txRef:', txRef);

    try {
        // Convert amount to integer cents and ensure it's a string
        const amountInCents = Math.round(amount * 100);
        const amountStr = String(amountInCents);
        console.log('amountStr (cents):', amountStr, typeof amountStr);

        // Use a hardcoded valid phone number for testing (Chapa requires 09 or 07 format)
        const formattedPhone = '0911000000';
        console.log('Phone (hardcoded):', formattedPhone, typeof formattedPhone);

        // Prepare customer info – all fields as strings
        const customerInfo = {
            email: String(user.email),
            first_name: String(user.name.split(' ')[0] || 'Customer'),
            last_name: String(user.name.split(' ').slice(1).join(' ') || 'Name'),
            phone_number: formattedPhone
        };
        console.log('Customer Info:', customerInfo);

        // Build the payload
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

        // Deep stringify function to ensure no numbers survive
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

        console.log('Final Payload (all strings):', JSON.stringify(finalPayload, null, 2));
        console.log('Type checks after conversion:');
        console.log('amount type:', typeof finalPayload.amount);
        console.log('email type:', typeof finalPayload.email);
        console.log('phone type:', typeof finalPayload.phone_number);
        console.log('tx_ref type:', typeof finalPayload.tx_ref);

        const response = await chapa.initialize(finalPayload);
        console.log('Chapa response:', response);

        if (response.status === 'success') {
            // Set estimated delivery (45 mins from now)
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
            console.log('Order saved with txRef:', txRef);

            res.json({
                success: true,
                checkoutUrl: response.data.checkout_url
            });
        } else {
            console.log('Payment initiation failed, response:', response);
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
        console.log('Verification result:', verification);

        if (verification.status === 'success') {
            const order = await Order.findOne({ chapaTxRef: tx_ref });
            if (order) {
                order.paymentStatus = 'paid';
                order.orderStatus = 'confirmed';
                order.deliveryUpdates.push({
                    status: 'Payment confirmed',
                    timestamp: new Date(),
                    note: 'Payment verified successfully'
                });
                await order.save();
                console.log('Order updated:', order._id);
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

// GET /orders
router.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(20);
        res.render('orders', { title: 'My Orders', orders });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;