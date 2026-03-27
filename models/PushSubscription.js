// models/PushSubscription.js – Browser push subscription storage
const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscription: {
        endpoint: { type: String, required: true },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true }
        }
    }
}, {
    timestamps: true
});

// One subscription per endpoint per user
pushSubscriptionSchema.index({ user: 1, 'subscription.endpoint': 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
