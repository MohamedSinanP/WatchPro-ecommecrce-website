const orderModel = require('../../models/orderModel');

const loadOrdersPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalOrders = await orderModel.countDocuments({ userId });
    const orders = await orderModel
      .find({ userId })
      .populate('products.productId')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const totalPages = Math.ceil(totalOrders / limit);
    const currentPage = page;

    res.render('user/orders', { orders, currentPage, totalPages, limit });
  } catch (error) {
    console.error('Error loading orders page:', error);
    res.status(500).send('Cannot load order page. Try again');
  }
};

const loadGreetingsPage = async (req, res) => {
  res.render('user/orderGreetings');
};

module.exports = {
  loadOrdersPage,
  loadGreetingsPage
};