// utils/scheduler.js – Periodic tasks: subscription approaching notifications
const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('./pushNotify');

const CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Check active subscriptions and notify owners if the delivery time
 * is approaching (within 1 hour).
 */
async function checkApproachingSubscriptions() {
    try {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

        // Find active, paid subscriptions that haven't expired
        const subs = await Subscription.find({
            status: 'active',
            paymentStatus: 'paid',
            endDate: { $gte: now }
        }).populate({
            path: 'mealPlan',
            populate: { path: 'owner' }
        }).populate('user', 'name phone');

        for (const sub of subs) {
            if (!sub.mealPlan || !sub.mealPlan.owner) continue;

            const deliveryTime = sub.deliveryTime || '12:00';
            const [hours, minutes] = deliveryTime.split(':').map(Number);

            // Build today's delivery datetime
            const deliveryDate = new Date(now);
            deliveryDate.setHours(hours, minutes, 0, 0);

            // Calculate difference in milliseconds
            const diff = deliveryDate.getTime() - now.getTime();

            // Notify if delivery is within 1 hour (and hasn't passed yet)
            if (diff > 0 && diff <= 60 * 60 * 1000) {
                // Check if we already sent a notification for this subscription today
                const existing = await Notification.findOne({
                    owner: sub.mealPlan.owner._id,
                    type: 'plan_approaching',
                    relatedSubscription: sub._id,
                    createdAt: {
                        $gte: new Date(todayStr + 'T00:00:00.000Z'),
                        $lt: new Date(todayStr + 'T23:59:59.999Z')
                    }
                });

                if (!existing) {
                    const customerName = sub.user ? sub.user.name : 'A customer';
                    await Notification.create({
                        owner: sub.mealPlan.owner._id,
                        type: 'plan_approaching',
                        message: `📅 ${customerName}'s meal plan "${sub.mealPlan.name}" delivery is approaching at ${deliveryTime} today.`,
                        relatedSubscription: sub._id
                    });
                    // Send push notification to the provider
                    sendPushToUser(sub.mealPlan.owner._id, {
                        title: '📅 Delivery Approaching!',
                        body: `${customerName}'s meal plan "${sub.mealPlan.name}" delivery at ${deliveryTime} today.`,
                        icon: '/images/icon-192.png',
                        url: '/owner/orders'
                    });
                    console.log(`🔔 Plan approaching notification sent for subscription ${sub._id}`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Scheduler error (approaching subscriptions):', err.message);
    }
}

function startScheduler() {
    console.log('⏰ Scheduler started – checking every 15 minutes');
    // Run once immediately then at interval
    checkApproachingSubscriptions();
    setInterval(checkApproachingSubscriptions, CHECK_INTERVAL);
}

module.exports = { startScheduler };
