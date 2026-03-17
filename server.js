// server.js – Full version with Chapa local payments and shipping address
require('dotenv').config();

// ========== DEBUGGING: Check environment variables ==========
console.log('🔍 Environment variable check:');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI type:', typeof process.env.MONGO_URI);
console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
console.log('SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('STRIPE_PUBLIC_KEY exists:', !!process.env.STRIPE_PUBLIC_KEY);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('CHAPA_SECRET_KEY exists:', !!process.env.CHAPA_SECRET_KEY);
// ============================================================

const express = require('express');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const flash = require('connect-flash');
const cartHelper = require('./middleware/cart');
const bcrypt = require('bcrypt');
const Chapa = require('chapa-nodejs').Chapa;

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    // Session store
    const MongoStoreClass = connectMongo.MongoStore || connectMongo.default;
    const store = new MongoStoreClass({
      client: mongoose.connection.getClient(),
    });
    console.log('✅ Using MongoDB session store (constructor)');

    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: store,
      cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
    }));

    // Make session available to all views
    app.use((req, res, next) => {
      res.locals.session = req.session;
      next();
    });

    // Flash messages
    app.use(flash());

    // Make flash messages available to all views
    app.use((req, res, next) => {
      res.locals.success_msg = req.flash('success');
      res.locals.error_msg = req.flash('error');
      res.locals.error = req.flash('error');
      next();
    });

    // Basic middleware
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // Load translations
    let translations;
    try {
      translations = {
        en: JSON.parse(fs.readFileSync('./locales/en.json', 'utf8')),
        am: JSON.parse(fs.readFileSync('./locales/am.json', 'utf8'))
      };
      console.log('✅ Translations loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load translation files:', err.message);
      process.exit(1);
    }

    // Language middleware
    app.use((req, res, next) => {
      if (!req.session.language) req.session.language = 'en';
      res.locals.currentLanguage = req.session.language;
      res.locals.t = function(key) {
        return translations[req.session.language][key] || key;
      };
      next();
    });

    // Language switcher route
    app.post('/language', (req, res) => {
      const { language } = req.body;
      if (language === 'en' || language === 'am') {
        req.session.language = language;
      }
      res.redirect(req.get('Referrer') || '/');
    });

    // Require models after DB connection
    const Dish = require('./models/Dish');
    const User = require('./models/User');
    const Order = require('./models/Order');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Initialize Chapa
    const chapa = new Chapa({
      secretKey: process.env.CHAPA_SECRET_KEY
    });

    // ==================== SEED ROUTE ====================
    app.get('/seed', async (req, res) => {
      const sampleDishes = [
        {
          name: 'Doro Wat',
          nameAm: 'ዶሮ ወጥ',
          description: 'Spicy chicken stew with hard-boiled eggs, served with injera.',
          descriptionAm: 'በቅመም የተሰራ የዶሮ ወጥ ከእንቁላል ጋር፣ ከእንጀራ ጋር ይቀርባል።',
          price: 12.99,
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300'
        },
        {
          name: 'Kitfo',
          nameAm: 'ክትፎ',
          description: 'Minced raw beef seasoned with mitmita and niter kibbeh.',
          descriptionAm: 'በሚጥሚጣ እና በንጥር ቅቤ የተቀመመ የበሬ ሥጋ።',
          price: 14.99,
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300'
        },
        {
          name: 'Shiro',
          nameAm: 'ሽሮ',
          description: 'Creamy chickpea stew, often served with injera.',
          descriptionAm: 'ለስላሳ የሽምብራ ወጥ፣ ብዙውን ጊዜ ከእንጀራ ጋር ይቀርባል።',
          price: 8.99,
          category: 'food',
          imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300'
        },
        {
          name: 'Ethiopian Coffee',
          nameAm: 'ኢትዮጵያ ቡና',
          description: 'Traditional coffee ceremony style, rich and aromatic.',
          descriptionAm: 'በባህላዊ የቡና ስነ-ስርዓት የተዘጋጀ፣ ጥሩ መዓዛ ያለው።',
          price: 3.99,
          category: 'coffee',
          imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=300'
        }
      ];

      try {
        await Dish.deleteMany({});
        await Dish.insertMany(sampleDishes);
        res.send('✅ Sample dishes added!');
      } catch (err) {
        res.status(500).send('Error: ' + err.message);
      }
    });

    // ==================== MENU ROUTE ====================
    app.get('/menu', async (req, res) => {
      try {
        const dishes = await Dish.find({ isAvailable: true });
        res.render('menu', { title: 'Menu', dishes });
      } catch (err) {
        console.error('❌ Menu route error:', err);
        res.status(500).send('Error loading menu: ' + err.message);
      }
    });

    // ==================== CART ROUTES ====================
    app.post('/cart/add/:id', async (req, res) => {
      try {
        const dish = await Dish.findById(req.params.id);
        if (!dish) return res.status(404).send('Dish not found');
        cartHelper.addToCart(req.session, dish, 1);
        res.redirect('/menu');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }
    });

    app.get('/cart', (req, res) => {
      const cart = cartHelper.getCart(req.session);
      res.render('cart', { title: 'Your Cart', cart });
    });

    app.post('/cart/update/:id', (req, res) => {
      const { qty } = req.body;
      cartHelper.updateCartItem(req.session, req.params.id, parseInt(qty));
      res.redirect('/cart');
    });

    app.post('/cart/remove/:id', (req, res) => {
      cartHelper.removeFromCart(req.session, req.params.id);
      res.redirect('/cart');
    });

    // ==================== AUTH ROUTES ====================
    app.get('/register', (req, res) => {
      res.render('auth/register', { title: 'Register' });
    });

    app.post('/register', async (req, res) => {
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
          return res.render('auth/register', {
            title: 'Register',
            errors,
            name,
            email,
            phone
          });
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

    app.get('/login', (req, res) => {
      res.render('auth/login', { title: 'Login' });
    });

    app.post('/login', async (req, res) => {
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
        req.flash('success', 'Logged in successfully');
        res.redirect('/menu');
      } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/login');
      }
    });

    app.get('/logout', (req, res) => {
      req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect('/');
      });
    });

    app.get('/profile', async (req, res) => {
      if (!req.session.userId) {
        req.flash('error', 'Please log in to view your profile');
        return res.redirect('/login');
      }
      try {
        const user = await User.findById(req.session.userId).select('-password');
        const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(5);
        res.render('auth/profile', { title: 'Profile', user, orders });
      } catch (err) {
        console.error(err);
        res.redirect('/');
      }
    });

    // ==================== CHECKOUT & PAYMENT ====================
    app.get('/checkout', async (req, res) => {
      if (!req.session.userId) {
        req.flash('error', 'Please log in to checkout');
        return res.redirect('/login');
      }
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

    // ==================== CHAPA PAYMENT INITIATION ====================
    app.post('/api/initiate-payment', async (req, res) => {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Please log in first' });
      }

      const { paymentMethod, amount, cart, shippingAddress } = req.body;
      const user = await User.findById(req.session.userId);

      // Validate required fields
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: 'Shipping address is required' });
      }

      // Generate unique transaction reference
      const txRef = `${user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      try {
        // Prepare customer info
        const customerInfo = {
          email: user.email,
          first_name: user.name.split(' ')[0],
          last_name: user.name.split(' ').slice(1).join(' ') || 'Customer',
          phone_number: user.phone || '0911000000'
        };

        // Prepare custom data
        const customData = {
          cart: cart.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
            dishId: item.dishId
          })),
          userId: user._id.toString(),
          shippingAddress
        };

        // Initialize transaction with Chapa
        const response = await chapa.initialize({
          amount: amount,
          currency: 'ETB',
          email: customerInfo.email,
          first_name: customerInfo.first_name,
          last_name: customerInfo.last_name,
          phone_number: customerInfo.phone_number,
          tx_ref: txRef,
          callback_url: `${process.env.BASE_URL}/api/payment-callback`,
          return_url: `${process.env.BASE_URL}/order-confirmation?tx_ref=${txRef}`,
          customization: {
            title: 'EthioFood Delivery',
            description: 'Payment for your order'
          },
          meta: customData
        });

        if (response.status === 'success') {
          // Create order with pending payment status
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
            orderStatus: 'pending'
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
        console.error('Chapa error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== CHAPA PAYMENT CALLBACK ====================
    app.post('/api/payment-callback', async (req, res) => {
      const { tx_ref, status, amount, currency, meta } = req.body;

      try {
        // Verify the transaction with Chapa
        const verification = await chapa.verify(tx_ref);

        if (verification.status === 'success') {
          const order = await Order.findOne({ chapaTxRef: tx_ref });
          if (order) {
            order.paymentStatus = 'paid';
            order.orderStatus = 'confirmed';
            await order.save();
          }
        }
        res.sendStatus(200);
      } catch (error) {
        console.error('Callback error:', error);
        res.sendStatus(500);
      }
    });

    // ==================== ORDER CONFIRMATION (after return from Chapa) ====================
    app.get('/order-confirmation', async (req, res) => {
      const { tx_ref } = req.query;
      if (!tx_ref) {
        return res.redirect('/');
      }

      try {
        const order = await Order.findOne({ chapaTxRef: tx_ref }).populate('user', 'name email');
        if (!order) {
          return res.status(404).send('Order not found');
        }

        // Clear the cart after successful payment
        cartHelper.clearCart(req.session);

        res.render('order-confirmation', { title: 'Order Confirmation', order });
      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }
    });

    // ==================== ORDERS HISTORY ====================
    app.get('/orders', async (req, res) => {
      if (!req.session.userId) {
        req.flash('error', 'Please log in to view your orders');
        return res.redirect('/login');
      }
      try {
        const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(20);
        res.render('orders', { title: 'My Orders', orders });
      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }
    });

    // ==================== VIEW ENGINE SETUP ====================
    app.use(expressLayouts);
    app.set('view engine', 'ejs');
    app.set('layout', 'layouts/main');
    app.set('views', path.join(__dirname, 'views'));

    // ==================== HOME ROUTE ====================
    app.get('/', (req, res) => {
      res.render('index', { title: 'Home' });
    });

    // ==================== START SERVER ====================
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });