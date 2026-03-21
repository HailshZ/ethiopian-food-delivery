const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nameAm: {
    type: String,        // Amharic name
    required: true
  },
  description: {
    type: String,
    required: true
  },
  descriptionAm: {
    type: String,        // Amharic description
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['food', 'coffee', 'drink', 'appetizer', 'breakfast', 'dessert', 'combo'],
    default: 'food'
  },
  imageUrl: {
    type: String,
    default: '/images/placeholder.jpg' // We'll set a default
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot', ''],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dish', dishSchema);