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
    deliveryFee: {
        type: Number,
        default: 50
    },
    minOrderAmount: {
        type: Number,
        default: 100
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
