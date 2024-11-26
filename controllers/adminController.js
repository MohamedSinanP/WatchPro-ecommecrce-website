const adminModel = require('../models/adminModel');
const userModel = require('../models/userModel');
const productModel = require('../models/productModel');
const orderModel = require('../models/orderModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs')


const loadLogin = async (req, res) => {
  res.render('admin/login')
};

const login = async (req, res) => {

  try {
    const { username, password } = req.body

    const admin = await adminModel.findOne({ username })
    if (!admin) {
      return res.render('admin/login', { message: 'invalid credintials' })
    }
    if (admin.password !== password) return res.render('admin/login', { message: 'invalid password ' });

    req.session.admin = true;
    res.redirect('/admin/dashboard');

  } catch (error) {
    res.send(error);
    console.error(error);

  }
};

const logout = async(req,res) => {
  try {
    req.session.admin = false;
    res.redirect('/admin/login');
  } catch (error) {
    res.status(500).send('Internal server error');
  }
}

const loadDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) return res.redirect('/admin/login');
    const period = req.query.period || 'monthly';

    // Monthly sales aggregation
    const monthlySales = await orderModel.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          totalSales: { $sum: "$total" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0, // Hide the _id field
          month: "$_id.month",
          year: "$_id.year",
          totalSales: 1
        }
      }
    ]);

    // Yearly sales aggregation
    const yearlySales = await orderModel.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" } },
          totalSales: { $sum: "$total" }
        }
      },
      { $sort: { "_id.year": 1 } },
      {
        $project: {
          _id: 0, // Hide the _id field
          year: "$_id.year",
          totalSales: 1
        }
      }
    ]);

    // Aggregate top-selling products, categories, and brands
    const [topSellingProducts, topSellingCategories, topSellingBrands] = await Promise.all([

      // Top-selling products based on quantity ordered
      orderModel.aggregate([
        { $unwind: "$products" }, // Unwind products array in orders
        {
          $group: {
            _id: "$products.productId",
            totalSales: { $sum: "$products.quantity" }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products", // collection name for products
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
            totalSales: 1,
            image: { $arrayElemAt: ["$productDetails.images", 0] }
          }
        }
      ]),

      // Top-selling categories based on orders
      orderModel.aggregate([
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
            totalSales: { $sum: "$products.quantity" }
          }
        },
        { $sort: { totalSales: -1 } },
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
            totalSales: 1
          }
        }
      ]),

      // Top-selling brands based on stock (assuming `stock` represents total available quantity)
      orderModel.aggregate([
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
            totalSales: { $sum: "$products.quantity" }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Prepare the data for the frontend to render the charts
    const monthlyChartData = {
      labels: monthlySales.map(sale => `${sale.month}/${sale.year}`), // Format as Month/Year
      data: monthlySales.map(sale => sale.totalSales)
    };

    const yearlyChartData = {
      labels: yearlySales.map(sale => `${sale.year}`),
      data: yearlySales.map(sale => sale.totalSales)
    };

    res.render('admin/dashboard', {
      admin,
      period,
      topSellingProducts,
      topSellingCategories,
      topSellingBrands,
      monthlySales,
      yearlySales
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.send('An error occurred while loading the dashboard.');
  }
};

const loadUsers = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    totalUsers = await userModel.countDocuments();
    const users = await userModel.find({})
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalUsers / limit);
    currentPage = page;
    res.render('admin/users', { users, totalPages, currentPage, limit });
  } catch (error) {
    res.send(error);
    console.log('error', error)
  }
};

const blockUser = async (req, res) => {

  const { userId, isBlocked } = req.body;
  try {
    const blockedUser = await userModel.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true }

    );
    if (blockUser) {
      res.json({ success: true });
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'failed to bloack user' });
  }


}

const loadInventory = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await productModel.countDocuments();
    const products = await productModel.find({})
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);
    currentPage = page;

    res.render('admin/inventory', { products, currentPage, limit, totalPages });
  } catch (error) {
    res.send(error);
    console.error(error)
  }
};

const updateInventory = async (req, res) => {

  const productId = req.params.id;
  const { price, stock } = req.body;

  try {
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { price, stock },
      { new: true }
    );

    // Check if the product was found and updated
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Send the updated product back in the response
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error); // Log the error for debugging
    res.status(500).json({ message: 'Internal server error' }); // Send a JSON response
  }
};

