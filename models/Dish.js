// models/Dish.js – Sequelize Dish model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dish = sequelize.define('Dish', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nameAm: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    descriptionAm: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('food', 'coffee', 'drink', 'appetizer', 'breakfast', 'dessert', 'combo'),
      defaultValue: 'food'
    },
    imageUrl: {
      type: DataTypes.STRING,
      defaultValue: '/images/placeholder.jpg'
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    spiceLevel: {
      type: DataTypes.ENUM('mild', 'medium', 'hot', 'extra-hot', ''),
      defaultValue: ''
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved'
    }
  }, {
    tableName: 'dishes',
    timestamps: true
  });

  return Dish;
};