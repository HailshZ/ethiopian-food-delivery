const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true
    },
    name: String,
    nameAm: String,
    price: Number,
    qty: Number,
    totalPrice: Number,
    imageUrl: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    default: 'card'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'],
    default: 'pending'
  },
  chapaTxRef: String,
  stripePaymentIntentId: String,
  deliveryLocation: {
    lat: { type: Number, default: 9.0192 },  // Default: Addis Ababa
    lng: { type: Number, default: 38.7525 }
  },
  estimatedDelivery: { type: Date },
  deliveryUpdates: [{
    status: String,
    location: { lat: Number, lng: Number },
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);