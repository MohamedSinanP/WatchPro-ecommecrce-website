const PDFDocument = require('pdfkit');
const orderModel = require('../../models/orderModel');
const path = require('path');

const downloadInvoice = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId)
      .populate('userId')
      .populate('products.productId');

    const subtotal = order.products.reduce((total, product) => total + (product.quantity * product.price), 0);
    const totalDiscount = order.totalDiscount || 0;
    const total = subtotal - totalDiscount;

    const invoice = {
      invoice_nr: `2024.000${orderId.slice(-4)}`,
      subtotal,
      paid: total,
      shipping: {
        name: order.userId.fullName,
        address: order.address.address,
        city: order.address.city,
        state: "Kerala",
        country: "India"
      },
      items: order.products.map(product => ({
        item: product.productId.name,
        amount: product.quantity * product.price,
        quantity: product.quantity
      }))
    };

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const fileName = `invoice_${orderId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');

    // Register NotoSans font
    const fontPath = path.join(__dirname, '..', '..', 'public', 'fonts', 'NotoSans-Regular.ttf');
    console.log('Font Path:', fontPath);
    doc.registerFont('NotoSans', fontPath);

    // Helper functions
    const generateHeader = (doc) => {
      doc
        .fillColor('#003087') // Navy blue
        .font('NotoSans')
        .fontSize(26)
        .text('WatchPro', 50, 30, { align: 'left' })
        .fontSize(10)
        .fillColor('#444444')
        .text('Pottikkallu 123, Hyderabad', 350, 40, { align: 'right' })
        .text('Malappuram, India', 350, 55, { align: 'right' })
        .text('Email: contact@watchpro.in', 350, 70, { align: 'right' })
        .text('Phone: +91 123 456 7890', 350, 85, { align: 'right' });

      // Header border
      doc
        .strokeColor('#003087')
        .lineWidth(2)
        .moveTo(50, 110)
        .lineTo(550, 110)
        .stroke();
    };

    const generateCustomerInformation = (doc, invoice) => {
      doc
        .fillColor('#003087')
        .font('NotoSans')
        .fontSize(20)
        .text('Invoice', 50, 130);

      generateHr(doc, 155);

      const customerInformationTop = 170;
      doc
        .fontSize(10)
        .fillColor('#444444')
        .text('Invoice Number:', 50, customerInformationTop)
        .font('NotoSans')
        .fontSize(10)
        .text(invoice.invoice_nr, 150, customerInformationTop)
        .font('NotoSans')
        .text('Invoice Date:', 50, customerInformationTop + 15)
        .text(formatDate(new Date()), 150, customerInformationTop + 15)
        .font('NotoSans')
        .fontSize(12)
        .fillColor('#003087')
        .text('Bill To:', 300, customerInformationTop)
        .fontSize(10)
        .fillColor('#444444')
        .text(invoice.shipping.name, 300, customerInformationTop + 15)
        .text(invoice.shipping.address, 300, customerInformationTop + 30)
        .text(`${invoice.shipping.city}, ${invoice.shipping.state}, ${invoice.shipping.country}`, 300, customerInformationTop + 45)
        .moveDown();

      generateHr(doc, 230);
    };

    const generateInvoiceTable = (doc, invoice) => {
      let i;
      const invoiceTableTop = 260;

      // Table header background
      doc
        .fillColor('#e8ecef')
        .rect(50, invoiceTableTop - 5, 500, 25)
        .fill();

      doc
        .font('NotoSans')
        .fontSize(10)
        .fillColor('#003087');
      generateTableRow(doc, invoiceTableTop, 'Item', 'Unit Cost', 'Quantity', 'Line Total');

      generateHr(doc, invoiceTableTop + 20);

      doc.font('NotoSans').fillColor('#444444');

      for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;

        // Check for page overflow
        if (position + 30 > doc.page.height - 50) {
          doc.addPage();
          // Redraw table header on new page
          doc
            .fillColor('#e8ecef')
            .rect(50, 50, 500, 25)
            .fill();
          doc
            .font('NotoSans')
            .fontSize(10)
            .fillColor('#003087');
          generateTableRow(doc, 50, 'Item', 'Unit Cost', 'Quantity', 'Line Total');
          generateHr(doc, 70);
          doc.font('NotoSans').fillColor('#444444');
          generateTableRow(
            doc,
            80,
            item.item,
            formatCurrency(item.amount / item.quantity),
            item.quantity.toString(),
            formatCurrency(item.amount)
          );
          generateHr(doc, 100);
        } else {
          generateTableRow(
            doc,
            position,
            item.item,
            formatCurrency(item.amount / item.quantity),
            item.quantity.toString(),
            formatCurrency(item.amount)
          );
          generateHr(doc, position + 20);
        }
      }

      const subtotalPosition = invoiceTableTop + (i + 1) * 30;
      if (subtotalPosition + 80 > doc.page.height - 50) {
        doc.addPage();
      }

      generateTableRow(doc, subtotalPosition, '', 'Subtotal', '', formatCurrency(invoice.subtotal));

      const discountPosition = subtotalPosition + 20;
      generateTableRow(doc, discountPosition, '', 'Discount', '', formatCurrency(totalDiscount));

      const totalPosition = discountPosition + 25;
      doc.font('NotoSans').fontSize(12).fillColor('#003087');
      generateTableRow(doc, totalPosition, '', 'Total', '', formatCurrency(total));
      doc.font('NotoSans').fontSize(10).fillColor('#444444');
    };

    const generateFooter = (doc) => {
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .font('NotoSans')
          .fontSize(10)
          .fillColor('#444444')
          .text('Thank you for your purchase from WatchPro!', 50, doc.page.height - 80, { align: 'center', width: 500 })
          .text('For inquiries, contact us at contact@watchpro.in or +91 123 456 7890', 50, doc.page.height - 65, { align: 'center', width: 500 })
          .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, { align: 'center', width: 500 });
      }
    };

    const generateTableRow = (doc, y, item, unitCost, quantity, lineTotal) => {
      const colWidths = [220, 90, 90, 100]; // Adjusted to fit within 500 points
      const xPositions = [50, 270, 360, 450];
      doc
        .fontSize(10)
        .text(item, xPositions[0], y, { width: colWidths[0] })
        .text(unitCost, xPositions[1], y, { width: colWidths[1], align: 'right' })
        .text(quantity, xPositions[2], y, { width: colWidths[2], align: 'right' })
        .text(lineTotal, xPositions[3], y, { width: colWidths[3], align: 'right' });
    };

    const generateHr = (doc, y) => {
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Error generating invoice' });
  }
};


module.exports = {
  downloadInvoice
}