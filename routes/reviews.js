// routes/reviews.js – User Reviews & Ratings (Sequelize)
const express = require('express');
const router = express.Router();
const { Review, Dish, Order, OrderItem, User, sequelize } = require('../models');
const { isLoggedIn } = require('../middleware/auth');

// GET /review/:orderId
router.get('/review/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.orderId, {
            include: [{ model: OrderItem, as: 'items' }]
        });
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        if (order.userId !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/orders');
        }
        if (order.orderStatus !== 'delivered') {
            req.flash('error', 'You can only review delivered orders');
            return res.redirect('/orders');
        }

        const existingReviews = await Review.findAll({
            where: { orderId: order.id, userId: req.session.userId }
        });
        const reviewedDishIds = existingReviews.map(r => r.dishId.toString());

        res.render('review-form', {
            title: 'Leave a Review',
            order,
            existingReviews,
            reviewedDishIds
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading review form');
        res.redirect('/orders');
    }
});

// POST /review/:orderId
router.post('/review/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.orderId);
        if (!order || order.userId !== req.session.userId) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/orders');
        }
        if (order.orderStatus !== 'delivered') {
            req.flash('error', 'You can only review delivered orders');
            return res.redirect('/orders');
        }

        const { ratings, comments } = req.body;

        if (ratings && typeof ratings === 'object') {
            for (const dishId of Object.keys(ratings)) {
                const rating = parseInt(ratings[dishId]);
                if (!rating || rating < 1 || rating > 5) continue;

                const existing = await Review.findOne({
                    where: { userId: req.session.userId, dishId: parseInt(dishId), orderId: order.id }
                });
                if (existing) continue;

                await Review.create({
                    userId: req.session.userId,
                    dishId: parseInt(dishId),
                    orderId: order.id,
                    rating: rating,
                    comment: (comments && comments[dishId]) || ''
                });

                // Update dish average rating
                const result = await Review.findAll({
                    where: { dishId: parseInt(dishId) },
                    attributes: [
                        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    raw: true
                });
                const avgRating = Math.round(parseFloat(result[0].avgRating || 0) * 10) / 10;
                const count = parseInt(result[0].count || 0);
                await Dish.update(
                    { averageRating: avgRating, reviewCount: count },
                    { where: { id: parseInt(dishId) } }
                );
            }
        }

        order.isReviewed = true;
        await order.save();

        req.flash('success', 'Thank you for your review!');
        res.redirect('/orders');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error submitting review');
        res.redirect(`/review/${req.params.orderId}`);
    }
});

// API: Get reviews for a dish
router.get('/api/reviews/:dishId', async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { dishId: req.params.dishId },
            include: [{ model: User, as: 'user', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
