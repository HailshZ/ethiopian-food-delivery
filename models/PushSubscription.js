// models/PushSubscription.js – Sequelize PushSubscription model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PushSubscription = sequelize.define('PushSubscription', {
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
        endpoint: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        p256dh: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        auth: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'push_subscriptions',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['userId', 'endpoint'] }
        ]
    });

    // Helper to get subscription object in web-push format
    PushSubscription.prototype.toWebPush = function () {
        return {
            endpoint: this.endpoint,
            keys: {
                p256dh: this.p256dh,
                auth: this.auth
            }
        };
    };

    return PushSubscription;
};
