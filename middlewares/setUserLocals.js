const User = require('../models/userModel');
const Cart = require('../models/cartModel');

const setUserLocals = async (req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;

  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user).lean();
      if (user) {
        res.locals.user = req.session.user;
        res.locals.userName = user.fullName;

        const cart = await Cart.findOne({ userId: user._id }).lean();
        const cartItemCount = cart
          ? cart.products.reduce((acc, item) => acc + item.quantity, 0)
          : 0;

        res.locals.cartItemCount = cartItemCount;
      } else {
        res.locals.user = null;
        res.locals.userName = null;
        res.locals.cartItemCount = 0;
      }
    } catch (err) {
      console.error('Error setting res.locals:', err);
      res.locals.user = null;
      res.locals.userName = null;
      res.locals.cartItemCount = 0;
    }
  } else {
    res.locals.user = null;
    res.locals.userName = null;
    res.locals.cartItemCount = 0;
  }

  next();
};

module.exports = setUserLocals;
