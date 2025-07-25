const orderModel = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const walletModel = require('../../models/walletModel');
const determineOrderStatus = require('../../utils/getOrderStatus');
require('dotenv').config();



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

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await orderModel.findById(id).populate('products.productId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;

    let refundAmount = 0;

    if (status === 'Delivered') {
      order.deliveryDate = new Date();
    }

    if (['Confirmed', 'Shipped', 'Delivered'].includes(status)) {
      order.products.forEach(product => {
        if (!['Cancelled', 'Returned'].includes(product.status)) {
          product.status = status === 'Delivered' ? 'Delivered' : 'Ordered';
        }
      });
    }

    if (status === 'Cancelled') {
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
    }

    // Process refund to wallet for 'Razorpay' or 'Wallet' payment methods
    if (status === 'Cancelled' && ['Razorpay', 'Wallet'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for cancelled order ${id}`;

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
            userId: order.userId,
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

    await order.save();
    res.json({ success: true, message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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

    // Check if the product can be cancelled or returned
    if (['Delivered', 'Returned', 'Cancelled'].includes(product.status) && ['Cancelled', 'Returned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Product cannot be cancelled or returned' });
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

    product.status = status;

    // Process refund to wallet for 'Razorpay' or 'Wallet' payment methods
    if (['Cancelled', 'Returned'].includes(status) && ['Razorpay', 'Wallet'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for ${status.toLowerCase()} product ${productId} in order ${orderId}`;

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
            userId: order.userId,
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

// Updated cancel order function with better logic
const cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (order.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order'
      });
    }

    // Update order and all product statuses to cancelled
    order.status = 'Cancelled';
    order.products.forEach(product => {
      if (product.status !== 'Delivered') {
        product.status = 'Cancelled';
      }
    });

    // Handle refunds if payment was successful
    if (order.paymentStatus === 'success') {
      const deliveredProducts = order.products.filter(p => p.status === 'Delivered');
      const deliveredTotal = deliveredProducts.reduce((sum, p) =>
        sum + (p.discountedPrice || p.price) * p.quantity, 0);

      order.refundedTotal = order.total - deliveredTotal;
      order.paymentStatus = 'failed'; // Mark as refunded
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

    // Process refund to wallet for 'Razorpay' or 'Wallet' payment methods
    if (refundAmount > 0 && ['Razorpay', 'Wallet'].includes(order.paymentMethod)) {
      let wallet = await walletModel.findOne({ userId: order.userId });

      const transactionType = 'credit';
      const description = `Refund for bulk ${updates.some(u => u.status === 'Returned') ? 'return' : 'cancellation'} in order ${orderId}`;

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
            userId: order.userId,
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
  deleteOrder
}