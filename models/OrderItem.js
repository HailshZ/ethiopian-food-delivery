// models/OrderItem.js – Normalized order items (was embedded array in MongoDB)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrderItem = sequelize.define('OrderItem', {
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
        dishId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'dishes', key: 'id' }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nameAm: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        totalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'order_items',
        timestamps: false
    });

    return OrderItem;
};
