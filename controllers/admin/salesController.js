const orderModel = require('../../models/orderModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs')

const loadSalesReport = async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'daily';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let matchStage = { status: 'Delivered' };
    if (timeframe === 'monthly' && startDate && endDate) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    } else if (timeframe === 'yearly' && startDate && endDate) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    } else if (timeframe === 'weekly' && startDate && endDate) {
      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const groupStage = {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      },
      totalSalesRevenue: { $sum: '$total' },
      totalDiscount: { $sum: '$totalDiscount' },
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

// to downllad pdf

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
      doc.text(`Total Sales Revenue: ${report.totalSalesRevenue || 0}`);
      doc.text(`Discount Applied: ${report.totalDiscount || 0}`);
      doc.text(`Net Sales: ${(report.totalSalesRevenue || 0) - (report.totalDiscount || 0)}`);
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

// to download exel sheet

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

// to get the sales report of a certain timeframe

const getSalesReportData = async (timeframe) => {
  const matchStage = { status: 'Delivered' };

  let groupStage = {
    _id: {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    },
    totalSalesRevenue: { $sum: '$total' },
    totalDiscount: { $sum: '$totalDiscount' },
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
    { $unwind: '$products' },
    { $group: groupStage },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
  ]);
};


module.exports = {
  loadSalesReport,
  downloadPDF,
  downloadExcel
}