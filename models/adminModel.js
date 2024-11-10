const mongoose = require('mongoose');


const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});



const adminModel = mongoose.model("admin", adminSchema);
module.exports = adminModel