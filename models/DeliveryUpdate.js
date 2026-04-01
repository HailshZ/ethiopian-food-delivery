// models/DeliveryUpdate.js – Normalized delivery updates (was embedded array in MongoDB)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DeliveryUpdate = sequelize.define('DeliveryUpdate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'orders', key: 'id' }
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        locationLat: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true
        },
        locationLng: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'delivery_updates',
        timestamps: false
    });

    return DeliveryUpdate;
};
