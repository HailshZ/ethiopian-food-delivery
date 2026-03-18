// routes/admin.js – Admin panel routes
const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const User = require('../models/User');
const MealPlan = require('../models/MealPlan');
const DailySpecial = require('../models/DailySpecial');
const Subscription = require('../models/Subscription');
const { isAdmin } = require('../middleware/auth');

// All admin routes require admin auth
router.use(isAdmin);

// GET /admin – Dashboard
router.get('/', async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalDishes = await Dish.countDocuments();
        const activeSubs = await Subscription.countDocuments({ status: 'active' });
        const recentOrders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10);
        const revenue = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: { totalOrders, totalUsers, totalDishes, activeSubs, totalRevenue },
            recentOrders
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ==================== DISHES CRUD ====================
router.get('/dishes', async (req, res) => {
    const dishes = await Dish.find().sort({ createdAt: -1 });
    res.render('admin/dishes', { title: 'Manage Dishes', dishes });
});

router.post('/dishes', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, category, imageUrl } = req.body;
        await Dish.create({ name, nameAm, description, descriptionAm, price: parseFloat(price), category, imageUrl });
        req.flash('success', 'Dish added successfully');
        res.redirect('/admin/dishes');
    } catch (err) {
        req.flash('error', 'Failed to add dish: ' + err.message);
        res.redirect('/admin/dishes');
    }
});

router.post('/dishes/:id/update', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, category, imageUrl, isAvailable } = req.body;
        await Dish.findByIdAndUpdate(req.params.id, {
            name, nameAm, description, descriptionAm,
            price: parseFloat(price), category, imageUrl,
            isAvailable: isAvailable === 'on' || isAvailable === 'true'
        });
        req.flash('success', 'Dish updated');
        res.redirect('/admin/dishes');
    } catch (err) {
        req.flash('error', 'Failed to update: ' + err.message);
        res.redirect('/admin/dishes');
    }
});

router.post('/dishes/:id/delete', async (req, res) => {
    try {
        await Dish.findByIdAndDelete(req.params.id);
        req.flash('success', 'Dish deleted');
        res.redirect('/admin/dishes');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/dishes');
    }
});

// API for AJAX
router.delete('/api/dishes/:id', async (req, res) => {
    try {
        await Dish.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== MEAL PLANS CRUD ====================
router.get('/meal-plans', async (req, res) => {
    const plans = await MealPlan.find().sort({ createdAt: -1 });
    const dishes = await Dish.find({ isAvailable: true });
    res.render('admin/meal-plans', { title: 'Manage Meal Plans', plans, dishes });
});

router.get('/meal-plans/new', async (req, res) => {
    const dishes = await Dish.find({ isAvailable: true });
    res.render('admin/meal-plan-form', { title: 'Create Meal Plan', plan: null, dishes });
});

router.get('/meal-plans/:id/edit', async (req, res) => {
    const plan = await MealPlan.findById(req.params.id);
    const dishes = await Dish.find({ isAvailable: true });
    res.render('admin/meal-plan-form', { title: 'Edit Meal Plan', plan, dishes });
});

router.post('/meal-plans', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, duration, imageUrl } = req.body;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const meals = {};

        days.forEach(day => {
            meals[day] = [];
            const dayDishes = req.body[`${day}_dishes`];
            const dayMealTypes = req.body[`${day}_mealTypes`];

            if (dayDishes) {
                const dishArr = Array.isArray(dayDishes) ? dayDishes : [dayDishes];
                const typeArr = Array.isArray(dayMealTypes) ? dayMealTypes : [dayMealTypes];
                dishArr.forEach((dishId, i) => {
                    if (dishId) {
                        meals[day].push({ dish: dishId, mealType: typeArr[i] || 'lunch' });
                    }
                });
            }
        });

        await MealPlan.create({
            name, nameAm, description, descriptionAm,
            price: parseFloat(price), duration, imageUrl, meals
        });
        req.flash('success', 'Meal plan created');
        res.redirect('/admin/meal-plans');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/meal-plans/new');
    }
});

