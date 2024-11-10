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
    console.log("error", error);

  }
};

const loadDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) return res.redirect('/admin/login');
    res.render('admin/dashboard')
  } catch (error) {
    res.send(error);
    console.log("error", error);
  }
}

const loadUsers = async (req, res) => {
  try {
    const users = await userModel.find({});
    res.render('admin/users', { users });
  } catch (error) {
    res.send(error);
    console.log('error', error)
  }
};

const blockUser = async (req, res) => {
  console.log(req.body);

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
    console.log(error)
    res.status(500).json({ success: false, message: 'failed to bloack user' });
  }


}

const loadInventory = async (req, res) => {

  const products = await productModel.find({});

  res.render('admin/inventory', { products });

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
    console.log(error);
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
      doc.fontSize(12).text(`Date: ${report._id.year}-${report._id.month || ''}-${report._id.day || ''}`);
      doc.text(`Total Sales Revenue: ₹${report.totalSalesRevenue}`);
      doc.text(`Discount Applied: ₹${report.totalDiscount}`);
      doc.text(`Net Sales: ₹${report.totalSalesRevenue - report.totalDiscount}`);
      doc.text(`Number of Orders: ${report.totalOrders}`);
      doc.text(`Total Items Sold: ${report.totalItemsSold}`);
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
  const matchStage = {}; // Adjust your match conditions based on timeframe if needed
  let groupStage = {
    _id: {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    },
    totalSalesRevenue: { $sum: '$total' },
    totalDiscount: { $sum: '$discount' }, // Adjust field as per your schema
    totalOrders: { $sum: 1 },
    totalItemsSold: { $sum: '$products.quantity' }
  };

  // Adjust grouping based on timeframe
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
  loadDashboard,
  loadUsers,
  blockUser,
  loadInventory,
  updateInventory,
  loadSalesReport,
  downloadPDF,
  downloadExcel
}
