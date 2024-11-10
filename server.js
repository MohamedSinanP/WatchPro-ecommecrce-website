
require('dotenv').config();
const express = require("express");
const session = require('express-session');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth')
const connectDB = require('./db/connectDB');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const path = require('path');
const multer = require('multer');
const passport = require('./config/passport');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const app = express();



app.use(session({
  secret:'secretkey',
  reseve:false,
  saveUninitialized:true,
  cookie: {
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
  } 

}));

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false; 
  res.locals.user = req.session.user || {}; 
  next();
});


app.use(passport.initialize());
app.use(passport.session());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
connectDB();


app.use(express.urlencoded ({extended:true}));
app.use(express.json());


app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes)





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});