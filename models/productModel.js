const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: { type: Number, default: 0 }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  images: { type: [String], require: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  brand: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', required: true },
  isListed: { type: Boolean, default: true },
  variants: [variantSchema]

}, { timestamps: true });

const productModel = mongoose.model('product', productSchema);
module.exports = productModel;
