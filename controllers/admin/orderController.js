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
    const order = await orderModel.findById(id).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if status update is allowed
    if (!isStatusUpdateAllowed(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from '${order.status}' to '${status}'. Invalid status progression.`
      });
    }

    order.status = status;

    let refundAmount = 0;

    if (status === 'Delivered') {
      order.deliveryDate = new Date();
    }

    if (['Confirmed', 'Shipped', 'Delivered'].includes(status)) {
      order.products.forEach(product => {
        if (!['Cancelled', 'Returned'].includes(product.status)) {
          product.status = status;
        }
      });
    }

    if (status === 'Cancelled' || status === 'Returned') {
      for (const product of order.products) {
        const isCancelledRefund = status === 'Cancelled' && !['Delivered', 'Returned', 'Cancelled'].includes(product.status);
        const isReturnedRefund = status === 'Returned' && product.status === 'Delivered';

        if (isCancelledRefund || isReturnedRefund) {
          // Restore product stock
          await productModel.findByIdAndUpdate(
            product.productId,
            { $inc: { stock: product.quantity } },
            { new: true }
          );

          product.status = status; // Set product status to Cancelled or Returned
          refundAmount += (product.discountedPrice ?? product.price) * product.quantity;
        }
      }

      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;
    }

    // Ensure single-product order reflects Returned status
    if (order.products.length === 1 && status === 'Returned') {
      order.products[0].status = 'Returned';
    }

    // Process refund to wallet for Razorpay
    if ((status === 'Cancelled' || status === 'Returned') && order.paymentMethod === 'Razorpay' && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for ${status.toLowerCase()} order ${id}`;

      try {
        if (wallet) {
          wallet.transaction.push({
            transactionType,
            amount: refundAmount.toString(),
            date: new Date(),
            description
          });
          wallet.balance += refundAmount;
          await wallet.save();
        } else {
          wallet = new walletModel({
            userId: order.userId,
            transaction: [{
              transactionType,
              amount: refundAmount.toString(),
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

    await order.save();
    res.json({ success: true, message: 'Order status updated successfully' });

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
    const order = await orderModel.findById(orderId).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const product = order.products.id(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    // Check if product status update is allowed
    const currentProductStatus = product.status || 'Pending';
    if (!isStatusUpdateAllowed(currentProductStatus, status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change product status from '${currentProductStatus}' to '${status}'. Invalid status progression.`
      });
    }

    let refundAmount = 0;
    if (['Cancelled', 'Returned'].includes(status)) {
      // Update stock for cancelled or returned products
      await productModel.findByIdAndUpdate(
        product.productId,
        { $inc: { stock: product.quantity } },
        { new: true }
      );
      refundAmount = (product.discountedPrice ?? product.price) * product.quantity;
      order.refundedTotal = (order.refundedTotal || 0) + refundAmount;
    }

    // Update product status
    product.status = status;

    // For single-product orders, ensure product status matches when returned
    if (order.products.length === 1 && status === 'Returned') {
      product.status = 'Returned';
    }

    // Process refund to wallet only for Razorpay payment method
    if (['Cancelled', 'Returned'].includes(status) && order.paymentMethod === 'Razorpay' && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for ${status.toLowerCase()} product ${productId} in order ${orderId}`;

      try {
        if (wallet) {
          wallet.transaction.push({
            transactionType,
            amount: refundAmount.toString(),
            date: new Date(),
            description
          });
          wallet.balance += refundAmount;
          await wallet.save();
        } else {
          wallet = new walletModel({
            userId: order.userId,
            transaction: [{
              transactionType,
              amount: refundAmount.toString(),
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

    const newOrderStatus = determineOrderStatus(order.products);
    order.status = newOrderStatus;

    if (newOrderStatus === 'Delivered' && !order.deliveryDate) {
      order.deliveryDate = new Date();
    }

    await order.save();
    res.json({
      success: true,
      message: 'Product status updated successfully',
      newOrderStatus: newOrderStatus
    });

  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Updated cancel order function
const cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order can be cancelled using the status progression logic
    if (!isStatusUpdateAllowed(order.status, 'Cancelled')) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status '${order.status}'. Order can only be cancelled if not delivered, returned, or already cancelled.`
      });
    }

    // Update order and all product statuses to cancelled
    order.status = 'Cancelled';
    let refundAmount = 0;

    for (const product of order.products) {
      if (!['Delivered', 'Returned', 'Cancelled'].includes(product.status)) {
        // Update stock for non-delivered, non-cancelled, non-returned products
        await productModel.findByIdAndUpdate(
          product.productId,
          { $inc: { stock: product.quantity } },
          { new: true }
        );
        product.status = 'Cancelled';
        refundAmount += (product.discountedPrice ?? product.price) * product.quantity;
      }
    }

    order.refundedTotal = (order.refundedTotal || 0) + refundAmount;

    // Process refund to wallet only for Razorpay payment method
    if (order.paymentMethod === 'Razorpay' && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for cancelled order ${id}`;

      try {
        if (wallet) {
          wallet.transaction.push({
            transactionType,
            amount: refundAmount.toString(),
            date: new Date(),
            description
          });
          wallet.balance += refundAmount;
          await wallet.save();
        } else {
          wallet = new walletModel({
            userId: order.userId,
            transaction: [{
              transactionType,
              amount: refundAmount.toString(),
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

    await order.save();
    res.json({ success: true, message: 'Order cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Function to handle bulk product status updates
const bulkUpdateProductStatus = async (req, res) => {
  const { orderId } = req.params;
  const { updates } = req.body;

  try {
    const order = await orderModel.findById(orderId).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let refundAmount = 0;
    const invalidUpdates = [];

    // Validate all updates first
    updates.forEach(update => {
      const product = order.products.id(update.productId);
      if (product) {
        const currentStatus = product.status || 'Pending';
        if (!isStatusUpdateAllowed(currentStatus, update.status)) {
          invalidUpdates.push({
            productId: update.productId,
            currentStatus,
            requestedStatus: update.status
          });
        }
      }
    });

    // If any updates are invalid, return error
    if (invalidUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some status updates are not allowed',
        invalidUpdates
      });
    }

    // Update multiple products
    updates.forEach(update => {
      const product = order.products.id(update.productId);
      if (product && !['Delivered', 'Returned', 'Cancelled'].includes(product.status)) {
        if (['Cancelled', 'Returned'].includes(update.status)) {
          // Update stock for cancelled or returned products
          productModel.findByIdAndUpdate(
            product.productId,
            { $inc: { stock: product.quantity } },
            { new: true }
          );
          refundAmount += (product.discountedPrice ?? product.price) * product.quantity;
        }
        product.status = update.status;
      }
    });

    // Process refund to wallet only for Razorpay payment method
    if (refundAmount > 0 && order.paymentMethod === 'Razorpay') {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for bulk ${updates.some(u => u.status === 'Returned') ? 'return' : 'cancellation'} in order ${orderId}`;

      try {
        if (wallet) {
          wallet.transaction.push({
            transactionType,
            amount: refundAmount.toString(),
            date: new Date(),
            description
          });
          wallet.balance += refundAmount;
          await wallet.save();
        } else {
          wallet = new walletModel({
            userId: order.userId,
            transaction: [{
              transactionType,
              amount: refundAmount.toString(),
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

    order.refundedTotal = (order.refundedTotal || 0) + refundAmount;

    // Auto-determine order status
    const newOrderStatus = determineOrderStatus(order.products);
    order.status = newOrderStatus;

    // Set delivery date if needed
    if (newOrderStatus === 'Delivered' && !order.deliveryDate) {
      order.deliveryDate = new Date();
    }

    await order.save();
    res.json({
      success: true,
      message: 'Product statuses updated successfully',
      newOrderStatus: newOrderStatus
    });

  } catch (error) {
    console.error('Error updating product statuses:', error);
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

module.exports = {
  loadOrders,
  updateOrderStatus,
  updateProductStatus,
  cancelOrder,
  bulkUpdateProductStatus,
  deleteOrder,
  getAllowedNextStatuses
};