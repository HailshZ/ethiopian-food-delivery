const mongoose = require('mongoose');

const mealSlotSchema = new mongoose.Schema({
  dish: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner'], default: 'lunch' }
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAm: { type: String, default: '' },
  description: { type: String, default: '' },
  descriptionAm: { type: String, default: '' },
  price: { type: Number, required: true },
  duration: { type: String, enum: ['weekly', 'monthly'], default: 'weekly' },
  meals: {
    monday: [mealSlotSchema],
    tuesday: [mealSlotSchema],
    wednesday: [mealSlotSchema],
    thursday: [mealSlotSchema],
    friday: [mealSlotSchema],
    saturday: [mealSlotSchema],
    sunday: [mealSlotSchema]
  },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
