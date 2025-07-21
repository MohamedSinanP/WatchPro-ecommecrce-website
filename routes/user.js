const express = require('express');
const router = express.Router();
const authController = require('../controllers/user/authController');
const userController = require('../controllers/user/userController');
const prodcutController = require('../controllers/user/productController');
const orderController = require('../controllers/user/orderController');
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

router.get('/products', prodcutController.loadProductPage);
router.get('/singleProduct/:id', prodcutController.loadSingleProductPage);
router.get('/products/filter', prodcutController.filterProduct);
router.get('/searchProduct', prodcutController.searchProduct);

// routes user account management 

router.get('/profile', userAuth.checkSession, userController.loadProfilePage);
router.put('/updateUser/:userId', userController.updateUser);
router.patch('/changePassword', userAuth.checkSession, userController.changePassword);
router.get('/address', userAuth.checkSession, userController.loadAddressPage);
router.post('/addAddress', userController.addAddress);
router.put('/updateAddress/:id', userController.updateAddress);
router.delete('/deleteAddress/:id', userController.deleteAddress);
router.post('/defaultAddress', userController.addDefaultAddress);
router.get('/orders', userAuth.checkSession, orderController.loadOrdersPage);

// routes for cart 

router.get('/cart', userAuth.checkSession, cartController.loadCartPage);
router.get('/api/cart', userAuth.checkSession, cartController.getCart);
router.post('/cart', userAuth.checkSession, cartController.addToCart);
router.put('/updateQuantity', cartController.updateQuantity);
router.delete('/deleteProduct/:id', cartController.deleteCartProduct);
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
router.post('/walletOrder', orderController.walletOrder);

// routes for company pages

router.get('/contact', userController.loadContactPage);
router.get('/about', userController.loadAboutPage);

// routes for checkout and place order

router.get('/checkout', userAuth.checkSession, checkoutController.loadCheckoutPage);
router.post('/placeOrder', userAuth.checkSession, orderController.addOrderDetails);
router.post('/createOrder', userAuth.checkSession, orderController.createOrder);
router.delete('/deleteOrderItem/:id', userAuth.checkSession, orderController.deleteOrderItem);
router.get('/getOrder/:id', userAuth.checkSession, orderController.getOrder);
router.get('/greetings', orderController.loadGreetingsPage);
router.post('/returnOrder/:id', userAuth.checkSession, orderController.returnOrder);
router.post('/paymentSuccess', userAuth.checkSession, orderController.paymentSuccess);
router.post('/retryPayment', userAuth.checkSession, orderController.retryPayment);
router.get('/invoice/:id', userAuth.checkSession, invoiceController.downloadInvoice);
router.get('/retryPaymentPage/:id', userAuth.checkSession, orderController.loadRetryPaymentPage);

module.exports = router;
