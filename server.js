
require('dotenv').config();
const express = require("express");
const session = require('express-session');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth')
const connectDB = require('./db/connectDB');
const ejs = require('ejs');
const path = require('path');
const passport = require('./config/passport');
const setUserLocals = require('./middlewares/setUserLocals');
const app = express();
const nocache = require('nocache');

app.use(nocache());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
  }

}));

app.use(setUserLocals);

app.use(passport.initialize());
app.use(passport.session());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
connectDB();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// express.router setup

app.use('/', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes)


// server start setup

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});