const mongoose = require('mongoose');
const orderModel = require('../../models/orderModel');
const addressModel = require('../../models/addressModel');
const cartModel = require('../../models/cartModel');
const walletModel = require('../../models/walletModel');
const couponModel = require('../../models/couponModel');
const offerModel = require('../../models/offerModel');
const Razorpay = require('razorpay');
const { prepareOrderProducts, updateProductStock } = require('../../utils/orderUtils');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

// Helper function to update coupon usage
const updateCouponUser = async (couponId, userId) => {
  if (!couponId) return;
  await couponModel.updateOne(
    { _id: couponId, userId: { $ne: userId } },
    { $push: { userId: userId } }
  );
};

const createOrderWithRazorpay = async (req, res) => {
  const userId = req.session.user;
  try {
    let { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
    totalPrice = Number(totalPrice);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    const options = {
      amount: Math.round(totalPrice * 100),
      currency: 'INR',
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);
    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error('Failed to create Razorpay order');
    }

    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).send('No default address found');
    }

    const cart = await cartModel.findOne({ userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send('Cart is empty');
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });
    const { products, originalTotal } = await prepareOrderProducts(cart, activeOffers);

    const orderData = {
      userId,
      products,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        address: address.address,
        phoneNumber: address.phoneNumber,
        state: address.state,
        city: address.city,
        pincode: address.pincode,
      },
      total: totalPrice,
      originalTotal,
      status: 'Pending',
      deliveryDate,
      paymentMethod,
      totalDiscount: totalDiscount || 0,
      paymentStatus: 'failed',
      razorpayId: razorpayOrder.id
    };

    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    const newOrder = await orderModel.create(orderData);
    await updateProductStock(products);
    await cartModel.findOneAndDelete({ userId });
    if (couponId) await updateCouponUser(couponId, userId);

    res.json({
      success: true,
      message: 'Order created successfully',
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      deliveryDate: newOrder.deliveryDate,
      Id: newOrder._id,
      order: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: `Something went wrong while creating order: ${error.message}` });
  }
};

const createOrderWithOCD = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
  const userId = req.session.user;
  const productTotal = totalPrice - 100;

  try {
    if (productTotal > 1000) {
      return res.json({ success: false, message: 'Cannot get Cash on Delivery above 1000 rupees' });
    }

    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).send('Address not found');
    }

    const cart = await cartModel.findOne({ userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send('Cart is empty');
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });
    const { products, originalTotal } = await prepareOrderProducts(cart, activeOffers);

    const orderData = {
      userId,
      products,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        address: address.address,
        phoneNumber: address.phoneNumber,
        state: address.state,
        city: address.city,
        pincode: address.pincode
      },
      total: totalPrice,
      originalTotal,
      status: 'Pending',
      paymentMethod,
      totalDiscount: totalDiscount || 0
    };

    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    const newOrder = await orderModel.create(orderData);
    await updateProductStock(products);
    await cartModel.findOneAndDelete({ userId });
    if (couponId) await updateCouponUser(couponId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
};

const walletOrder = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
  const userId = req.session.user;

  try {
    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).json({ success: false, message: 'Address not found' });
    }

    const userWallet = await walletModel.findOne({ userId });
    if (!userWallet) {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay with Wallet – wallet not found for this user'
      });
    }

    if (userWallet.balance < totalPrice) {
      return res.json({ success: false, message: "Cannot pay with Wallet - your wallet doesn't have enough money" });
    }

    const cart = await cartModel.findOne({ userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send('Cart is empty');
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });
    const { products, originalTotal } = await prepareOrderProducts(cart, activeOffers);

    const orderData = {
      userId,
      products,
      address: {
        firstName: address.firstName,
        lastName: address.lastName,
        address: address.address,
        phoneNumber: address.phoneNumber,
        state: address.state,
        city: address.city,
        pincode: address.pincode
      },
      total: totalPrice,
      originalTotal,
      status: 'Pending',
      paymentMethod,
      totalDiscount: totalDiscount || 0
    };

    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    const newOrder = await orderModel.create(orderData);
    await updateProductStock(products);

    userWallet.transaction.push({
      transactionType: 'debit',
      amount: newOrder.total,
      date: new Date(),
      description: `Payment for order ${newOrder._id}`
    });
    userWallet.balance -= totalPrice;
    await userWallet.save();

    await cartModel.findOneAndDelete({ userId });
    if (couponId) await updateCouponUser(couponId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
};

module.exports = {
  createOrderWithRazorpay,
  createOrderWithOCD,
  walletOrder
};