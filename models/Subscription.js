const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mealPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', required: true },
    status: {
        type: String,
        enum: ['active', 'paused', 'cancelled', 'expired'],
        default: 'active'
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true }
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    chapaTxRef: { type: String },
    totalPaid: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
