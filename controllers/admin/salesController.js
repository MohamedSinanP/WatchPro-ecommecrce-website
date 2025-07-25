const orderModel = require('../../models/orderModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const moment = require('moment')

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
    console.log('Sales Report Data:', JSON.stringify(salesReport, null, 2)); // Debug salesReport

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Disposition', 'attachment; filename="SalesReport.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Navigate up two levels from controllers/admin to project root
    const fontPath = path.join(__dirname, '..', '..', 'public', 'fonts', 'NotoSans-Regular.ttf');
    console.log('Font Path:', fontPath); // Debug the path
    doc.registerFont('NotoSans', fontPath);

    // Header
    doc.font('NotoSans').fontSize(24).fillColor('navy')
      .text('Sales Report', 50, 50, { align: 'center' });
    doc.fontSize(12).fillColor('gray')
      .text(`Generated on: ${moment().format('MMMM Do YYYY')}`, 50, 80, { align: 'center' });
    doc.moveDown(2);

    // Table Header
    const tableTop = 120;
    const col1 = 50;
    const colWidth = 80; // Adjusted to fit 6 columns within 495 points (50 + 80*6 + 50 = 580)
    const rowHeight = 20;

    doc.font('NotoSans').fontSize(12).fillColor('black');
    doc.text('Date', col1, tableTop, { width: colWidth });
    doc.text('Total Sales', col1 + colWidth, tableTop, { width: colWidth, align: 'right' });
    doc.text('Discount', col1 + colWidth * 2, tableTop, { width: colWidth, align: 'right' });
    doc.text('Net Sales', col1 + colWidth * 3, tableTop, { width: colWidth, align: 'right' });
    doc.text('Orders', col1 + colWidth * 4, tableTop, { width: colWidth, align: 'right' });
    doc.text('Items Sold', col1 + colWidth * 5, tableTop, { width: colWidth, align: 'right' });

    // Draw header separator
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('gray').stroke();
    doc.moveDown();

    // Table Rows
    let y = tableTop + 25;
    salesReport.forEach((report, index) => {
      console.log(`Processing row ${index}:`, report); // Debug each row
      const month = report._id.month ? `-${String(report._id.month).padStart(2, '0')}` : '';
      const day = report._id.day ? `-${String(report._id.day).padStart(2, '0')}` : '';
      const date = `${report._id.year}${month}${day}`;
      const totalSales = (report.totalSalesRevenue || 0).toFixed(2);
      const discount = (report.totalDiscount || 0).toFixed(2);
      const netSales = ((report.totalSalesRevenue || 0) - (report.totalDiscount || 0)).toFixed(2);
      const orders = report.totalOrders || 0;
      const itemsSold = report.totalItemsSold || 0;

      // Check if we need a new page
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 50; // Reset y to top of new page
        // Redraw table header on new page
        doc.font('NotoSans').fontSize(12).fillColor('black');
        doc.text('Date', col1, y, { width: colWidth });
        doc.text('Total Sales', col1 + colWidth, y, { width: colWidth, align: 'right' });
        doc.text('Discount', col1 + colWidth * 2, y, { width: colWidth, align: 'right' });
        doc.text('Net Sales', col1 + colWidth * 3, y, { width: colWidth, align: 'right' });
        doc.text('Orders', col1 + colWidth * 4, y, { width: colWidth, align: 'right' });
        doc.text('Items Sold', col1 + colWidth * 5, y, { width: colWidth, align: 'right' });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor('gray').stroke();
        y += 25;
      }

      doc.fontSize(10).fillColor('black');
      doc.text(date, col1, y, { width: colWidth });
      doc.text(`₹${totalSales}`, col1 + colWidth, y, { width: colWidth, align: 'right' });
      doc.text(`₹${discount}`, col1 + colWidth * 2, y, { width: colWidth, align: 'right' });
      doc.text(`₹${netSales}`, col1 + colWidth * 3, y, { width: colWidth, align: 'right' });
      doc.text(orders.toString(), col1 + colWidth * 4, y, { width: colWidth, align: 'right' });
      doc.text(itemsSold.toString(), col1 + colWidth * 5, y, { width: colWidth, align: 'right' });

      y += rowHeight;

      // Draw row separator
      doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('lightgray').dash(5, { space: 5 }).stroke();
    });

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.font('NotoSans').fontSize(10).fillColor('gray')
        .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 70, { align: 'center' });
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
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