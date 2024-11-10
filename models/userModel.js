const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  fullName: {
    type: String
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    unique: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  referralCode: {
    type: String,
    required: false
  }
}, { timestamps: true });
const userModel = mongoose.model("users", userSchema);
module.exports = userModel;