const userModel = require('../../models/userModel');
const addressModel = require('../../models/addressModel');
const cartModel = require('../../models/cartModel');
require('dotenv').config();


// to show checkout page in user side 

const loadCheckoutPage = async (req, res) => {
  try {
    const cartTotal = parseFloat(req.query.cartTotal);
    const totalDiscount = req.query.totalDiscount;
    const couponId = req.query.couponId;
    const userId = req.session.user;
    const shippingCharge = 100;
    const cartItems = await cartModel.findOne({ userId: userId }).populate('products.productId');
    const addresses = await addressModel.find({ userId: userId });
    const user = await userModel.findOne({ _id: userId });
    const total = (shippingCharge + cartTotal).toFixed(2);

    res.render('user/checkout', { cartItems, addresses, cartTotal, user, shippingCharge, total, totalDiscount, couponId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'internal server error' });
  }
}

module.exports = {
  loadCheckoutPage
}