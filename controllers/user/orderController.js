const userModel = require('../../models/userModel');
const orderModel = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const addressModel = require('../../models/addressModel');
const cartModel = require('../../models/cartModel');
const walletModel = require('../../models/walletModel');
const offerModel = require('../../models/offerModel');
const couponModel = require('../../models/couponModel');
const Razorpay = require("razorpay");
const getDiscountedPrice = require('../../utils/getDiscount');
require('dotenv').config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});




// to create a order for the user with the razorpay

const createOrderWithRazorpay = async (req, res) => {

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
    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });

    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      console.log({
        original: product.price,
        discounted,
        productId: product._id.toString(),
        productCategory: product.category?.toString(),
        matchedOffers: activeOffers.map(of => of.products.map(id => id.toString()))
      });
      const original = product.price;

      const isOfferApplied = discounted < original;



      const productEntry = {
        productId: product._id,
        quantity,
        name: product.name,
        price: original,
        status: 'Pending'
      };

      if (isOfferApplied) {
        productEntry.discountedPrice = discounted;
      }

      return productEntry;
    });

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

const createOrderWithOCD = async (req, res) => {
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
    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });


    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      const original = product.price;

      const isOfferApplied = discounted < original;



      const productEntry = {
        productId: product._id,
        quantity,
        name: product.name,
        price: original,
        status: 'Pending'
      };

      if (isOfferApplied) {
        productEntry.discountedPrice = discounted;
      }

      return productEntry;
    });


    await orderModel.create({
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
    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });



    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      const original = product.price;

      const isOfferApplied = discounted < original;



      const productEntry = {
        productId: product._id,
        quantity,
        name: product.name,
        price: original,
        status: 'Pending'
      };

      if (isOfferApplied) {
        productEntry.discountedPrice = discounted;
      }

      return productEntry;
    });



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

const cancelOrder = async (req, res) => {
  const orderId = req.params.id;
  const { productId } = req.body;
  const userId = req.session.user;

  try {
    const order = await orderModel.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['Delivered', 'Returned', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
    }

    let refundAmount = 0;
    let updatedOrder;

    if (productId) {
      const productToCancel = order.products.find(p => p.productId.toString() === productId);
      if (!productToCancel) {
        return res.status(404).json({ success: false, message: 'Product not found in order' });
      }

      if (productToCancel.status === 'Cancelled') {
        return res.status(400).json({ success: false, message: 'Product is already cancelled' });
      }

      if (['Delivered', 'Returned'].includes(productToCancel.status)) {
        return res.status(400).json({ success: false, message: 'Product cannot be cancelled' });
      }

      await productModel.findByIdAndUpdate(
        productId,
        { $inc: { stock: productToCancel.quantity } },
        { new: true }
      );

      refundAmount = (productToCancel.discountedPrice ?? productToCancel.price) * productToCancel.quantity;

      updatedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId, 'products.productId': productId },
        {
          $set: { 'products.$.status': 'Cancelled' },
          $inc: { refundedTotal: refundAmount }
        },
        { new: true }
      ).populate('products.productId');

      // Check if all products are cancelled, then cancel the entire order
      const remainingActiveProducts = updatedOrder.products.filter(p => p.status !== 'Cancelled');
      if (remainingActiveProducts.length === 0) {
        updatedOrder.status = 'Cancelled';
        await updatedOrder.save();
      }
    } else {
      if (order.products.every(p => p.status === 'Cancelled')) {
        return res.status(400).json({ success: false, message: 'Order is already fully cancelled' });
      }

      for (const product of order.products) {
        if (product.status !== 'Cancelled') {
          await productModel.findByIdAndUpdate(
            product.productId,
            { $inc: { stock: product.quantity } },
            { new: true }
          );
        }
      }

      refundAmount = order.products.reduce((sum, p) => {
        return p.status !== 'Cancelled' ? sum + p.price * p.quantity : sum;
      }, 0);

      updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        {
          status: 'Cancelled',
          $set: { 'products.$[].status': 'Cancelled' }
        },
        { new: true }
      ).populate('products.productId');
    }

    if (['Razorpay', 'Wallet'].includes(updatedOrder.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId });

      if (isNaN(refundAmount)) {
        return res.status(400).json({ success: false, message: 'Invalid refund amount' });
      }

      const transactionType = 'credit';
      const description = productId
        ? `Refund for cancelled product in order ${orderId}`
        : `Refund for cancelled order ${orderId}`;

      try {
        if (wallet) {
          wallet.transaction.push({
            transactionType,
            amount: refundAmount,
            date: new Date(),
            description
          });
          wallet.balance += refundAmount;
          await wallet.save();
        } else {
          wallet = new walletModel({
            userId,
            transaction: [{
              transactionType,
              amount: refundAmount,
              date: new Date(),
              description
            }],
            balance: refundAmount
          });
          await wallet.save();
        }
      } catch (walletError) {
        console.error('Error updating wallet:', walletError);
        return res.status(500).json({ success: false, message: 'Failed to process refund' });
      }
    }

    res.json({
      success: true,
      order: updatedOrder,
      refundAmount,
      message: productId ? 'Product cancelled successfully' : 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel' });
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
  const orderId = req.params.id;
  try {
    const order = await orderModel.findOne({ _id: orderId }).populate('products.productId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const wallet = await walletModel.findOne({ userId: order.userId });
    let walletBalance = wallet ? wallet.balance : 0;
    let refundAmount = 0;

    if (order.status === 'Delivered') {
      order.status = 'Returned';

      // Update each product's status and calculate refund amount
      for (const product of order.products) {
        // Update status to Returned for products that are not Cancelled or already Returned
        if (product.status !== 'Cancelled' && product.status !== 'Returned') {
          product.status = 'Returned'; // Update product status to Returned
          const productToUpdate = product.productId;
          productToUpdate.stock += product.quantity;
          await productToUpdate.save();

          // Only include price in refund if product was not previously Returned
          if (product.status !== 'Returned') {
            const productPrice = product.discountedPrice !== undefined && product.discountedPrice !== null
              ? product.discountedPrice
              : product.price;
            refundAmount += productPrice * product.quantity;
          }
        }
      }

      // Only update refundedTotal and wallet if there is a refund amount
      if (refundAmount > 0) {
        order.refundedTotal = (order.refundedTotal || 0) + refundAmount;
        walletBalance += refundAmount;

        // Update wallet
        if (wallet) {
          wallet.transaction.push({
            transactionType: 'credit',
            amount: refundAmount,
            date: new Date(),
          });
          wallet.balance = walletBalance;
          await wallet.save();
        } else {
          const newWallet = new walletModel({
            userId: order.userId,
            transaction: [
              {
                transactionType: 'credit',
                amount: refundAmount,
                date: new Date(),
              },
            ],
            balance: walletBalance,
          });
          await newWallet.save();
        }
      }

      await order.save();
      res.json({ success: true, refundAmount });
    } else {
      res.status(400).json({ message: 'Order is not in Delivered status' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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

const getOrder = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.session.user;

  try {
    const order = await orderModel.findOne({ _id: orderId, userId }).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
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
  createOrderWithRazorpay,
  createOrderWithOCD,
  walletOrder,
  loadGreetingsPage,
  cancelOrder,
  loadOrdersPage,
  returnOrder,
  paymentSuccess,
  retryPayment,
  loadRetryPaymentPage,
  getOrder
}