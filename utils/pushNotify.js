// utils/pushNotify.js – Web Push notification helper (Sequelize)
const webpush = require('web-push');
const { PushSubscription } = require('../models');

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@ethiofood.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

async function sendPushToUser(userId, payload) {
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.log('⚠️  VAPID keys not set – skipping push notification');
        return;
    }

    try {
        const subs = await PushSubscription.findAll({ where: { userId } });
        if (subs.length === 0) return;

        const payloadStr = JSON.stringify(payload);

        const results = await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(sub.toWebPush(), payloadStr)
            )
        );

        for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
                const err = results[i].reason;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await PushSubscription.destroy({ where: { id: subs[i].id } });
                    console.log(`🗑️ Removed stale push subscription ${subs[i].id}`);
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
