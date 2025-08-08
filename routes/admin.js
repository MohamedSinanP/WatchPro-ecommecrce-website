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
const dashboardController = require('../controllers/admin/dashboardController');
const inventoryController = require('../controllers/admin/inventoryController');
const adminAuth = require('../middlewares/adminAuth');
const uploadMiddleware = require('../utils/multer');

router.get('/login', adminAuth.isLogin, authController.loadLogin);
router.post('/login', authController.login);
router.get('/dashboard', adminAuth.checkSession, dashboardController.loadDashboard);
router.get('/users', adminAuth.checkSession, adminController.loadUsers);
router.patch('/blockUser', adminAuth.checkSession, adminController.blockUser);
router.post('/logout', adminAuth.checkSession, authController.logout);

// categoryManagement

router.get('/categories', adminAuth.checkSession, categoryController.loadCategories);
router.post('/addCategory', adminAuth.checkSession, categoryController.addCategory);
router.put('/editCategory/:id', adminAuth.checkSession, categoryController.editCategory);
router.patch('/categoryListing', adminAuth.checkSession, categoryController.isListedCategory)

// productManagement

router.get('/products', adminAuth.checkSession, prodcutController.loadProducts);
router.post(
  '/addProduct',
  adminAuth.checkSession,
  uploadMiddleware,
  prodcutController.addProduct
);
router.put('/editProduct/:id', adminAuth.checkSession, uploadMiddleware, prodcutController.editProduct);
router.patch('/productListing', adminAuth.checkSession, prodcutController.isListedProduct);

// inventory management 

router.get('/inventory', adminAuth.checkSession, inventoryController.loadInventory);
router.post('/updateInventory/:id', adminAuth.checkSession, inventoryController.updateInventory);
router.get('/product/:id', adminAuth.checkSession, inventoryController.getProductDetails);
// order management 

router.get('/orders', adminAuth.checkSession, orderController.loadOrders);
router.patch('/orders/updateStatus/:id', adminAuth.checkSession, orderController.updateOrderStatus);
router.patch('/orders/:orderId/products/:productId/status', adminAuth.checkSession, orderController.updateProductStatus);
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