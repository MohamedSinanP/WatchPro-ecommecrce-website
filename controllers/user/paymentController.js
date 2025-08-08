const orderModel = require('../../models/orderModel');
const userModel = require('../../models/userModel');
const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

const paymentSuccess = async (req, res) => {
  try {
    const { orderid } = req.body;
    const order = await orderModel.findOne({ _id: orderid });
    if (order) {
      order.paymentStatus = 'success';
      await order.save();
      res.json({ success: true, redirectUrl: '/greetings' });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const retryPayment = async (req, res) => {
  const { orderId, razorpayId } = req.body;
  const userId = req.session.user;

  try {
    const order = await orderModel.findOne({ razorpayId }).populate('products.productId');
    const user = await userModel.findOne({ _id: userId });
    const userName = order.address.firstName;
    const userEmail = user.email;
    const phoneNumber = order.address.phoneNumber;

    let totalPrice = order.total;
    totalPrice = Number(totalPrice);
    const options = {
      amount: totalPrice * 100,
      currency: 'INR',
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: userName,
      email: userEmail,
      phoneNumber,
      order
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({ success: false, message: 'Error creating Razorpay order' });
  }
};

const loadRetryPaymentPage = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId);
    res.render('user/retryPaymentPage', { order });
  } catch (error) {
    console.error('Error loading retry payment page:', error);
    res.status(500).send('Internal server error');
  }
};

module.exports = {
  paymentSuccess,
  retryPayment,
  loadRetryPaymentPage
};