// models/Notification.js – Sequelize Notification model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' }
        },
        type: {
            type: DataTypes.ENUM('new_order', 'plan_approaching'),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        relatedOrderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'orders', key: 'id' }
        },
        relatedSubscriptionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'subscriptions', key: 'id' }
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'notifications',
        timestamps: true,
        indexes: [
            { fields: ['ownerId', 'isRead', 'createdAt'] }
        ]
    });

    return Notification;
};
