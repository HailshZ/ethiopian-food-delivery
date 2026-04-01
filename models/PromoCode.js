// models/PromoCode.js – Sequelize PromoCode model
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PromoCode = sequelize.define('PromoCode', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            set(value) {
                this.setDataValue('code', value ? value.toUpperCase().trim() : value);
            }
        },
        discountType: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            defaultValue: 'percentage'
        },
        discountValue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: { min: 0 }
        },
        minOrderAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        maxUses: {
            type: DataTypes.INTEGER,
            defaultValue: 0 // 0 = unlimited
        },
        usedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'promo_codes',
        timestamps: true
    });

    // Check if promo is valid
    PromoCode.prototype.isValid = function (orderAmount) {
        if (!this.isActive) return { valid: false, reason: 'Promo code is inactive' };
        if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'Promo code has expired' };
        if (this.maxUses > 0 && this.usedCount >= this.maxUses) return { valid: false, reason: 'Promo code usage limit reached' };
        if (orderAmount < parseFloat(this.minOrderAmount)) return { valid: false, reason: `Minimum order amount is ${this.minOrderAmount}` };
        return { valid: true };
    };

    // Calculate discount
    PromoCode.prototype.calculateDiscount = function (orderAmount) {
        if (this.discountType === 'percentage') {
            return Math.round((orderAmount * parseFloat(this.discountValue) / 100) * 100) / 100;
        }
        return Math.min(parseFloat(this.discountValue), orderAmount);
    };

    return PromoCode;
};
