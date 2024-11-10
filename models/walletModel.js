const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({


  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
    required:true
  },
transaction:[
  {
    transactionType:{
      type:String,
      required:true
    },
    amount:{
      type:String,
      required:true
    },
    date:{
      type:Date,
      required:true
    }
  }
],
  balance:{
    type:Number,
    required:true
  }
})

const walletModel = mongoose.model('wallet',walletSchema);
module.exports = walletModel;