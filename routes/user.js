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

// routes for product listing

router.get('/products', prodcutController.loadProductPage);
router.get('/singleProduct/:id', prodcutController.loadSingleProductPage);
router.get('/products/filter',prodcutController.filterProduct);
router.get('/searchProduct',prodcutController.searchProduct);

// routes user account management 

router.get('/profile', userController.loadProfilePage);
router.post('/updateUser/:userId', userController.updateUser);
router.post('/changePassword',userController.changePassword);
router.get('/address',userController.loadAddressPage);
router.post('/addAddress',userController.addAddress);
router.put('/updateAddress/:id',userController.updateAddress);
router.delete('/deleteAddress/:id',userController.deleteAddress);
// router.post('/addDefaultAddress',userController.addDefaultAddress);

// routes for cart and wishlist 

router.get('/cart',userAuth.checkSession,cartController.loadCartPage);
router.post('/cart',cartController.addToCart);
router.put('/updateQuantity',cartController.updateQuantity);
router.delete('/deleteProduct/:id',cartController.deleteCartProduct);
router.get('/wishlist',wishlistController.loadWishlistPage)
router.post('/wishlist',wishlistController.addToWishlist);
router.delete('/deleteWishlistProduct/:id',wishlistController.deleteWishlistProduct);
router.post('/applyCoupon',couponController.applyCoupon);
router.post('/removeCoupon',couponController.removeCoupon);

// routes for wallet

router.get('/wallet',walletController.loadWalletPage);


// routes for checkout and place order

router.get('/orders',orderController.loadOrdersPage);
router.get('/checkout',orderController.loadCheckoutPage);
router.post('/defaultAddress/:id',orderController.defaultAddress);
router.post('/placeOrder',orderController.addOrderDetails);
router.post('/createOrder',orderController.createOrder);
router.delete('/deleteOrderItem/:id',orderController.deleteOrderItem);
router.get('/greetings',orderController.loadGreetingsPage);
router.post('/returnOrder/:id',orderController.returnOrder);

module.exports = router;
