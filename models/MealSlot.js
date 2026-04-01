// models/MealSlot.js – Normalized meal slots (was embedded subdoc in MealPlan)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MealSlot = sequelize.define('MealSlot', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mealPlanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'meal_plans', key: 'id' }
        },
        dayOfWeek: {
            type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
            allowNull: false
        },
        mealType: {
            type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
            defaultValue: 'lunch'
        },
        dishId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'dishes', key: 'id' }
        }
    }, {
        tableName: 'meal_slots',
        timestamps: false
    });

    return MealSlot;
};