router.post('/meal-plans/:id/update', async (req, res) => {
    try {
        const { name, nameAm, description, descriptionAm, price, duration, imageUrl, isActive } = req.body;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const meals = {};

        days.forEach(day => {
            meals[day] = [];
            const dayDishes = req.body[`${day}_dishes`];
            const dayMealTypes = req.body[`${day}_mealTypes`];

            if (dayDishes) {
                const dishArr = Array.isArray(dayDishes) ? dayDishes : [dayDishes];
                const typeArr = Array.isArray(dayMealTypes) ? dayMealTypes : [dayMealTypes];
                dishArr.forEach((dishId, i) => {
                    if (dishId) {
                        meals[day].push({ dish: dishId, mealType: typeArr[i] || 'lunch' });
                    }
                });
            }
        });

        await MealPlan.findByIdAndUpdate(req.params.id, {
            name, nameAm, description, descriptionAm,
            price: parseFloat(price), duration, imageUrl, meals,
            isActive: isActive === 'on' || isActive === 'true'
        });
        req.flash('success', 'Meal plan updated');
        res.redirect('/admin/meal-plans');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/meal-plans');
    }
});

router.post('/meal-plans/:id/delete', async (req, res) => {
    try {
        await MealPlan.findByIdAndDelete(req.params.id);
        req.flash('success', 'Meal plan deleted');
        res.redirect('/admin/meal-plans');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/meal-plans');
    }
});

// ==================== DAILY SPECIALS CRUD ====================
router.get('/daily-specials', async (req, res) => {
    const specials = await DailySpecial.find().populate('dish').sort({ dayOfWeek: 1 });
    const dishes = await Dish.find({ isAvailable: true });
    res.render('admin/daily-specials', { title: 'Daily Specials', specials, dishes });
});

router.post('/daily-specials', async (req, res) => {
    try {
        const { dayOfWeek, dish, specialPrice, description, descriptionAm } = req.body;
        await DailySpecial.create({
            dayOfWeek: parseInt(dayOfWeek), dish,
            specialPrice: parseFloat(specialPrice),
            description, descriptionAm
        });
        req.flash('success', 'Daily special added');
        res.redirect('/admin/daily-specials');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/daily-specials');
    }
});

router.post('/daily-specials/:id/update', async (req, res) => {
    try {
        const { dayOfWeek, dish, specialPrice, description, descriptionAm, isActive } = req.body;
        await DailySpecial.findByIdAndUpdate(req.params.id, {
            dayOfWeek: parseInt(dayOfWeek), dish,
            specialPrice: parseFloat(specialPrice),
            description, descriptionAm,
            isActive: isActive === 'on' || isActive === 'true'
        });
        req.flash('success', 'Special updated');
        res.redirect('/admin/daily-specials');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/daily-specials');
    }
});

router.post('/daily-specials/:id/delete', async (req, res) => {
    try {
        await DailySpecial.findByIdAndDelete(req.params.id);
        req.flash('success', 'Special deleted');
        res.redirect('/admin/daily-specials');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/daily-specials');
    }
});

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', async (req, res) => {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { orderStatus: status } : {};
    const orders = await Order.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 });
    res.render('admin/orders', { title: 'Manage Orders', orders, currentStatus: status || 'all' });
});

router.post('/orders/:id/status', async (req, res) => {
    try {
        const { orderStatus, paymentStatus, note } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send('Not found');

        if (orderStatus) order.orderStatus = orderStatus;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        order.deliveryUpdates.push({
            status: orderStatus || order.orderStatus,
            timestamp: new Date(),
            note: note || `Status changed to ${orderStatus}`
        });
        await order.save();

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        req.flash('success', 'Order updated');
        res.redirect('/admin/orders');
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/admin/orders');
    }
});

