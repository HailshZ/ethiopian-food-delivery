const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxUses: {
        type: Number,
        default: 0 // 0 = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Check if promo is valid
promoCodeSchema.methods.isValid = function (orderAmount) {
    if (!this.isActive) return { valid: false, reason: 'Promo code is inactive' };
    if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'Promo code has expired' };
    if (this.maxUses > 0 && this.usedCount >= this.maxUses) return { valid: false, reason: 'Promo code usage limit reached' };
    if (orderAmount < this.minOrderAmount) return { valid: false, reason: `Minimum order amount is ${this.minOrderAmount}` };
    return { valid: true };
};

// Calculate discount
promoCodeSchema.methods.calculateDiscount = function (orderAmount) {
    if (this.discountType === 'percentage') {
        return Math.round((orderAmount * this.discountValue / 100) * 100) / 100;
    }
    return Math.min(this.discountValue, orderAmount);
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);
