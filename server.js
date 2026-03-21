
// server.js – EthioFood Delivery (Refactored with new features)
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const flash = require('connect-flash');
const DailySpecial = require('./models/DailySpecial');
const MealPlan = require('./models/MealPlan');
const SystemSettings = require('./models/SystemSettings');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    // Session store
    const store = new (connectMongo.MongoStore || connectMongo.default)({
      client: mongoose.connection.getClient(),
    });

    app.use(session({
      secret: process.env.SESSION_SECRET || 'ethiofood-secret-key',
      resave: false,
      saveUninitialized: false,
      store: store,
      cookie: { maxAge: 1000 * 60 * 60 * 24 }
    }));

    // Make session available to all views
    app.use((req, res, next) => {
      res.locals.session = req.session;
      next();
    });

    // Flash messages
    app.use(flash());
    app.use((req, res, next) => {
      res.locals.success_msg = req.flash('success');
      res.locals.error_msg = req.flash('error');
      res.locals.error = req.flash('error');
      next();
    });

    // Body parsing & static
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
    } catch (err) {
      console.error('❌ Failed to load translations:', err.message);
      process.exit(1);
    }

    // Language middleware
    app.use((req, res, next) => {
      if (!req.session.language) req.session.language = 'en';
      res.locals.currentLanguage = req.session.language;
      res.locals.t = function (key) {
        return (translations[req.session.language] && translations[req.session.language][key]) || key;
      };
      next();
    });

    // System settings middleware – load settings for all views
    app.use(async (req, res, next) => {
      try {
        const settings = await SystemSettings.getSettings();
        res.locals.settings = settings;
      } catch (err) {
        res.locals.settings = {
          systemName: 'EthioFood Delivery',
          currency: 'ETB',
          currencySymbol: 'ETB',
          currencyPosition: 'left',
          contactEmail: 'info@ethiofood.com',
          contactPhone: '+251 912 345 678',
          address: 'Addis Ababa, Ethiopia',
          deliveryFeePerKm: 15,
          baseDeliveryFee: 20,
          minOrderAmount: 100,
          restaurantLocation: { lat: 9.0192, lng: 38.7525 }
        };
      }
      // Global currency format helper
      res.locals.formatPrice = (amount) => {
        const s = res.locals.settings;
        const sym = s.currencySymbol || 'ETB';
        const val = typeof amount === 'number' ? amount.toFixed(2) : amount;
        return (s.currencyPosition === 'right') ? `${val} ${sym}` : `${sym} ${val}`;
      };
      next();
    });

    // Language switcher
    app.post('/language', (req, res) => {
      const { language } = req.body;
      if (language === 'en' || language === 'am') {
        req.session.language = language;
      }
      res.redirect(req.get('Referrer') || '/');
    });

    // View engine
    app.use(expressLayouts);
    app.set('view engine', 'ejs');
    app.set('layout', 'layouts/main');
    app.set('views', path.join(__dirname, 'views'));

    // Home route
    app.get('/', async (req, res) => {
      try {
        const today = new Date().getDay();
        const todaysSpecials = await DailySpecial.find({ dayOfWeek: today, isActive: true }).populate('dish');
        const featuredPlans = await MealPlan.find({ isActive: true }).limit(3);
        res.render('index', { title: 'Home', todaysSpecials, featuredPlans });
      } catch (err) {
        res.render('index', { title: 'Home', todaysSpecials: [], featuredPlans: [] });
      }
    });

    // Setup admin route (no auth required - one time setup)
    app.get('/setup-admin', async (req, res) => {
      try {
        const User = require('./models/User');
        const adminExists = await User.findOne({ isAdmin: true });
        if (adminExists) {
          return res.send('Admin already exists. Login with admin credentials.');
        }
        const admin = new User({
          name: 'Admin',
          email: 'admin@ethiofood.com',
          password: 'admin123',
          isAdmin: true,
          role: 'admin'
        });
        await admin.save();
        res.send('✅ Admin created: admin@ethiofood.com / admin123');
      } catch (err) {
        res.status(500).send('Error: ' + err.message);
      }
    });

    // Setup superadmin route
    app.get('/setup-superadmin', async (req, res) => {
      try {
        const User = require('./models/User');
        const superExists = await User.findOne({ role: 'superadmin' });
        if (superExists) {
          return res.send('Super Admin already exists. Login with superadmin credentials.');
        }
        const superadmin = new User({
          name: 'Super Admin',
          email: 'superadmin@ethiofood.com',
          password: 'super123',
          isAdmin: true,
          role: 'superadmin'
        });
        await superadmin.save();
        res.send('✅ Super Admin created: superadmin@ethiofood.com / super123');
      } catch (err) {
        res.status(500).send('Error: ' + err.message);
      }
    });

    // Mount route modules
    app.use('/', require('./routes/auth'));
    app.use('/', require('./routes/menu'));
    app.use('/', require('./routes/cart'));
    app.use('/', require('./routes/orders'));
    app.use('/', require('./routes/subscription'));
    app.use('/', require('./routes/delivery'));
    app.use('/', require('./routes/reviews'));
    app.use('/owner', require('./routes/owner'));
    app.use('/admin', require('./routes/admin'));
    app.use('/superadmin', require('./routes/superadmin'));

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
