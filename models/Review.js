// models/Review.js – Sequelize Review model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define('Review', {
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
    dishId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'dishes', key: 'id' }
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'dishId', 'orderId'] }
    ]
  });

  return Review;
};
