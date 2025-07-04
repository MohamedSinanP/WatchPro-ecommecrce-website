const userModel = require('../models/userModel');
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');
const addressModel = require('../models/addressModel');
const cartModel = require('../models/cartModel');
const walletModel = require('../models/walletModel');
const couponModel = require('../models/couponModel');
const Razorpay = require("razorpay");
const PDFDocument = require('pdfkit');
require('dotenv').config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});


// to show orders in admin side

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

    if (req.xhr) {
      res.render('partials/admin/orderTable', { orders, currentPage: page, totalPages, limit, currentRoute: req.path });
    } else {
      res.render('admin/order', { orders, currentPage: page, totalPages, limit });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// to update the status of the order

const updateStatus = async (req, res) => {
  try {
    const statusOrder = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
    const orderId = req.params.id;
    const { status } = req.body;
    const order = await orderModel.findById(orderId);
    const currentStatus = order.status;
    if (statusOrder.indexOf(status) < statusOrder.indexOf(currentStatus)) {
      return res.json({ success: false, message: 'Invalid status update. Cannot revert to a previous status.' })
    }
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    );
    res.json({ success: true, updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
}

// to delete the order document from database

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

// to create a order for the user with the razorpay

const createOrder = async (req, res) => {

  const userId = req.session.user;
  try {
    let { totalPrice, paymentMethod, addressId, totalDiscount, couponId } = req.body;

    totalPrice = Number(totalPrice);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);
    const options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };
    const razorpayOrder = await razorpay.orders.create(options);
    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error("Failed to create Razorpay order");
    }
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
      paymentStatus: 'failed',
      razorpayId: razorpayOrder.id
    });

    for (const product of products) {
      const { productId, quantity } = product;
      await productModel.updateOne(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
    }

    await cartModel.findOneAndDelete({ userId: userId })
    await updateCouponUser(couponId, userId);

    res.json({
      success: true,
      message: "Order created successfully",
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      deliveryDate: newOrder.deliveryDate,
      Id: newOrder._id,
      order: newOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Something went wrong while creating order" });
  }
};

// to create a order for the user with COD

const addOrderDetails = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId } = req.body;

  const userId = req.session.user;
  const productTotal = totalPrice - 100;

  try {
    if (productTotal > 1000) {
      return res.json({ success: false, message: 'cannot get Cash on delivery above 1000 rupeees' });
    }
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

    await cartModel.findOneAndDelete({ userId: userId });
    await updateCouponUser(couponId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }

}

// to create a order for the user using wallet payment 

const walletOrder = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId } = req.body;
  const userId = req.session.user;

  try {
    const address = await addressModel.findOne({ _id: addressId });
    const userWallet = await walletModel.findOne({ userId: userId });
    const userBalance = userWallet.balance;
    if (userBalance < totalPrice) {
      return res.json({ success: false, message: "Cannot pay with Wallet your wallet doesn't have enough money" });
    }
    const walletBalance = userBalance - totalPrice;
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

    userWallet.transaction.push({
      transactionType: 'debit',
      amount: newOrder.total,
      date: new Date()
    });

    userWallet.balance = walletBalance;
    await userWallet.save();
    await cartModel.findOneAndDelete({ userId: userId });
    await updateCouponUser(couponId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }


}

// to show the greetings page for the user

const loadGreetingsPage = async (req, res) => {

  res.render('user/orderGreetings');
}

// to cancel the order of the user

const deleteOrderItem = async (req, res) => {
  const orderId = req.params.id;
  const { total } = req.body;
  const userId = req.session.user;

  try {
    const order = await orderModel.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Product or Order not found' });
    }
    for (const product of order.products) {
      const productId = product.productId;
      const productQuantity = product.quantity;

      await productModel.findByIdAndUpdate(
        productId,
        { $inc: { stock: productQuantity } },
        { new: true }
      );
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { status: 'Cancelled' },
      { new: true }
    ).populate('products.productId');

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (updatedOrder.paymentMethod === 'Razorpay' || updatedOrder.paymentMethod === 'Wallet') {
      let wallet = await walletModel.findOne({ userId });
      const amountNumber = parseFloat(total);
      if (isNaN(amountNumber)) {
        return res.status(400).json({ success: false, message: 'Invalid total amount' });
      }
      const transactionType = 'credit';

      if (wallet) {
        wallet.transaction.push({
          transactionType,
          amount: amountNumber.toString(),
          date: new Date(),
        });
        wallet.balance += amountNumber;
        await wallet.save();
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
          balance: amountNumber,
        });
        await wallet.save();
      }
    }
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error cancelling product:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel product' });
  }
};

// to show the order page in user side 

