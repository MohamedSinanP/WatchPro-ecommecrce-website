const orderModel = require('../../models/orderModel');


// to show dashboard

const loadDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) return res.redirect('/admin/login');
    const period = req.query.period || 'monthly';

    // Filter condition for delivered orders only
    const deliveredFilter = { status: 'Delivered' };

    // Monthly sales aggregation (only delivered orders)
    const monthlySales = await orderModel.aggregate([
      { $match: deliveredFilter }, // Filter for delivered orders
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          totalSales: 1,
          orderCount: 1
        }
      }
    ]);

    // Yearly sales aggregation (only delivered orders)
    const yearlySales = await orderModel.aggregate([
      { $match: deliveredFilter }, // Filter for delivered orders
      {
        $group: {
          _id: { year: { $year: "$createdAt" } },
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          totalSales: 1,
          orderCount: 1
        }
      }
    ]);

    // Weekly sales aggregation (only delivered orders)
    const weeklySales = await orderModel.aggregate([
      { $match: deliveredFilter },
      {
        $group: {
          _id: { week: { $week: "$createdAt" }, year: { $year: "$createdAt" } },
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      {
        $project: {
          _id: 0,
          week: "$_id.week",
          year: "$_id.year",
          totalSales: 1,
          orderCount: 1
        }
      }
    ]);

    // Get total revenue and order counts
    const totalStats = await orderModel.aggregate([
      { $match: deliveredFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Aggregate top-selling products, categories, and brands (only from delivered orders)
    const [topSellingProducts, topSellingCategories, topSellingBrands] = await Promise.all([
      // Top-selling products based on quantity ordered (delivered only)
      orderModel.aggregate([
        { $match: deliveredFilter },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.productId",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: "$productDetails.name",
            price: "$productDetails.price",
            totalQuantity: 1,
            totalRevenue: 1,
            image: { $arrayElemAt: ["$productDetails.images", 0] }
          }
        }
      ]),

      // Top-selling categories based on orders (delivered only)
      orderModel.aggregate([
        { $match: deliveredFilter },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails"
          }
        },
        { $unwind: "$categoryDetails" },
        {
          $project: {
            _id: 0,
            categoryName: "$categoryDetails.name",
            totalQuantity: 1,
            totalRevenue: 1
          }
        }
      ]),

      // Top-selling brands based on quantity (delivered only)
      orderModel.aggregate([
        { $match: deliveredFilter },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.brand",
            totalQuantity: { $sum: "$products.quantity" },
            totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            brandName: "$_id",
            totalQuantity: 1,
            totalRevenue: 1
          }
        }
      ])
    ]);

    res.render('admin/dashboard', {
      admin,
      period,
      topSellingProducts,
      topSellingCategories,
      topSellingBrands,
      monthlySales,
      yearlySales,
      weeklySales,
      totalStats: totalStats[0] || { totalRevenue: 0, totalOrders: 0 }
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.send('An error occurred while loading the dashboard.');
  }
};

module.exports = { loadDashboard }