const loadSalesReport = async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'daily';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let matchStage = { status: 'Delivered' };
    if (timeframe === 'monthly' && startDate && endDate) {
      // Filter by month range
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    } else if (timeframe === 'yearly' && startDate && endDate) {
      // Filter by year range
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    } else if (timeframe === 'weekly' && startDate && endDate) {
      // Filter by week range
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Always group by day to ensure daily rows in the report
    const groupStage = {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      },
      totalSalesRevenue: { $sum: '$total' }, // Total sales revenue
      totalDiscount: { $sum: '$totalDiscount' }, // Sum of total discount
      totalOrders: { $sum: 1 },
      totalItemsSold: { $sum: { $sum: '$products.quantity' } },
    };

    const salesReport = await orderModel.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    const totalOrders = salesReport.reduce((acc, report) => acc + report.totalOrders, 0);
    const totalSalesRevenue = salesReport.reduce((acc, report) => acc + report.totalSalesRevenue, 0);
    const totalDiscount = salesReport.reduce((acc, report) => acc + report.totalDiscount, 0);

    res.render('admin/salesReport', {
      salesReport,
      totalOrders,
      totalSalesRevenue,
      totalDiscount,
      timeframe,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const downloadPDF = async (req, res) => {
  try {
    const salesReport = await getSalesReportData(req.query.timeframe || 'yearly');
    const doc = new PDFDocument();

    res.setHeader('Content-Disposition', 'attachment; filename="SalesReport.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();

    salesReport.forEach(report => {
      const month = report._id.month ? `-${report._id.month}` : '';
      const day = report._id.day ? `-${report._id.day}` : '';

      doc.fontSize(12).text(`Date: ${report._id.year}${month}${day}`);
      doc.text(`Total Sales Revenue: ₹${report.totalSalesRevenue || 0}`);
      doc.text(`Discount Applied: ₹${report.totalDiscount || 0}`);
      doc.text(`Net Sales: ₹${(report.totalSalesRevenue || 0) - (report.totalDiscount || 0)}`);
      doc.text(`Number of Orders: ${report.totalOrders || 0}`);
      doc.text(`Total Items Sold: ${report.totalItemsSold || 0}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not generate PDF' });
  }
};

const downloadExcel = async (req, res) => {
  try {
    const salesReport = await getSalesReportData(req.query.timeframe || 'yearly');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Sales Revenue', key: 'totalSalesRevenue', width: 20 },
      { header: 'Discount Applied', key: 'totalDiscount', width: 18 },
      { header: 'Net Sales', key: 'netSales', width: 15 },
      { header: 'Number of Orders', key: 'totalOrders', width: 18 },
      { header: 'Total Items Sold', key: 'totalItemsSold', width: 18 },
    ];

    salesReport.forEach(report => {
      worksheet.addRow({
        date: `${report._id.year}-${report._id.month || ''}-${report._id.day || ''}`,
        totalSalesRevenue: report.totalSalesRevenue,
        totalDiscount: report.totalDiscount,
        netSales: report.totalSalesRevenue - report.totalDiscount,
        totalOrders: report.totalOrders,
        totalItemsSold: report.totalItemsSold
      });
    });

    res.setHeader('Content-Disposition', 'attachment; filename="SalesReport.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not generate Excel file' });
  }
};

const getSalesReportData = async (timeframe) => {
  const matchStage = {}; 
  let groupStage = {
    _id: {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    },
    totalSalesRevenue: { $sum: '$total' },
    totalDiscount: { $sum: '$discount' }, 
    totalOrders: { $sum: 1 },
    totalItemsSold: { $sum: '$products.quantity' }
  };

  if (timeframe === 'monthly') {
    groupStage._id = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
  } else if (timeframe === 'weekly') {
    groupStage._id = { year: { $year: '$createdAt' }, week: { $isoWeek: '$createdAt' } };
  } else {
    groupStage._id = { year: { $year: '$createdAt' } };
  }

  return await orderModel.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
  ]);
};

module.exports = {
  loadLogin,
  login,
  logout,
  loadDashboard,
  loadUsers,
  blockUser,
  loadInventory,
  updateInventory,
  loadSalesReport,
  downloadPDF,
  downloadExcel
}
