const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try{
    const mongoURL = process.env.MONGO_URL;
    const conn = await mongoose.connect(mongoURL,{});  

    console.log(`Mongodb connected at : ${conn.connection.host}`)
  }catch(error){
    console.log(error);
    process.exit(1);
  }
}
module.exports = connectDB;