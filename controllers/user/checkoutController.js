const userModel = require('../../models/userModel');
const addressModel = require('../../models/addressModel');
const cartModel = require('../../models/cartModel');
const couponModel = require('../../models/couponModel');
require('dotenv').config();

// to show checkout page in user side 
const loadCheckoutPage = async (req, res) => {
  try {
    const cartTotal = parseFloat(req.query.cartTotal);
    const totalDiscount = parseFloat(req.query.totalDiscount) || 0;
    const couponId = req.query.couponId || null;
    const couponDiscount = parseFloat(req.query.couponDiscount) || 0;
    const offerDiscount = parseFloat(req.query.offerDiscount) || 0;
    const userId = req.session.user;
    const shippingCharge = 100;

    const cartItems = await cartModel.findOne({ userId }).populate('products.productId');
    const addresses = await addressModel.find({ userId });
    const user = await userModel.findById(userId);

    const total = (shippingCharge + cartTotal).toFixed(2);

    let coupon = null;
    let couponCode = null;

    if (couponId) {
      coupon = await couponModel.findById(couponId);
      couponCode = coupon?.code || null;
    }

    res.render('user/checkout', {
      cartItems,
      addresses,
      cartTotal,
      user,
      shippingCharge,
      total,
      totalDiscount,
      couponDiscount,
      offerDiscount,
      couponId,
      couponCode
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  loadCheckoutPage
}