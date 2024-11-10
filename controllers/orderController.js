const userModel = require('../models/userModel');
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const addressModel = require('../models/addressModel');
const cartModel = require('../models/cartModel');
const walletModel = require('../models/walletModel');
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_X9NFs9mKeaCGys",
  key_secret: "wMGZZJsmEEXnXBJKPiG02YBN"
});


// admin order management

const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = 5; // Number of orders per page
    const skip = (page - 1) * limit;

    const totalOrders = await orderModel.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await orderModel.find({})
      .populate({ path: 'userId', select: 'fullName' })
      .populate({ path: 'address' })
      .populate('products.productId', 'name')
      .skip(skip)
      .limit(limit);

    // Check if it's an AJAX request (XHR)
    if (req.xhr) {
      res.render('partials/admin/orderTable', { orders, currentPage: page, totalPages, limit });
    } else {
      res.render('admin/order', { orders, currentPage: page, totalPages, limit });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Server Error');
  }
};

const updateStatus = async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  try {
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).send('Order not found');
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
}

const cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findByIdAndDelete({ _id: id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }



    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }

}



// user order management 


const loadCheckoutPage = async (req, res) => {
  const cartTotal = parseFloat(req.query.cartTotal);
  const totalDiscount = req.query.totalDiscount;
  const userId = req.session.user;
  const shippingCharge = 100;
  const cartItems = await cartModel.findOne({ userId: userId }).populate('products.productId');
  const addresses = await addressModel.find({ userId: userId });
  const user = await userModel.findOne({ _id: userId });
  const total = (shippingCharge + cartTotal).toFixed(2);

  res.render('user/checkout', { cartItems, addresses, cartTotal, user, shippingCharge, total, totalDiscount });
}

const defaultAddress = async (req, res) => {
  const userId = req.session.user;
  const addressId = req.params.id;

  try {

    const allAddressesBefore = await addressModel.find({ userId: userId });

    await addressModel.updateMany({ userId: userId }, { default: false });

    await addressModel.findByIdAndUpdate(addressId, { default: true });

    const allAddressesAfter = await addressModel.find({ userId: userId });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Failed to set default address.' });
  }
};

const createOrder = async (req, res) => {
  
  const userId = req.session.user;
  console.log("createOrder function finished for userId:", userId);
  // Existing code
console.log("createOrder function finished for userId:", userId);
  try {
    let { totalPrice, paymentMethod, addressId, totalDiscount } = req.body;

    totalPrice = Number(totalPrice);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    const options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).send("No default address found");
    }

    const cart = await cartModel.findOne({ userId: userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send("Cart is empty");
    }

    const products = cart.products.map(item => ({
      productId: item.productId._id,
      quantity: item.quantity,
      name: item.productId.name,
      price: item.productId.price,
    }));

    console.log("createOrder products:", products); // In createOrder

    const newOrder = await orderModel.create({
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
      status: 'Pending',
      deliveryDate: deliveryDate,
      paymentMethod: paymentMethod,
      totalDiscount: totalDiscount,
    });

    for (const product of products) {
      const { productId, quantity } = product;
      await productModel.updateOne(
        { _id: productId, stock: { $gte: quantity } }, // Check if stock is sufficient
        { $inc: { stock: -quantity } }
      );
    }

    await cartModel.findOneAndDelete({ userId: userId });

    res.json({
      success: true,
      message: "Order created successfully",
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      deliveryDate: newOrder.deliveryDate,
    });
  } catch (error) {
    console.log("Error creating order:", error);
    res.status(500).json({ error: "Something went wrong while creating order" });
  }
};

const addOrderDetails = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount } = req.body;

  const userId = req.session.user;



  try {

    const address = await addressModel.findOne({ _id: addressId });


    const cart = await cartModel.findOne({ userId: userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send("Cart is empty");
    }



    const products = cart.products.map(item => ({
      productId: item.productId._id,
      quantity: item.quantity,
      name: item.productId.name,
      price: item.productId.price
    }));

    console.log("addOrderDetails products:", products); 


    const newOrder = await orderModel.create({
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
      status: 'Pending',
      paymentMethod: paymentMethod,
      totalDiscount: totalDiscount
    });
    for (const product of products) {
      const { productId, quantity } = product;

      await productModel.findOneAndUpdate(
        { _id: productId },
        { $inc: { stock: -quantity } },
        { new: true }
      );
    }

    const deleteUserCart = await cartModel.findOneAndDelete({ userId: userId });
    res.json({ success: true });
  } catch (error) {
    console.log("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }

}

const loadGreetingsPage = async (req, res) => {

  res.render('user/orderGreetings');
}

const deleteOrderItem = async (req, res) => {
  const orderId = req.params.id;
  const { productId, total } = req.body;
  const userId = req.session.user;

  try {
    const product = await productModel.findOne({ _id: productId });
    const order = await orderModel.findOne({ _id: orderId });
    if (!product || !order) {
      return res.status(404).json({ success: false, message: 'Product or Order not found' });
    }

    const productPrice = product.price;
    const Product = order.products.find(p => p.productId.toString() === productId.toString());
    if (!Product) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }
    const productQuantity = Product.quantity;

    // Update stock
    const newStock = await productModel.findByIdAndUpdate(
      productId,
      { $inc: { stock: productQuantity } },
      { new: true }
    );
    console.log('Stock updated:', newStock);

    // Update order
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log('Order marked as deleted:', updatedOrder);

    // Create or update wallet
    let wallet = await walletModel.findOne({ userId });
    const amountNumber = parseFloat(total);

    if (isNaN(amountNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid total amount' });
    }
    console.log('Parsed Amount:', amountNumber);

    const transactionType = 'credit';

    if (wallet) {
      wallet.transaction.push({
        transactionType,
        amount: amountNumber.toString(),
        date: new Date(),
      });

      // Update balance
      wallet.balance += transactionType === 'credit' ? amountNumber : -amountNumber;

      // Save wallet
      await wallet.save();
      console.log('Wallet updated:', wallet);
    } else {
      wallet = new walletModel({
        userId,
        transaction: [
          {
            transactionType,
            amount: amountNumber,
            date: new Date(),
          },
        ],
        balance: transactionType === 'credit' ? amountNumber : -amountNumber,
      });

      await wallet.save();
      console.log('New wallet created:', wallet);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling product:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel product' });
  }
};

const loadOrdersPage = async (req, res) => {
  userId = req.session.user;
  try {
    const orders = await orderModel.find({ userId: userId }).populate('products.productId');



    res.render('user/orders', { orders });
  } catch (error) {
    console.error('Error loading orders page:', error);
    res.status(500).send('Cannot load order details page. Try again');
  }
};

const returnOrder = async (req, res) => {
  orderId = req.params.id;
  try {
    const order = await orderModel.findOne({ _id: orderId }).populate('products.productId');
    const wallet = await walletModel.findOne({ userId: order.userId })
    let walletBalance = wallet.balance;
    walletBalance += order.total;
    if (order.status === 'Delivered') {
      order.status = 'Returned';
      order.products.forEach(product => {
        product.productId.stock += product.quantity;
      });
      wallet.transaction.push({
        transactionType: 'credit',  
        amount: order.total,        
        date: new Date()            
      });

      wallet.balance = walletBalance;
      await wallet.save();
      
      order.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: 'Internal server error' });
  }
}
module.exports = {
  loadOrders,
  updateStatus,
  cancelOrder,
  loadCheckoutPage,
  defaultAddress,
  createOrder,
  addOrderDetails,
  loadGreetingsPage,
  deleteOrderItem,
  loadOrdersPage,
  returnOrder
}