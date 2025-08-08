const orderModel = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const walletModel = require('../../models/walletModel');
const determineOrderStatus = require('../../utils/getOrderStatus');
require('dotenv').config();

const STATUS_HIERARCHY = {
  'Pending': 0,
  'Confirmed': 1,
  'Shipped': 2,
  'Delivered': 3,
  'Cancelled': -1,
  'Returned': -2
};

// Function to check if status update is allowed
const isStatusUpdateAllowed = (currentStatus, newStatus) => {
  const currentLevel = STATUS_HIERARCHY[currentStatus] || 0;
  const newLevel = STATUS_HIERARCHY[newStatus] || 0;

  // Special cases for Cancelled and Returned
  if (newStatus === 'Cancelled') {
    // Can cancel only if not delivered, returned, or already cancelled
    return !['Delivered', 'Returned', 'Cancelled'].includes(currentStatus);
  }

  if (newStatus === 'Returned') {
    // Can return only if delivered
    return currentStatus === 'Delivered';
  }

  // For normal progression (Pending -> Confirmed -> Shipped -> Delivered)
  if (currentLevel >= 0 && newLevel >= 0) {
    // Only allow forward progression or same status
    return newLevel >= currentLevel;
  }

  // Don't allow changing from Cancelled/Returned to other states
  if (currentLevel < 0 && newLevel >= 0) {
    return false;
  }

  return false;
};

// Function to get allowed next statuses
const getAllowedNextStatuses = (currentStatus) => {
  const allowedStatuses = [];

  switch (currentStatus) {
    case 'Pending':
      allowedStatuses.push('Pending', 'Confirmed', 'Cancelled');
      break;
    case 'Confirmed':
      allowedStatuses.push('Confirmed', 'Shipped', 'Cancelled');
      break;
    case 'Shipped':
      allowedStatuses.push('Shipped', 'Delivered', 'Cancelled');
      break;
    case 'Delivered':
      allowedStatuses.push('Delivered', 'Returned');
      break;
    case 'Cancelled':
      allowedStatuses.push('Cancelled');
      break;
    case 'Returned':
      allowedStatuses.push('Returned');
      break;
    default:
      allowedStatuses.push('Pending', 'Confirmed', 'Cancelled');
  }

  return allowedStatuses;
};

