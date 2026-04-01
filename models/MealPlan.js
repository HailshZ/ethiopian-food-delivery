// models/MealPlan.js – Sequelize MealPlan model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MealPlan = sequelize.define('MealPlan', {
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
      defaultValue: ''
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    descriptionAm: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    duration: {
      type: DataTypes.ENUM('weekly', 'monthly'),
      defaultValue: 'weekly'
    },
    imageUrl: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'meal_plans',
    timestamps: true
  });

  return MealPlan;
};