const loadOrdersPage = async (req, res) => {
  try {
    userId = req.session.user;
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalOrders = await orderModel.countDocuments({ userId: userId });
    const orders = await orderModel
      .find({ userId: userId }).populate('products.productId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });;

    const totalPages = Math.ceil(totalOrders / limit);
    const currentPage = page;

    res.render('user/orders', { orders, currentPage, totalPages, limit });
  } catch (error) {
    console.error('Error loading orders page:', error);
    res.status(500).send('Cannot load order page. Try again');
  }
};

// to return the order of the user (change status and update stock etc.)

const returnOrder = async (req, res) => {
  orderId = req.params.id;
  try {
    const order = await orderModel.findOne({ _id: orderId }).populate('products.productId');
    const wallet = await walletModel.findOne({ userId: order.userId })
    let walletBalance = wallet.balance;
    walletBalance += order.total;
    if (order.status === 'Delivered') {
      order.status = 'Returned';
      for (const product of order.products) {
        const productToUpdate = product.productId;
        productToUpdate.stock += product.quantity;
        await productToUpdate.save();
      };

      if (wallet) {
        wallet.transaction.push({
          transactionType: 'credit',
          amount: order.total,
          date: new Date()
        });

        wallet.balance = walletBalance;
        await wallet.save();
      } else {
        wallet = new walletModel({
          userId,
          transaction: [
            {
              transactionType: 'credit',
              amount: order.total,
              date: new Date(),
            },
          ],

        });
        wallet.balance = walletBalance;
        await wallet.save();
      }


      order.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// to verify payment

const paymentSuccess = async (req, res) => {
  try {
    const { orderid } = req.body;
    const order = await orderModel.findOne({ _id: orderid });
    if (order) {
      order.paymentStatus = 'success';
      await order.save();
      res.json({ success: true, redirectUrl: '/greetings' })
    };

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// to retry payment for the user

const retryPayment = async (req, res) => {
  const { orderId, razorpayId } = req.body;
  const userId = req.session.user;

  try {
    const order = await orderModel.findOne({ razorpayId: razorpayId });
    const user = await userModel.findOne({ _id: userId })
    const userName = order.address.firstName;
    const userEmail = user.email;
    const phoneNumber = order.address.phoneNumber;

    let totalPrice = order.total;

    totalPrice = Number(totalPrice);
    const options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    if (razorpayOrder && razorpayOrder.status) {
    }

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: userName,
      email: userEmail,
      phoneNumber: phoneNumber,
      order: order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating Razorpay order" });
  }
}

// to show retry payment page

const loadRetryPaymentPage = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId);
    res.render('user/retryPaymentPage', { order });
  } catch (error) {
    res.status(500).send('Internal server error');
  }
}

// to download the invoice of the order for user

const downloadInvoice = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId)
      .populate('userId')
      .populate('products.productId');

    const subtotal = order.products.reduce((total, product) => total + (product.quantity * product.price), 0);
    const totalDiscount = order.totalDiscount || 0;
    const total = subtotal - totalDiscount;

    const invoice = {
      invoice_nr: `2024.000${orderId.slice(-4)}`,
      subtotal,
      paid: total,
      shipping: {
        name: order.userId.fullName,
        address: order.address.address,
        city: order.address.city,
        state: "Kerala",
        country: "India"
      },
      items: order.products.map(product => ({
        item: product.productId.name,
        amount: product.quantity * product.price,
        quantity: product.quantity
      }))
    };

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const fileName = `invoice_${orderId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');

    // Helper functions for each section
    const generateHeader = (doc) => {
      doc
        .fillColor("#444444")
        .fontSize(20)
        .text("WatchPro", 50, 45)
        .fontSize(10)
        .text("WatchPro", 200, 50, { align: "right" })
        .text("Pottikkallu 123 Hyderabad", 200, 65, { align: "right" })
        .text("Malappuram, India", 200, 80, { align: "right" })
        .moveDown();
    };

    const generateCustomerInformation = (doc, invoice) => {
      doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160);

      generateHr(doc, 185);

      const customerInformationTop = 200;
      doc
        .fontSize(10)
        .text("Invoice Number:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(invoice.invoice_nr, 150, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 50, customerInformationTop + 15)
        .text(formatDate(new Date()), 150, customerInformationTop + 15)
        .font("Helvetica-Bold")
        .text(invoice.shipping.name, 300, customerInformationTop)
        .font("Helvetica")
        .text(invoice.shipping.address, 300, customerInformationTop + 15)
        .text(`${invoice.shipping.city}, ${invoice.shipping.state}, ${invoice.shipping.country}`, 300, customerInformationTop + 30)
        .moveDown();

      generateHr(doc, 252);
    };

    const generateInvoiceTable = (doc, invoice) => {
      let i;
      const invoiceTableTop = 330;

      doc.font("Helvetica-Bold");
      generateTableRow(doc, invoiceTableTop, "Item", "Unit Cost", "Quantity", "Line Total");  // Remove "Description" here
      generateHr(doc, invoiceTableTop + 20);
      doc.font("Helvetica");

      for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
          doc,
          position,
          item.item,
          (item.amount / item.quantity).toFixed(2),
          item.quantity,
          (item.amount)
        );
        generateHr(doc, position + 20);
      }

      const subtotalPosition = invoiceTableTop + (i + 1) * 30;
      generateTableRow(doc, subtotalPosition, "", "Subtotal", "", (invoice.subtotal));

      const paidToDatePosition = subtotalPosition + 20;
      generateTableRow(doc, paidToDatePosition, "", "Discount", "", (totalDiscount));

      const duePosition = paidToDatePosition + 25;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, duePosition, "", "Total", "", (total));
      doc.font("Helvetica");
    };

    const generateFooter = (doc) => {
      doc
        .fontSize(10)
        .text(" Thank you for your order.", 50, 650, { align: "center", width: 500 });
    };

    const generateTableRow = (doc, y, item, unitCost, quantity, lineTotal) => {
      doc.fontSize(10)
        .text(item, 50, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
    };

    const generateHr = (doc, y) => {
      doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    };

    const formatDate = (date) => date.toISOString().split('T')[0];

    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Error generating invoice" });
  }
};


// helpler function to update the coupon userId array
const updateCouponUser = async (couponId, userId) => {
  if (!couponId) return;
  await couponModel.updateOne(
    { _id: couponId, userId: { $ne: userId } },
    { $push: { userId: userId } }
  );
};

module.exports = {
  loadOrders,
  updateStatus,
  cancelOrder,
  loadCheckoutPage,
  createOrder,
  addOrderDetails,
  walletOrder,
  loadGreetingsPage,
  deleteOrderItem,
  loadOrdersPage,
  returnOrder,
  paymentSuccess,
  retryPayment,
  loadRetryPaymentPage,
  downloadInvoice
}