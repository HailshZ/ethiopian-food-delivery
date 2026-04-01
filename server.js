// server.js – EthioFood Delivery (PostgreSQL/Sequelize + cPanel ready)
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const flash = require('connect-flash');
const { sequelize, DailySpecial, MealPlan, SystemSettings, Dish, MealSlot, User } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool for session store
const pgPool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'ethiofood',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || ''
});

async function startApp() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // Sync tables (use { alter: true } in dev for schema updates)
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('✅ Database tables synced');

    // Session store
    app.use(session({
      store: new PgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || 'ethiofood-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 24 }
    }));

    // Make session available to all views
    app.use((req, res, next) => {
      res.locals.session = req.session;
      res.locals.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
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

    // Load translations (use __dirname for reliable paths on cPanel)
    let translations;
    try {
      translations = {
        en: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8')),
        am: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'am.json'), 'utf8'))
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

    // System settings middleware
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
          restaurantLat: 9.0192,
          restaurantLng: 38.7525
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
        const todaysSpecials = await DailySpecial.findAll({
          where: { dayOfWeek: today, isActive: true },
          include: [{ model: Dish, as: 'dish' }]
        });
        const { Op } = require('sequelize');
        const featuredPlans = await MealPlan.findAll({
          where: {
            isActive: true,
            approvalStatus: { [Op.in]: ['approved'] }
          },
          limit: 3
        });
        res.render('index', { title: 'Home', todaysSpecials, featuredPlans });
      } catch (err) {
        res.render('index', { title: 'Home', todaysSpecials: [], featuredPlans: [] });
      }
    });

    // Setup admin route
    app.get('/setup-admin', async (req, res) => {
      try {
        const adminExists = await User.findOne({ where: { isAdmin: true } });
        if (adminExists) {
          return res.send('Admin already exists. Login with admin credentials.');
        }
        await User.create({
          name: 'Admin',
          email: 'admin@ethiofood.com',
          password: 'admin123',
          phone: '+251900000001',
          isAdmin: true,
          role: 'admin'
        });
        res.send('✅ Admin created: admin@ethiofood.com / admin123');
      } catch (err) {
        res.status(500).send('Error: ' + err.message);
      }
    });

    // Setup superadmin route
    app.get('/setup-superadmin', async (req, res) => {
      try {
        const superExists = await User.findOne({ where: { role: 'superadmin' } });
        if (superExists) {
          return res.send('Super Admin already exists. Login with superadmin credentials.');
        }
        await User.create({
          name: 'Super Admin',
          email: 'superadmin@ethiofood.com',
          password: 'super123',
          phone: '+251900000000',
          isAdmin: true,
          role: 'superadmin'
        });
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

    // Start server (only when run directly, not via Passenger)
    if (!module.parent) {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        const { startScheduler } = require('./utils/scheduler');
        startScheduler();
      });
    }
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
}

// Start the app
startApp();

// Export for Passenger (app.js)
module.exports = app;
