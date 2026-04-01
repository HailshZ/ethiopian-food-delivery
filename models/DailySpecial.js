// models/DailySpecial.js – Sequelize DailySpecial model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DailySpecial = sequelize.define('DailySpecial', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        dayOfWeek: {
            type: DataTypes.INTEGER, // 0=Sunday ... 6=Saturday
            allowNull: false,
            validate: { min: 0, max: 6 }
        },
        dishId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'dishes', key: 'id' }
        },
        specialPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: ''
        },
        descriptionAm: {
            type: DataTypes.TEXT,
            defaultValue: ''
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'daily_specials',
        timestamps: true
    });

    return DailySpecial;
};
