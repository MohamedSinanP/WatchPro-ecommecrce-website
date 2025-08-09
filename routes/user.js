const express = require('express');
const router = express.Router();
const authController = require('../controllers/user/authController');
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productController');
const orderCreationController = require('../controllers/user/orderCreationController');
const paymentController = require('../controllers/user/paymentController');
const orderManagementController = require('../controllers/user/orderManagementController');
const orderViewController = require('../controllers/user/orderViewController');
const couponController = require('../controllers/user/couponController');
const cartController = require('../controllers/user/cartController');
const wishlistController = require('../controllers/user/wishlistController');
const walletController = require('../controllers/user/walletControler');
const invoiceController = require('../controllers/user/invoiceController');
const checkoutController = require('../controllers/user/checkoutController');
const userAuth = require('../middlewares/userAuth');

// routes for user signup , login and load home page

router.get('/', userController.loadHomePage);
router.get('/signup', authController.loadSignupPage);
router.get('/login', authController.loadLoginPage);
router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/logout', userAuth.checkSession, authController.logout);
router.get('/home', userController.loadHomePage);

// routes for product listing

router.get('/products', productController.loadProductPage);
router.get('/singleProduct/:id', productController.loadSingleProductPage);
router.get('/products/filter', productController.filterProduct);
router.get('/searchProduct', productController.searchProduct);

// routes user account management 

router.get('/profile', userAuth.checkSession, userController.loadProfilePage);
router.put('/updateUser/:userId', userController.updateUser);
router.patch('/changePassword', userAuth.checkSession, userController.changePassword);
router.get('/address', userAuth.checkSession, userController.loadAddressPage);
router.post('/addAddress', userController.addAddress);
router.put('/updateAddress/:id', userController.updateAddress);
router.delete('/deleteAddress/:id', userController.deleteAddress);
router.post('/defaultAddress', userController.addDefaultAddress);
router.get('/orders', userAuth.checkSession, orderViewController.loadOrdersPage);

// routes for cart 

router.get('/cart', userAuth.checkSession, cartController.loadCartPage);
router.get('/api/cart', userAuth.checkSession, cartController.getCart);
router.post('/cart', userAuth.checkSession, cartController.addToCart);
router.patch('/updateQuantity', cartController.updateQuantity);
router.delete('/deleteProduct/:id/:size', cartController.deleteCartProduct);
router.get('/getCartTotals', cartController.getCartTotals);

// coupon routes 

router.post('/applyCoupon', couponController.applyCoupon);
router.post('/removeCoupon', couponController.removeCoupon);

// routes for wishlist

router.get('/wishlist', userAuth.checkSession, wishlistController.loadWishlistPage)
router.post('/wishlist', userAuth.checkSession, wishlistController.addToWishlist);
router.delete('/deleteWishlistProduct/:id', wishlistController.deleteWishlistProduct);


// routes for wallet

router.get('/wallet', userAuth.checkSession, walletController.loadWalletPage);
router.post('/walletOrder', orderCreationController.walletOrder);

// routes for company pages

router.get('/contact', userController.loadContactPage);
router.get('/about', userController.loadAboutPage);

// routes for checkout and place order

router.get('/checkout', userAuth.checkSession, checkoutController.loadCheckoutPage);
router.post('/placeOrder', userAuth.checkSession, orderCreationController.createOrderWithOCD);
router.post('/createOrder', userAuth.checkSession, orderCreationController.createOrderWithRazorpay);
router.delete('/deleteOrderItem/:id', userAuth.checkSession, orderManagementController.cancelOrder);
router.get('/getOrder/:id', userAuth.checkSession, orderManagementController.getOrder);
router.get('/greetings', orderViewController.loadGreetingsPage);
router.post('/returnOrder/:id', userAuth.checkSession, orderManagementController.returnOrder);
router.post('/paymentSuccess', userAuth.checkSession, paymentController.paymentSuccess);
router.post('/retryPayment', userAuth.checkSession, paymentController.retryPayment);
router.get('/invoice/:id', userAuth.checkSession, invoiceController.downloadInvoice);
router.get('/retryPaymentPage/:id', userAuth.checkSession, paymentController.loadRetryPaymentPage);

module.exports = router;
