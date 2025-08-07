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
    let { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
    totalPrice = Number(totalPrice);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    const options = {
      amount: Math.round(totalPrice * 100),
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

    // Calculate original total (before coupon discount)
    let originalTotal = 0;
    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      const original = product.price;
      const isOfferApplied = discounted < original;

      // Add to original total (using offer price if available)
      const effectivePrice = isOfferApplied ? discounted : original;
      originalTotal += effectivePrice * quantity;

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

    // Prepare order data
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
      originalTotal: originalTotal,
      status: 'Pending',
      deliveryDate: deliveryDate,
      paymentMethod: paymentMethod,
      totalDiscount: totalDiscount || 0,
      paymentStatus: 'failed',
      razorpayId: razorpayOrder.id
    };

    // Add coupon data if coupon was applied
    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    const newOrder = await orderModel.create(orderData);

    // Update product stock
    for (const product of products) {
      const { productId, quantity } = product;
      await productModel.updateOne(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
    }

    // Clear cart and update coupon usage
    await cartModel.findOneAndDelete({ userId: userId });
    if (couponId) {
      await updateCouponUser(couponId, userId);
    }

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

// Create order with COD
const createOrderWithOCD = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
  const userId = req.session.user;
  const productTotal = totalPrice - 100;

  try {
    if (productTotal > 1000) {
      return res.json({ success: false, message: 'Cannot get Cash on delivery above 1000 rupees' });
    }

    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).send("Address not found");
    }

    const cart = await cartModel.findOne({ userId: userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send("Cart is empty");
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });

    // Calculate original total (before coupon discount)
    let originalTotal = 0;
    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      const original = product.price;
      const isOfferApplied = discounted < original;

      // Add to original total (using offer price if available)
      const effectivePrice = isOfferApplied ? discounted : original;
      originalTotal += effectivePrice * quantity;

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

    // Prepare order data
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
      originalTotal: originalTotal, // Store original total before coupon
      status: 'Pending',
      paymentMethod: paymentMethod,
      totalDiscount: totalDiscount || 0
    };

    // Add coupon data if coupon was applied
    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    await orderModel.create(orderData);

    // Update product stock
    for (const product of products) {
      const { productId, quantity } = product;
      await productModel.findOneAndUpdate(
        { _id: productId },
        { $inc: { stock: -quantity } },
        { new: true }
      );
    }

    // Clear cart and update coupon usage
    await cartModel.findOneAndDelete({ userId: userId });
    if (couponId) {
      await updateCouponUser(couponId, userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Create order with wallet payment
const walletOrder = async (req, res) => {
  const { totalPrice, paymentMethod, addressId, totalDiscount, couponId, couponCode, couponDiscount } = req.body;
  const userId = req.session.user;

  try {
    const address = await addressModel.findOne({ _id: addressId });
    if (!address) {
      return res.status(400).json({ success: false, message: 'Address not found' });
    }

    const userWallet = await walletModel.findOne({ userId: userId });
    if (!userWallet) {
      return res.status(400).json({
        success: false,
        message: "Cannot pay with Wallet – wallet not found for this user"
      });
    }

    const userBalance = userWallet.balance;
    if (userBalance < totalPrice) {
      return res.json({ success: false, message: "Cannot pay with Wallet - your wallet doesn't have enough money" });
    }

    const cart = await cartModel.findOne({ userId: userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).send("Cart is empty");
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } });

    // Calculate original total (before coupon discount)
    let originalTotal = 0;
    const products = cart.products.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const discounted = getDiscountedPrice(product, activeOffers);
      const original = product.price;
      const isOfferApplied = discounted < original;

      // Add to original total (using offer price if available)
      const effectivePrice = isOfferApplied ? discounted : original;
      originalTotal += effectivePrice * quantity;

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

    // Prepare order data
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
      originalTotal: originalTotal, // Store original total before coupon
      status: 'Pending',
      paymentMethod: paymentMethod,
      totalDiscount: totalDiscount || 0
    };

    // Add coupon data if coupon was applied
    if (couponId && couponCode) {
      orderData.appliedCoupon = couponId;
      orderData.couponCode = couponCode;
      orderData.couponDiscount = couponDiscount || 0;
    }

    const newOrder = await orderModel.create(orderData);

    // Update product stock
    for (const product of products) {
      const { productId, quantity } = product;
      await productModel.findOneAndUpdate(
        { _id: productId },
        { $inc: { stock: -quantity } },
        { new: true }
      );
    }

    // Update wallet balance and add transaction
    const walletBalance = userBalance - totalPrice;
    userWallet.transaction.push({
      transactionType: 'debit',
      amount: newOrder.total,
      date: new Date(),
      description: `Payment for order ${newOrder._id}`
    });
    userWallet.balance = walletBalance;
    await userWallet.save();

    // Clear cart and update coupon usage
    await cartModel.findOneAndDelete({ userId: userId });
    if (couponId) {
      await updateCouponUser(couponId, userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }
};

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
    const order = await orderModel.findOne({ _id: orderId }).populate('appliedCoupon');
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

      // Update product stock
      await productModel.findByIdAndUpdate(
        productId,
        { $inc: { stock: productToCancel.quantity } },
        { new: true }
      );

      // Calculate remaining cart total after cancelling this product (using offer prices)
      const remainingProducts = order.products.filter(p =>
        p.productId.toString() !== productId && p.status !== 'Cancelled'
      );

      const remainingCartTotal = remainingProducts.reduce((sum, p) => {
        const productPrice = p.discountedPrice ?? p.price; // Use offer price if available
        return sum + (productPrice * p.quantity);
      }, 0);

      let couponStillValid = true;
      let couponDiscountToRemove = 0;

      // Check if coupon is still valid after product cancellation
      if (order.appliedCoupon && remainingCartTotal < order.appliedCoupon.minPurchaseLimit) {
        couponStillValid = false;

        // Calculate the coupon discount that was applied to the cancelled product
        const cancelledProductPrice = productToCancel.discountedPrice ?? productToCancel.price;
        const cancelledProductTotal = cancelledProductPrice * productToCancel.quantity;

        // Calculate proportional coupon discount on this product
        const currentOrderTotal = order.products.reduce((sum, p) => {
          if (p.status !== 'Cancelled') {
            const productPrice = p.discountedPrice ?? p.price;
            return sum + (productPrice * p.quantity);
          }
          return sum;
        }, 0);

        if (order.couponDiscount && currentOrderTotal > 0) {
          couponDiscountToRemove = (cancelledProductTotal / currentOrderTotal) * order.couponDiscount;
        }
      }

      // Calculate refund amount
      const productOfferPrice = productToCancel.discountedPrice ?? productToCancel.price;
      const productSubtotal = productOfferPrice * productToCancel.quantity;

      if (couponStillValid) {
        // Coupon still valid - refund offer price minus proportional coupon discount
        const proportionalCouponDiscount = order.couponDiscount ?
          (productSubtotal / (order.originalTotal || order.total + order.totalDiscount)) * order.couponDiscount : 0;
        refundAmount = productSubtotal - proportionalCouponDiscount;
      } else {
        // Coupon no longer valid - refund full offer price (no coupon discount)
        refundAmount = productSubtotal;
      }

      // Prepare update query
      const updateQuery = {
        $set: { 'products.$.status': 'Cancelled' },
        $inc: { refundedTotal: refundAmount }
      };

      // If coupon is no longer valid, remove coupon discount and update totals
      if (!couponStillValid && order.appliedCoupon) {
        updateQuery.$unset = { appliedCoupon: 1 };
        updateQuery.$set.couponCode = null;
        updateQuery.$set.couponDiscount = 0;
        updateQuery.$set.totalDiscount = Math.max(0, order.totalDiscount - order.couponDiscount);
      }

      updatedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId, 'products.productId': productId },
        updateQuery,
        { new: true }
      ).populate('products.productId');

      // Check if all products are cancelled, then cancel the entire order
      const remainingActiveProducts = updatedOrder.products.filter(p => p.status !== 'Cancelled');
      if (remainingActiveProducts.length === 0) {
        updatedOrder.status = 'Cancelled';
        await updatedOrder.save();
      }

    } else {
      // Cancel entire order logic
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

      // For full order cancellation, refund the actual total paid (including all discounts)
      refundAmount = order.total - order.refundedTotal;

      updatedOrder = await orderModel.findByIdAndUpdate(
        orderId,
        {
          status: 'Cancelled',
          $set: { 'products.$[].status': 'Cancelled' },
          $inc: { refundedTotal: refundAmount }
        },
        { new: true }
      ).populate('products.productId');
    }

    // Process refund to wallet if applicable
    if (['Razorpay', 'Wallet'].includes(updatedOrder.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId });

      if (isNaN(refundAmount)) {
        return res.status(400).json({ success: false, message: 'Invalid refund amount' });
      }

      const transactionType = 'credit';
      const description = productId
        ? `Refund for cancelled product in order ${orderId}${!couponStillValid ? ' (coupon removed)' : ''}`
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
      couponRemoved: productId ? !couponStillValid : false,
      message: productId ?
        `Product cancelled successfully${!couponStillValid ? ' (coupon discount removed due to minimum purchase limit)' : ''}` :
        'Order cancelled successfully'
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

      // Calculate refund before changing status
      for (const product of order.products) {
        if (product.status !== 'Cancelled' && product.status !== 'Returned') {
          const productPrice = product.discountedPrice !== undefined && product.discountedPrice !== null
            ? product.discountedPrice
            : product.price;
          refundAmount += productPrice * product.quantity;

          const productToUpdate = product.productId;
          productToUpdate.stock += product.quantity;
          await productToUpdate.save();

          product.status = 'Returned';
        }
      }

      // Refund only if there is a refund amount
      if (refundAmount > 0) {
        order.refundedTotal = (order.refundedTotal || 0) + refundAmount;
        walletBalance += refundAmount;

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
            balance: refundAmount,
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
    const order = await orderModel.findOne({ razorpayId: razorpayId })
      .populate('products.productId');
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