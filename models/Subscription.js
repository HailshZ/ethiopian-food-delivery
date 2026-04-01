// models/Subscription.js – Sequelize Subscription model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Subscription = sequelize.define('Subscription', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' }
        },
        mealPlanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'meal_plans', key: 'id' }
        },
        status: {
            type: DataTypes.ENUM('active', 'paused', 'cancelled', 'expired'),
            defaultValue: 'active'
        },
        startDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        shippingStreet: {
            type: DataTypes.STRING,
            allowNull: false
        },
        shippingCity: {
            type: DataTypes.STRING,
            allowNull: false
        },
        shippingZipCode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'failed'),
            defaultValue: 'pending'
        },
        chapaTxRef: {
            type: DataTypes.STRING,
            allowNull: true
        },
        totalPaid: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        deliveryTime: {
            type: DataTypes.STRING,
            defaultValue: '12:00'
        }
    }, {
        tableName: 'subscriptions',
        timestamps: true
    });

    return Subscription;
};