// to show orders in admin side
const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await orderModel.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await orderModel.find({})
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: 'fullName' })
      .populate({ path: 'address' })
      .populate('products.productId', 'name images')
      .skip(skip)
      .limit(limit);

    // Add allowed statuses for each order
    const ordersWithAllowedStatuses = orders.map(order => {
      const orderObj = order.toJSON();
      orderObj.allowedStatuses = getAllowedNextStatuses(order.status);

      // Add allowed statuses for each product
      orderObj.products = orderObj.products.map(product => ({
        ...product,
        allowedStatuses: getAllowedNextStatuses(product.status || 'Pending')
      }));

      return orderObj;
    });

    if (req.xhr) {
      res.render('partials/admin/orderTable', {
        orders: ordersWithAllowedStatuses,
        currentPage: page,
        totalPages,
        limit,
        currentRoute: req.path
      });
    } else {
      res.render('admin/order', {
        orders: ordersWithAllowedStatuses,
        currentPage: page,
        totalPages,
        limit
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// to update the status of the order
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await orderModel.findById(id)
      .populate('products.productId')
      .populate('appliedCoupon');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!isStatusUpdateAllowed(order.status, status)) {
      return res.status(400).json({ success: false, message: `Invalid status change from '${order.status}' to '${status}'` });
    }

    order.status = status;
    let refundAmount = 0;
    let couponRemoved = false;

    if (status === 'Delivered') {
      order.deliveryDate = new Date();
      order.products.forEach(p => {
        if (!['Cancelled', 'Returned'].includes(p.status)) {
          p.status = 'Delivered';
        }
      });
    }

    if (status === 'Cancelled') {
      // FULL ORDER CANCELLATION
      for (const product of order.products) {
        if (product.status !== 'Cancelled') {
          await restoreStock(product.productId, product.variantSize, product.quantity);
          product.status = 'Cancelled';
        }
      }
      refundAmount = (order.total || 0) - (order.refundedTotal || 0);
      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;

      if (order.appliedCoupon) {
        couponRemoved = true;
        order.appliedCoupon = null;
        order.couponCode = null;
        order.couponDiscount = 0;
        order.totalDiscount = 0;
      }
    }

    if (status === 'Returned') {
      // WHOLE ORDER RETURN → refund total - ₹100 delivery charge
      for (const product of order.products) {
        if (product.status === 'Delivered') {
          await restoreStock(product.productId, product.variantSize, product.quantity);
          product.status = 'Returned';
        }
      }
      refundAmount = Math.max((order.total || 0) - 100, 0);
      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;

      if (order.appliedCoupon) {
        couponRemoved = true;
        order.appliedCoupon = null;
        order.couponCode = null;
        order.couponDiscount = 0;
        order.totalDiscount = 0;
      }
    }

    // Wallet Refund
    if ((status === 'Cancelled' || status === 'Returned') && ['Razorpay', 'Wallet'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });
      const description = `${status} refund for order ${id}${couponRemoved ? ' (coupon removed)' : ''}`;
      if (wallet) {
        wallet.transaction.push({ transactionType: 'credit', amount: refundAmount, date: new Date(), description });
        wallet.balance += refundAmount;
        await wallet.save();
      } else {
        wallet = new walletModel({
          userId: order.userId,
          transaction: [{ transactionType: 'credit', amount: refundAmount, date: new Date(), description }],
          balance: refundAmount
        });
        await wallet.save();
      }
    }

    await order.save();
    res.json({ success: true, message: `Order marked as ${status}`, refundAmount, couponRemoved });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// to update the status of a specific product in an order
const updateProductStatus = async (req, res) => {
  const { orderId, productId } = req.params;
  const { status } = req.body;

  try {
    const order = await orderModel.findById(orderId)
      .populate('products.productId')
      .populate('appliedCoupon');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const product = order.products.id(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found in order' });

    if (!isStatusUpdateAllowed(product.status || 'Pending', status)) {
      return res.status(400).json({ success: false, message: `Invalid status change from '${product.status}' to '${status}'` });
    }

    let refundAmount = 0;
    let couponRemoved = false;

    if (status === 'Cancelled') {
      // Before change — proportional refund
      const preTotals = recalcOrderTotals(order.products, order.appliedCoupon);
      const productSubtotalBefore = (product.discountedPrice ?? product.price) * product.quantity;

      let productPaid = productSubtotalBefore;
      if (preTotals.discountedSubtotal > 0 && preTotals.couponDiscount > 0) {
        const couponShare = (productSubtotalBefore / preTotals.discountedSubtotal) * preTotals.couponDiscount;
        productPaid = productSubtotalBefore - couponShare;
      }

      // Restore stock
      await restoreStock(product.productId, product.variantSize, product.quantity);
      product.status = 'Cancelled';

      // After change — check coupon validity
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
    }

    product.status = status;
    order.status = determineOrderStatus(order.products);

    // Wallet Refund
    if (status === 'Cancelled' && ['Razorpay', 'Wallet'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });
      const description = `Refund for cancelled product ${productId} in order ${orderId}${couponRemoved ? ' (coupon removed)' : ''}`;
      if (wallet) {
        wallet.transaction.push({ transactionType: 'credit', amount: refundAmount, date: new Date(), description });
        wallet.balance += refundAmount;
        await wallet.save();
      } else {
        wallet = new walletModel({
          userId: order.userId,
          transaction: [{ transactionType: 'credit', amount: refundAmount, date: new Date(), description }],
          balance: refundAmount
        });
        await wallet.save();
      }
    }

    await order.save();
    res.json({ success: true, message: `Product status updated to ${status}`, refundAmount, couponRemoved });

  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// === Restore stock helper ===
const restoreStock = async (productId, variantSize, qty) => {
  const product = await productModel.findById(productId);
  if (product) {
    const variant = product.variants.find(v => v.size === variantSize);
    if (variant) variant.stock += qty;
    product.stock += qty;
    await product.save();
  }
};

// === Recalculate totals & coupon logic ===
const recalcOrderTotals = (products, appliedCoupon) => {
  const activeProducts = products.filter(p => p.status !== 'Cancelled');

  const originalSubtotal = activeProducts.reduce(
    (sum, p) => sum + (p.price ?? 0) * (p.quantity ?? 0), 0
  );

  const discountedSubtotal = activeProducts.reduce((sum, p) => {
    const price = (p.discountedPrice ?? p.price) ?? 0;
    return sum + price * (p.quantity ?? 0);
  }, 0);

  const offerDiscount = originalSubtotal - discountedSubtotal;

  let couponDiscount = 0;
  let couponStillValid = false;

  if (appliedCoupon && discountedSubtotal >= appliedCoupon.minPurchaseLimit) {
    couponStillValid = true;
    if (appliedCoupon.discountType === 'percentage') {
      couponDiscount = Math.min(
        (discountedSubtotal * appliedCoupon.discount) / 100,
        appliedCoupon.maxDiscount || Infinity
      );
    } else {
      couponDiscount = Math.min(
        appliedCoupon.discount,
        appliedCoupon.maxDiscount || appliedCoupon.discount
      );
    }
  }

  const totalDiscount = offerDiscount + couponDiscount;
  const finalTotal = discountedSubtotal - couponDiscount;

  return {
    originalSubtotal,
    discountedSubtotal,
    offerDiscount,
    couponDiscount,
    couponStillValid,
    totalDiscount,
    finalTotal
  };
};

module.exports = {
  loadOrders,
  updateOrderStatus,
  updateProductStatus,
  deleteOrder,
  getAllowedNextStatuses
};