// ==================== SUBSCRIPTIONS MANAGEMENT ====================
router.get('/subscriptions', async (req, res) => {
    const subs = await Subscription.find()
        .populate('user', 'name email')
        .populate('mealPlan', 'name price')
        .sort({ createdAt: -1 });
    res.render('admin/subscriptions', { title: 'Manage Subscriptions', subscriptions: subs });
});

// ==================== SEED ROUTE ====================
router.get('/seed', async (req, res) => {
    const sampleDishes = [
        {
            name: 'Doro Wat', nameAm: 'ዶሮ ወጥ',
            description: 'Spicy chicken stew with hard-boiled eggs, served with injera.',
            descriptionAm: 'በቅመም የተሰራ የዶሮ ወጥ ከእንቁላል ጋር፣ ከእንጀራ ጋር ይቀርባል።',
            price: 12.99, category: 'food',
            imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
        },
        {
            name: 'Kitfo', nameAm: 'ክትፎ',
            description: 'Minced raw beef seasoned with mitmita and niter kibbeh.',
            descriptionAm: 'በሚጥሚጣ እና በንጥር ቅቤ የተቀመመ የበሬ ሥጋ።',
            price: 14.99, category: 'food',
            imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
        },
        {
            name: 'Shiro', nameAm: 'ሽሮ',
            description: 'Creamy chickpea stew, often served with injera.',
            descriptionAm: 'ለስላሳ የሽምብራ ወጥ፣ ብዙውን ጊዜ ከእንጀራ ጋር ይቀርባል።',
            price: 8.99, category: 'food',
            imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
        },
        {
            name: 'Ethiopian Coffee', nameAm: 'ኢትዮጵያ ቡና',
            description: 'Traditional coffee ceremony style, rich and aromatic.',
            descriptionAm: 'በባህላዊ የቡና ስነ-ስርዓት የተዘጋጀ፣ ጥሩ መዓዛ ያለው።',
            price: 3.99, category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400'
        },
        {
            name: 'Tibs', nameAm: 'ጥብስ',
            description: 'Sautéed meat with vegetables, peppers and onions.',
            descriptionAm: 'ከአትክልት፣ ከበርበሬ እና ከሽንኩርት ጋር የተጠበሰ ሥጋ።',
            price: 13.99, category: 'food',
            imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
        },
        {
            name: 'Firfir', nameAm: 'ፍርፍር',
            description: 'Shredded injera mixed in spicy sauce, a popular breakfast dish.',
            descriptionAm: 'በቅመማ ቅመም ውስጥ የተቀላቀለ የእንጀራ ፍርፍር።',
            price: 7.99, category: 'food',
            imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400'
        },
        {
            name: 'Fresh Juice', nameAm: 'ጁስ',
            description: 'Mixed fresh fruit juice, Ethiopian style layered.',
            descriptionAm: 'በኢትዮጵያ ዘይቤ የተደረደረ ትኩስ የፍራፍሬ ጭማቂ።',
            price: 4.99, category: 'drink',
            imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400'
        },
        {
            name: 'Macchiato', nameAm: 'ማኪያቶ',
            description: 'Ethiopian-style espresso with foamed milk.',
            descriptionAm: 'በኢትዮጵያ ዘይቤ ኤስፕሬሶ ከወተት ፎም ጋር።',
            price: 2.99, category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400'
        }
    ];

    try {
        await Dish.deleteMany({});
        await Dish.insertMany(sampleDishes);
        req.flash('success', '✅ Sample dishes added!');
        res.redirect('/admin/dishes');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// Create admin user if none exists
router.get('/create-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ isAdmin: true });
        if (adminExists) {
            return res.send('Admin already exists. Login with admin credentials.');
        }
        const admin = new User({
            name: 'Admin',
            email: 'admin@ethiofood.com',
            password: 'admin123',
            isAdmin: true
        });
        await admin.save();
        res.send('✅ Admin created: admin@ethiofood.com / admin123');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

module.exports = router;
