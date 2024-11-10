const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  genderType: {
    type: String,
    enum: ['Men', 'Women', 'Unisex'],
    required: true
  },
  isListed: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const categoryModel =  mongoose.model('category', categorySchema);
module.exports = categoryModel;
