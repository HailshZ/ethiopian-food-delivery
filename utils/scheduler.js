// utils/scheduler.js – Periodic tasks: subscription approaching notifications (Sequelize)
const { Op } = require('sequelize');
const { Subscription, MealPlan, Notification, User } = require('../models');
const { sendPushToUser } = require('./pushNotify');

const CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

async function checkApproachingSubscriptions() {
    try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const subs = await Subscription.findAll({
            where: {
                status: 'active',
                paymentStatus: 'paid',
                endDate: { [Op.gte]: now }
            },
            include: [
                {
                    model: MealPlan,
                    as: 'mealPlan',
                    include: [{ model: User, as: 'owner' }]
                },
                { model: User, as: 'user', attributes: ['name', 'phone'] }
            ]
        });

        for (const sub of subs) {
            if (!sub.mealPlan || !sub.mealPlan.owner) continue;

            const deliveryTime = sub.deliveryTime || '12:00';
            const [hours, minutes] = deliveryTime.split(':').map(Number);

            const deliveryDate = new Date(now);
            deliveryDate.setHours(hours, minutes, 0, 0);

            const diff = deliveryDate.getTime() - now.getTime();

            if (diff > 0 && diff <= 60 * 60 * 1000) {
                const existing = await Notification.findOne({
                    where: {
                        ownerId: sub.mealPlan.ownerId,
                        type: 'plan_approaching',
                        relatedSubscriptionId: sub.id,
                        createdAt: { [Op.between]: [todayStart, todayEnd] }
                    }
                });

                if (!existing) {
                    const customerName = sub.user ? sub.user.name : 'A customer';
                    await Notification.create({
                        ownerId: sub.mealPlan.ownerId,
                        type: 'plan_approaching',
                        message: `📅 ${customerName}'s meal plan "${sub.mealPlan.name}" delivery is approaching at ${deliveryTime} today.`,
                        relatedSubscriptionId: sub.id
                    });
                    sendPushToUser(sub.mealPlan.ownerId, {
                        title: '📅 Delivery Approaching!',
                        body: `${customerName}'s meal plan "${sub.mealPlan.name}" delivery at ${deliveryTime} today.`,
                        icon: '/images/icon-192.png',
                        url: '/owner/orders'
                    });
                    console.log(`🔔 Plan approaching notification sent for subscription ${sub.id}`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Scheduler error (approaching subscriptions):', err.message);
    }
}

function startScheduler() {
    console.log('⏰ Scheduler started – checking every 15 minutes');
    checkApproachingSubscriptions();
    setInterval(checkApproachingSubscriptions, CHECK_INTERVAL);
}

module.exports = { startScheduler };
