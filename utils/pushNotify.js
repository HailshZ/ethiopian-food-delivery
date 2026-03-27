// utils/pushNotify.js – Web Push notification helper
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID (only if keys are set)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@ethiofood.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send a push notification to all subscriptions for a given user.
 * @param {string} userId – MongoDB user ID
 * @param {object} payload – { title, body, icon, url }
 */
async function sendPushToUser(userId, payload) {
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.log('⚠️  VAPID keys not set – skipping push notification');
        return;
    }

    try {
        const subs = await PushSubscription.find({ user: userId });
        if (subs.length === 0) return;

        const payloadStr = JSON.stringify(payload);

        const results = await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(sub.subscription, payloadStr)
            )
        );

        // Clean up stale / expired subscriptions (410 Gone)
        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                const err = results[i].reason;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await PushSubscription.findByIdAndDelete(subs[i]._id);
                    console.log(`🗑️ Removed stale push subscription ${subs[i]._id}`);
                } else {
                    console.error('Push send error:', err.message);
                }
            }
        }
    } catch (err) {
        console.error('❌ Push notification error:', err.message);
    }
}

module.exports = { sendPushToUser };
