const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    systemName: {
        type: String,
        default: 'EthioFood Delivery'
    },
    currency: {
        type: String,
        default: 'ETB'
    },
    currencySymbol: {
        type: String,
        default: 'ETB'
    },
    currencyPosition: {
        type: String,
        enum: ['left', 'right'],
        default: 'left'
    },
    contactEmail: {
        type: String,
        default: 'info@ethiofood.com'
    },
    contactPhone: {
        type: String,
        default: '+251 912 345 678'
    },
    address: {
        type: String,
        default: 'Addis Ababa, Ethiopia'
    },
    deliveryFeePerKm: {
        type: Number,
        default: 15
    },
    baseDeliveryFee: {
        type: Number,
        default: 20
    },
    minOrderAmount: {
        type: Number,
        default: 100
    },
    restaurantLocation: {
        lat: { type: Number, default: 9.0192 },
        lng: { type: Number, default: 38.7525 }
    },
    logoUrl: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
