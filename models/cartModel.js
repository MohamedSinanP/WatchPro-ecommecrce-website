const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product"
      },
      variantSize: {
        type: String,
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
      }
    }
  ],

}, { timestamps: true });

const cartModel = mongoose.model("cart", cartSchema);
module.exports = cartModel;