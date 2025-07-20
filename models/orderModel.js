const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'users',
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.ObjectId,
      ref: 'product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    discountedPrice: { type: Number, required: false },
    status: {
      type: String,
      enum: ['Pending', 'Ordered', 'Cancelled', 'Returned'],
      default: 'Pending'
    }
  }
  ],
  address: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    }
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Razorpay', 'Wallet'],
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  deliveryDate: {
    type: Date
  },
  totalDiscount: {
    type: Number,
    required: true
  },
  razorpayId: {
    type: String,
    required: false
  }
}, { timestamps: true });

const orderModel = mongoose.model('order', orderSchema);
module.exports = orderModel;