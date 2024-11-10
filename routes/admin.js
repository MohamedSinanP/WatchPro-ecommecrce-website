const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const prodcutController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const offerController = require('../controllers/offerController');
const adminAuth = require('../middlewares/adminAuth');
const upload = require('../controllers/imageUploadController');

router.get('/login', adminAuth.isLogin, adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/dashboard', adminAuth.checkSession, adminController.loadDashboard);
router.get('/users', adminAuth.checkSession, adminController.loadUsers);
router.put('/blockUser',adminAuth.checkSession,adminController.blockUser);

// categoryManagement

router.get('/categories', adminAuth.checkSession, categoryController.loadCategories);
router.post('/addCategory', adminAuth.checkSession, categoryController.addCategory);
router.put('/editCategory/:id', adminAuth.checkSession, categoryController.editCategory);
router.put('/categoryListing', adminAuth.checkSession, categoryController.isListedCategory)

// productManagement

router.get('/products', adminAuth.checkSession, prodcutController.loadProducts);
router.post('/addProduct', adminAuth.checkSession, upload.array('productImages',5), prodcutController.addProduct);
router.put('/editProduct/:id', adminAuth.checkSession, prodcutController.editProduct);
router.put('/productListing',adminAuth.checkSession,prodcutController.isListedProduct);


// inventory management 

router.get('/inventory',adminAuth.checkSession,adminController.loadInventory);
router.post('/updateInventory/:id',adminAuth.checkSession,adminController.updateInventory);


// order management 

router.get('/orders',adminAuth.checkSession,orderController.loadOrders);
router.put('/orders/updateStatus/:id',adminAuth.checkSession,orderController.updateStatus);
router.delete('/orders/cancelOrder/:id',adminAuth.checkSession,orderController.cancelOrder);


// coupon management 

router.get('/coupons',adminAuth.checkSession, couponController.loadCoupons);
router.post('/addCoupon',adminAuth.checkSession,couponController.addCoupon);
router.delete('/deleteCoupon/:id',adminAuth.checkSession,couponController.deleteCoupon);


// offer management 

router.get('/offers',adminAuth.checkSession,offerController.loadOffers);
router.post('/addOffer',adminAuth.checkSession,offerController.addOffer);
router.delete('/deleteOffer/:id',adminAuth.checkSession,offerController.deleteOffer);


// sales report


router.get('/salesReport',adminAuth.checkSession,adminController.loadSalesReport);
router.get('/salesReport/downloadPdf',adminAuth.checkSession,adminController.downloadPDF);
router.get('/salesReport/downloadExcel',adminAuth.checkSession,adminController.downloadExcel);

module.exports = router;