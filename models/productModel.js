const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: {
    type: [String],
    require: true
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  brand:{
    type:String,
    required:true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category',
    required: true
  },
  isListed:{
    type:Boolean,
    default:true
  },
  
},{timestamps:true});

const productModel = mongoose.model('product',productSchema);
module.exports = productModel;
