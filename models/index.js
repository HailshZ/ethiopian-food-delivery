// models/index.js – Sequelize initialization and associations
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'ethiofood',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'production' ? false : console.log,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Import models
const User = require('./User')(sequelize);
const Dish = require('./Dish')(sequelize);
const Order = require('./Order')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const DeliveryUpdate = require('./DeliveryUpdate')(sequelize);
const MealPlan = require('./MealPlan')(sequelize);
const MealSlot = require('./MealSlot')(sequelize);
const DailySpecial = require('./DailySpecial')(sequelize);
const Notification = require('./Notification')(sequelize);
const PromoCode = require('./PromoCode')(sequelize);
const PushSubscription = require('./PushSubscription')(sequelize);
const Review = require('./Review')(sequelize);
const Subscription = require('./Subscription')(sequelize);
const SystemSettings = require('./SystemSettings')(sequelize);

// ──── Associations ────

// User → Dish (owner)
User.hasMany(Dish, { foreignKey: 'ownerId', as: 'dishes' });
Dish.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User → Order
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order → OrderItem
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// OrderItem → Dish
Dish.hasMany(OrderItem, { foreignKey: 'dishId' });
OrderItem.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });

// Order → DeliveryUpdate
Order.hasMany(DeliveryUpdate, { foreignKey: 'orderId', as: 'deliveryUpdates', onDelete: 'CASCADE' });
DeliveryUpdate.belongsTo(Order, { foreignKey: 'orderId' });

// User → MealPlan (owner)
User.hasMany(MealPlan, { foreignKey: 'ownerId', as: 'mealPlans' });
MealPlan.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// MealPlan → MealSlot
MealPlan.hasMany(MealSlot, { foreignKey: 'mealPlanId', as: 'mealSlots', onDelete: 'CASCADE' });
MealSlot.belongsTo(MealPlan, { foreignKey: 'mealPlanId' });

// MealSlot → Dish
Dish.hasMany(MealSlot, { foreignKey: 'dishId' });
MealSlot.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });

// DailySpecial → Dish
Dish.hasMany(DailySpecial, { foreignKey: 'dishId' });
DailySpecial.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });

// Notification → User (owner)
User.hasMany(Notification, { foreignKey: 'ownerId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Notification → Order
Order.hasMany(Notification, { foreignKey: 'relatedOrderId' });
Notification.belongsTo(Order, { foreignKey: 'relatedOrderId', as: 'relatedOrder' });

// Notification → Subscription
Subscription.hasMany(Notification, { foreignKey: 'relatedSubscriptionId' });
Notification.belongsTo(Subscription, { foreignKey: 'relatedSubscriptionId', as: 'relatedSubscription' });

// User → PushSubscription
User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptions' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

// Review associations
User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Dish.hasMany(Review, { foreignKey: 'dishId' });
Review.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });

Order.hasMany(Review, { foreignKey: 'orderId' });
Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// User → Subscription
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// MealPlan → Subscription
MealPlan.hasMany(Subscription, { foreignKey: 'mealPlanId', as: 'subscriptions' });
Subscription.belongsTo(MealPlan, { foreignKey: 'mealPlanId', as: 'mealPlan' });

module.exports = {
    sequelize,
    User,
    Dish,
    Order,
    OrderItem,
    DeliveryUpdate,
    MealPlan,
    MealSlot,
    DailySpecial,
    Notification,
    PromoCode,
    PushSubscription,
    Review,
    Subscription,
    SystemSettings
};
