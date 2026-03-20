// routes/reviews.js – User Reviews & Ratings
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const { isLoggedIn } = require('../middleware/auth');

// GET /review/:orderId – Review form page
router.get('/review/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/orders');
        }
        if (order.user.toString() !== req.session.userId.toString()) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/orders');
        }
        if (order.orderStatus !== 'delivered') {
            req.flash('error', 'You can only review delivered orders');
            return res.redirect('/orders');
        }

        // Get existing reviews for this order
        const existingReviews = await Review.find({ order: order._id, user: req.session.userId });
        const reviewedDishIds = existingReviews.map(r => r.dish.toString());

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

// POST /review/:orderId – Submit review
router.post('/review/:orderId', isLoggedIn, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order || order.user.toString() !== req.session.userId.toString()) {
            req.flash('error', 'Unauthorized');
            return res.redirect('/orders');
        }
        if (order.orderStatus !== 'delivered') {
            req.flash('error', 'You can only review delivered orders');
            return res.redirect('/orders');
        }

        const { ratings, comments } = req.body;

        // ratings and comments are objects keyed by dishId
        if (ratings && typeof ratings === 'object') {
            for (const dishId of Object.keys(ratings)) {
                const rating = parseInt(ratings[dishId]);
                if (!rating || rating < 1 || rating > 5) continue;

                // Check if already reviewed
                const existing = await Review.findOne({ user: req.session.userId, dish: dishId, order: order._id });
                if (existing) continue;

                // Create review
                const review = new Review({
                    user: req.session.userId,
                    dish: dishId,
                    order: order._id,
                    rating: rating,
                    comment: (comments && comments[dishId]) || ''
                });
                await review.save();

                // Update dish average rating
                const allReviews = await Review.find({ dish: dishId });
                const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
                await Dish.findByIdAndUpdate(dishId, {
                    averageRating: Math.round(avgRating * 10) / 10,
                    reviewCount: allReviews.length
                });
            }
        }

        // Mark order as reviewed
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
        const reviews = await Review.find({ dish: req.params.dishId })
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
