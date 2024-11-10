const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product"
      },
      quantity:{
        type:Number,
        required:true
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
  
},{timestamps:true});

const wishlistModel = mongoose.model('wishlist',wishlistSchema)
module.exports = wishlistModel;