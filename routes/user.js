const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const prodcutController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const cartController = require('../controllers/cartController');
const wishlistController = require('../controllers/wishlistController');
const walletController = require('../controllers/walletControler');
const userAuth = require('../middlewares/userAuth');

// routes for user signup , login and load home page

router.get('/signup', userController.loadSignupPage);
router.get('/login', userController.loadLoginPage);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.post('/login', userController.login);
router.post('/demo-login', userController.demoLogin);
router.get('/home', userController.loadHomePage);
router.post('/logout',userAuth.checkSession,userController.logout);

// routes for product listing

router.get('/products', prodcutController.loadProductPage);
router.get('/singleProduct/:id', prodcutController.loadSingleProductPage);
router.get('/products/filter', prodcutController.filterProduct);
router.get('/searchProduct', prodcutController.searchProduct);

// routes user account management 

router.get('/profile', userAuth.checkSession, userController.loadProfilePage);
router.post('/updateUser/:userId', userController.updateUser);
router.post('/changePassword', userController.changePassword);
router.get('/address', userAuth.checkSession, userController.loadAddressPage);
router.post('/addAddress', userController.addAddress);
router.put('/updateAddress/:id', userController.updateAddress);
router.delete('/deleteAddress/:id', userController.deleteAddress);
router.get('/orders', userAuth.checkSession, orderController.loadOrdersPage);

// routes for cart 

router.get('/cart', userAuth.checkSession, cartController.loadCartPage);
router.post('/cart', userAuth.checkSession, cartController.addToCart);
router.put('/updateQuantity', cartController.updateQuantity);
router.delete('/deleteProduct/:id', cartController.deleteCartProduct);
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

router.get('/checkout', orderController.loadCheckoutPage);
router.post('/defaultAddress', userController.addDefaultAddress);
router.post('/placeOrder', orderController.addOrderDetails);
router.post('/createOrder', orderController.createOrder);
router.delete('/deleteOrderItem/:id', orderController.deleteOrderItem);
router.get('/greetings', orderController.loadGreetingsPage);
router.post('/returnOrder/:id', orderController.returnOrder);
router.post('/paymentSuccess', orderController.paymentSuccess);
router.post('/retryPayment', orderController.retryPayment);
router.get('/invoice/:id', orderController.downloadInvoice);

module.exports = router;
