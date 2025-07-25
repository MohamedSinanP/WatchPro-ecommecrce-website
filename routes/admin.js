const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController');
const adminController = require('../controllers/admin/adminController');
const categoryController = require('../controllers/admin/categoryController');
const prodcutController = require('../controllers/admin/productController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const offerController = require('../controllers/admin/offerController');
const salesController = require('../controllers/admin/salesController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../utils/multer');


const uploadMiddleware = upload.array('productImages', 5);

router.get('/login', adminAuth.isLogin, authController.loadLogin);
router.post('/login', authController.login);
router.get('/dashboard', adminAuth.checkSession, adminController.loadDashboard);
router.get('/users', adminAuth.checkSession, adminController.loadUsers);
router.put('/blockUser', adminAuth.checkSession, adminController.blockUser);
router.post('/logout', adminAuth.checkSession, authController.logout);

// categoryManagement

router.get('/categories', adminAuth.checkSession, categoryController.loadCategories);
router.post('/addCategory', adminAuth.checkSession, categoryController.addCategory);
router.put('/editCategory/:id', adminAuth.checkSession, categoryController.editCategory);
router.put('/categoryListing', adminAuth.checkSession, categoryController.isListedCategory)

// productManagement

router.get('/products', adminAuth.checkSession, prodcutController.loadProducts);
router.post('/addProduct', adminAuth.checkSession, (req, res, next) => {
  console.log("Reached multer upload middleware");
  uploadMiddleware(req, res, function (err) {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }
    console.log("Multer processed files: ", req.files);
    prodcutController.addProduct(req, res, next);
  });
});
router.put('/editProduct/:id', adminAuth.checkSession, upload.array('productImages', 5), prodcutController.editProduct);
router.put('/productListing', adminAuth.checkSession, prodcutController.isListedProduct);

// inventory management 

router.get('/inventory', adminAuth.checkSession, adminController.loadInventory);
router.post('/updateInventory/:id', adminAuth.checkSession, adminController.updateInventory);

// order management 

router.get('/orders', adminAuth.checkSession, orderController.loadOrders);
router.put('/orders/updateStatus/:id', adminAuth.checkSession, orderController.updateOrderStatus);
router.put('/orders/:orderId/products/:productId/status', adminAuth.checkSession, orderController.updateProductStatus);
router.put('/orders/updateStatus/:id', adminAuth.checkSession, orderController.updateOrderStatus);
router.put('/orders/:orderId/products/bulk-update', adminAuth.checkSession, orderController.bulkUpdateProductStatus);
router.delete('/orders/delete/:id', adminAuth.checkSession, orderController.deleteOrder);

// coupon management 

router.get('/coupons', adminAuth.checkSession, couponController.loadCoupons);
router.post('/addCoupon', adminAuth.checkSession, couponController.addCoupon);
router.delete('/deleteCoupon/:id', adminAuth.checkSession, couponController.deleteCoupon);
router.get('/getCoupon/:id', adminAuth.checkSession, couponController.getCoupon);
router.put('/updateCoupon/:id', adminAuth.checkSession, couponController.updateCoupon);

// offer management 

router.get('/offers', adminAuth.checkSession, offerController.loadOffers);
router.post('/addOffer', adminAuth.checkSession, offerController.addOffer);
router.delete('/deleteOffer/:id', adminAuth.checkSession, offerController.deleteOffer);
router.get('/getOffer/:id', offerController.getOffer);
router.put('/updateOffer/:id', offerController.updateOffer);

// sales report

router.get('/salesReport', adminAuth.checkSession, salesController.loadSalesReport);
router.get('/salesReport/downloadPdf', adminAuth.checkSession, salesController.downloadPDF);
router.get('/salesReport/downloadExcel', adminAuth.checkSession, salesController.downloadExcel);

module.exports = router;