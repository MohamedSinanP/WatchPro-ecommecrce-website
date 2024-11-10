const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  expireDate: {
    type: Date,
    required: true
  },
  discountType: {
    type: String,
    required: true
  },
  discount: {
    type: Number,
    required: true
  },
  minPurchaseLimit: {
    type: Number,
    required: true
  },
  maxDiscount: {
    type: Number,
    required: false
  },
  isActive:{
    type:Boolean,
    required:false
  }
}, { timestamps: true });


const couponModel = mongoose.model('coupon', couponSchema);
module.exports = couponModel;