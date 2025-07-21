const orderModel = require('../../models/orderModel');
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
    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = status;

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
      order.products.forEach(product => {
        if (product.status !== 'Delivered') {
          product.status = 'Cancelled';
        }
      });
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
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const product = order.products.id(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    product.status = status;

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
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update multiple products
    updates.forEach(update => {
      const product = order.products.id(update.productId);
      if (product) {
        product.status = update.status;
      }
    });

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


module.exports = {
  loadOrders,
  updateOrderStatus,
  updateProductStatus,
  cancelOrder,
  bulkUpdateProductStatus,
}