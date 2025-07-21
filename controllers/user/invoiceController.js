const PDFDocument = require('pdfkit');

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

    // Helper functions for each section
    const generateHeader = (doc) => {
      doc
        .fillColor("#444444")
        .fontSize(20)
        .text("WatchPro", 50, 45)
        .fontSize(10)
        .text("WatchPro", 200, 50, { align: "right" })
        .text("Pottikkallu 123 Hyderabad", 200, 65, { align: "right" })
        .text("Malappuram, India", 200, 80, { align: "right" })
        .moveDown();
    };

    const generateCustomerInformation = (doc, invoice) => {
      doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160);

      generateHr(doc, 185);

      const customerInformationTop = 200;
      doc
        .fontSize(10)
        .text("Invoice Number:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(invoice.invoice_nr, 150, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 50, customerInformationTop + 15)
        .text(formatDate(new Date()), 150, customerInformationTop + 15)
        .font("Helvetica-Bold")
        .text(invoice.shipping.name, 300, customerInformationTop)
        .font("Helvetica")
        .text(invoice.shipping.address, 300, customerInformationTop + 15)
        .text(`${invoice.shipping.city}, ${invoice.shipping.state}, ${invoice.shipping.country}`, 300, customerInformationTop + 30)
        .moveDown();

      generateHr(doc, 252);
    };

    const generateInvoiceTable = (doc, invoice) => {
      let i;
      const invoiceTableTop = 330;

      doc.font("Helvetica-Bold");
      generateTableRow(doc, invoiceTableTop, "Item", "Unit Cost", "Quantity", "Line Total");  // Remove "Description" here
      generateHr(doc, invoiceTableTop + 20);
      doc.font("Helvetica");

      for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
          doc,
          position,
          item.item,
          (item.amount / item.quantity).toFixed(2),
          item.quantity,
          (item.amount)
        );
        generateHr(doc, position + 20);
      }

      const subtotalPosition = invoiceTableTop + (i + 1) * 30;
      generateTableRow(doc, subtotalPosition, "", "Subtotal", "", (invoice.subtotal));

      const paidToDatePosition = subtotalPosition + 20;
      generateTableRow(doc, paidToDatePosition, "", "Discount", "", (totalDiscount));

      const duePosition = paidToDatePosition + 25;
      doc.font("Helvetica-Bold");
      generateTableRow(doc, duePosition, "", "Total", "", (total));
      doc.font("Helvetica");
    };

    const generateFooter = (doc) => {
      doc
        .fontSize(10)
        .text(" Thank you for your order.", 50, 650, { align: "center", width: 500 });
    };

    const generateTableRow = (doc, y, item, unitCost, quantity, lineTotal) => {
      doc.fontSize(10)
        .text(item, 50, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
    };

    const generateHr = (doc, y) => {
      doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    };

    const formatDate = (date) => date.toISOString().split('T')[0];

    generateHeader(doc);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Error generating invoice" });
  }
};


module.exports = {
  downloadInvoice
}