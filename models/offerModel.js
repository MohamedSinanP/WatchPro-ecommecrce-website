const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'amount'], required: true },
  discountValue: { type: Number, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }],
  expireDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
});

const offerModel = mongoose.model('offer', offerSchema);
module.exports = offerModel;