// models/Order.js – Sequelize Order model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
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
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'card'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'failed'),
      defaultValue: 'pending'
    },
    orderStatus: {
      type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'),
      defaultValue: 'pending'
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    otpExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    chapaTxRef: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deliveryLat: {
      type: DataTypes.DECIMAL(10, 7),
      defaultValue: 9.0192
    },
    deliveryLng: {
      type: DataTypes.DECIMAL(10, 7),
      defaultValue: 38.7525
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    promoCode: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    isReviewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    deliveryDistance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};