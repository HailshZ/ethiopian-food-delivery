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
    enum: ['food', 'coffee', 'drink'],
    default: 'food'
  },
  imageUrl: {
    type: String,
    default: '/images/placeholder.jpg' // We'll set a default
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dish', dishSchema);