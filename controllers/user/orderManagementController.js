const mongoose = require('mongoose');
const orderModel = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const walletModel = require('../../models/walletModel');

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.id;
    const { productId } = req.body;
    const userId = req.session.user;

    let order = await orderModel
      .findById(orderId)
      .populate('appliedCoupon')
      .session(session);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['Delivered', 'Returned', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
    }

    let refundAmount = 0;
    let couponRemoved = false;

    const restoreStock = async (productId, variantSize, qty) => {
      const product = await productModel.findById(productId).session(session);
      if (product) {
        const variant = product.variants.find(v => v.size === variantSize);
        if (variant) variant.stock += qty;
        product.stock += qty;
        await product.save({ session });
      }
    };

    const recalcOrderTotals = (products, appliedCoupon) => {
      const activeProducts = products.filter(p => p.status !== 'Cancelled');
      const originalSubtotal = activeProducts.reduce((sum, p) => sum + (p.price ?? 0) * (p.quantity ?? 0), 0);
      const discountedSubtotal = activeProducts.reduce((sum, p) => {
        const price = (p.discountedPrice ?? p.price) ?? 0;
        return sum + price * (p.quantity ?? 0);
      }, 0);

      const offerDiscount = originalSubtotal - discountedSubtotal;
      let couponDiscount = 0;
      let couponStillValid = false;

      if (appliedCoupon && discountedSubtotal >= appliedCoupon.minPurchaseLimit) {
        couponStillValid = true;
        couponDiscount = appliedCoupon.discountType === 'percentage'
          ? Math.min((discountedSubtotal * appliedCoupon.discount) / 100, appliedCoupon.maxDiscount || Infinity)
          : Math.min(appliedCoupon.discount, appliedCoupon.maxDiscount || appliedCoupon.discount);
      }

      const totalDiscount = offerDiscount + couponDiscount;
      const finalTotal = discountedSubtotal - couponDiscount;

      return { originalSubtotal, discountedSubtotal, offerDiscount, couponDiscount, couponStillValid, totalDiscount, finalTotal };
    };

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

      const preTotals = recalcOrderTotals(order.products, order.appliedCoupon);
      const productSubtotalBefore = (productToCancel.discountedPrice ?? productToCancel.price) * productToCancel.quantity;
      let productPaid = productSubtotalBefore;

      if (preTotals.discountedSubtotal > 0 && preTotals.couponDiscount > 0) {
        const couponShare = (productSubtotalBefore / preTotals.discountedSubtotal) * preTotals.couponDiscount;
        productPaid -= couponShare;
      }

      await restoreStock(productId, productToCancel.variantSize, productToCancel.quantity);
      productToCancel.status = 'Cancelled';

      const postTotals = recalcOrderTotals(order.products, order.appliedCoupon);

      if (!postTotals.couponStillValid && order.appliedCoupon) {
        couponRemoved = true;
        order.appliedCoupon = null;
        order.couponCode = null;
        order.couponDiscount = 0;
        order.totalDiscount = postTotals.offerDiscount;
      } else {
        order.couponDiscount = postTotals.couponDiscount;
        order.totalDiscount = postTotals.totalDiscount;
      }

      refundAmount = productPaid;
      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;

      if (!order.products.some(p => p.status !== 'Cancelled')) {
        order.status = 'Cancelled';
      }

      await order.save({ session });
    } else {
      if (order.products.every(p => p.status === 'Cancelled')) {
        return res.status(400).json({ success: false, message: 'Order already fully cancelled' });
      }

      for (const product of order.products) {
        if (product.status !== 'Cancelled') {
          await restoreStock(product.productId, product.variantSize, product.quantity);
          product.status = 'Cancelled';
        }
      }

      refundAmount = (order.total || 0) - (order.refundedTotal || 0);
      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;
      order.status = 'Cancelled';

      if (order.appliedCoupon) {
        couponRemoved = true;
        order.appliedCoupon = null;
        order.couponCode = null;
        order.couponDiscount = 0;
        order.totalDiscount = 0;
      }

      await order.save({ session });
    }

    if (['Razorpay', 'Wallet'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId }).session(session);
      const transactionType = 'credit';
      const description = productId
        ? `Refund for cancelled product in order ${orderId}${couponRemoved ? ' (coupon removed)' : ''}`
        : `Refund for cancelled order ${orderId}`;

      if (wallet) {
        wallet.transaction.push({ transactionType, amount: refundAmount, date: new Date(), description });
        wallet.balance += refundAmount;
        await wallet.save({ session });
      } else {
        wallet = new walletModel({
          userId,
          transaction: [{ transactionType, amount: refundAmount, date: new Date(), description }],
          balance: refundAmount
        });
        await wallet.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      order,
      refundAmount,
      couponRemoved,
      message: productId
        ? `Product cancelled successfully${couponRemoved ? ' (coupon removed due to min purchase limit)' : ''}`
        : 'Order cancelled successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel' });
  }
};

const returnOrder = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await orderModel.findOne({ _id: orderId }).populate('products.productId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let wallet = await walletModel.findOne({ userId: order.userId });
    let refundAmount = 0;

    if (order.status === 'Delivered') {
      order.status = 'Returned';
      refundAmount = order.total - 100;

      for (const product of order.products) {
        if (product.status !== 'Cancelled' && product.status !== 'Returned') {
          const productDoc = product.productId;
          const variant = productDoc.variants.find(v => v.size === product.variantSize);
          if (variant) variant.stock += product.quantity;
          productDoc.stock += product.quantity;
          await productDoc.save();
          product.status = 'Returned';
        }
      }

      if (wallet) {
        wallet.transaction.push({
          transactionType: 'credit',
          amount: refundAmount,
          date: new Date(),
          description: `Refund for returned order ${order._id}`
        });
        wallet.balance += refundAmount;
        await wallet.save();
      } else {
        wallet = new walletModel({
          userId: order.userId,
          transaction: [{
            transactionType: 'credit',
            amount: refundAmount,
            date: new Date(),
            description: `Refund for returned order ${order._id}`
          }],
          balance: refundAmount
        });
        await wallet.save();
      }

      order.refundedTotal += refundAmount;
      await order.save();

      res.json({ success: true, refundAmount });
    } else {
      res.status(400).json({ message: 'Order is not in Delivered status' });
    }
  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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

module.exports = {
  cancelOrder,
  returnOrder,
  getOrder
};