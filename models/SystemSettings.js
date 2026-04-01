// models/SystemSettings.js – Sequelize SystemSettings model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SystemSettings = sequelize.define('SystemSettings', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        systemName: {
            type: DataTypes.STRING,
            defaultValue: 'EthioFood Delivery'
        },
        currency: {
            type: DataTypes.STRING,
            defaultValue: 'ETB'
        },
        currencySymbol: {
            type: DataTypes.STRING,
            defaultValue: 'ETB'
        },
        currencyPosition: {
            type: DataTypes.ENUM('left', 'right'),
            defaultValue: 'left'
        },
        contactEmail: {
            type: DataTypes.STRING,
            defaultValue: 'info@ethiofood.com'
        },
        contactPhone: {
            type: DataTypes.STRING,
            defaultValue: '+251 912 345 678'
        },
        address: {
            type: DataTypes.STRING,
            defaultValue: 'Addis Ababa, Ethiopia'
        },
        deliveryFeePerKm: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 15
        },
        baseDeliveryFee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 20
        },
        minOrderAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 100
        },
        restaurantLat: {
            type: DataTypes.DECIMAL(10, 7),
            defaultValue: 9.0192
        },
        restaurantLng: {
            type: DataTypes.DECIMAL(10, 7),
            defaultValue: 38.7525
        },
        logoUrl: {
            type: DataTypes.STRING,
            defaultValue: ''
        }
    }, {
        tableName: 'system_settings',
        timestamps: true
    });

    // Ensure only one settings document exists
    SystemSettings.getSettings = async function () {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        return settings;
    };

    return SystemSettings;
};
