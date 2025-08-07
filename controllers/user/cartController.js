const productModel = require('../../models/productModel');
const cartModel = require('../../models/cartModel');
const couponModel = require('../../models/couponModel');
const offerModel = require('../../models/offerModel');
const { recalculateCouponDiscount, getCurrentCoupon } = require('./couponController');

const MAX_QUANTITY = 4;

// to show the cart page 
const loadCartPage = async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await cartModel.findOne({ userId: userId });
    const currentDate = new Date();
    const activeCoupons = await couponModel.find({
      expireDate: { $gt: currentDate },
      isActive: true
    });

    const today = new Date();
    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gte: today } }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);

    let subtotal = 0;
    let totalDiscount = 0;

    if (!cart || !cart.products.length) {
      // Clear any applied coupon if cart is empty
      req.session.appliedCoupon = null;
      return res.render('user/cart', {
        products: [],
        coupons: activeCoupons,
        subtotal: 0,
        totalDiscount: 0,
        couponDiscount: 0,
        appliedCoupon: null
      });
    }

    const productsWithImages = await Promise.all(
      cart.products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId).lean();
        if (!productDetails) return product;

        let offerPrice = productDetails.price;
        let productDiscount = 0;

        // Calculate offer price based on active offers
        const productOffers = activeOffers.filter(offer => {
          const matchesProduct = offer.products.some(prod => prod._id.equals(product.productId));
          const productCategoryId = productDetails.category._id || productDetails.category;
          const matchesCategory = offer.categories.some(cat => cat._id.equals(productCategoryId));

          return matchesProduct || matchesCategory;
        });

        if (productOffers.length > 0) {
          let bestOffer = productOffers[0];
          if (bestOffer.discountType === 'percentage') {
            const discountAmount = (productDetails.price * bestOffer.discountValue) / 100;
            offerPrice = (productDetails.price - discountAmount).toFixed(2);
            productDiscount = discountAmount * product.quantity;
          } else if (bestOffer.discountType === 'amount') {
            offerPrice = (productDetails.price - bestOffer.discountValue).toFixed(2);
            productDiscount = bestOffer.discountValue * product.quantity;
          }
        }

        subtotal += parseFloat(offerPrice) * product.quantity;
        totalDiscount += productDiscount;

        return {
          ...product,
          id: productDetails._id,
          name: productDetails.name,
          price: productDetails.price,
          quantity: product.quantity,
          imageUrl: productDetails.images[productDetails.images.length - 1] || '',
          offerPrice,
          productDiscount
        };
      })
    );

    // Recalculate coupon discount based on current subtotal
    const couponDiscount = recalculateCouponDiscount(req, subtotal);
    const appliedCoupon = getCurrentCoupon(req);

    return res.render('user/cart', {
      products: productsWithImages,
      coupons: activeCoupons,
      subtotal: subtotal.toFixed(2),
      cartId: cart._id,
      totalDiscount: totalDiscount.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      appliedCoupon: appliedCoupon
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send("Something went wrong while loading the cart page");
  }
};

// to add the product into user cart collection
const addToCart = async (req, res) => {
  const userId = req.session.user;
  const { productId, name, price, quantity } = req.body;

  try {
    const product = await productModel.findById(productId);
    const productStock = product.stock;

    if (productStock < 1) {
      return res.json({ success: false, message: 'Product is out of stock' });
    }
    let cart = await cartModel.findOne({ userId });

    if (cart) {
      let itemIndex = cart.products.findIndex(p => p.productId == productId);

      if (itemIndex > -1) {
        let productItem = cart.products[itemIndex];
        productItem.quantity = quantity;
        cart.products[itemIndex] = productItem;
      } else {
        cart.products.push({ productId, quantity, name, price });
      }
      cart = await cart.save();
      return res.status(201).json({ success: true, message: 'Product added to cart', cart });
    } else {
      const newCart = await cartModel.create({
        userId,
        products: [{ productId, quantity, name, price }]
      });
      return res.status(201).json({ success: true, message: 'Cart created and product added', cart: newCart });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// to update the quantity of the product in the user cart 
const updateQuantity = async (req, res) => {
  const { cartId, id, quantity } = req.body;

  try {
    const product = await productModel.findById(id);
    const stock = product.stock;

    if (quantity > stock) {
      return res.status(400).json({
        success: false,
        message: `only ${stock} stocks left.`
      });
    }

    if (quantity > MAX_QUANTITY) {
      return res.status(400).json({
        success: false,
        message: `Quantity cannot exceed ${MAX_QUANTITY}.`
      });
    }

    const cart = await cartModel.findById(cartId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const productIndex = cart.products.findIndex(product => product.productId.toString() === id);

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart"
      });
    }

    cart.products[productIndex].quantity = quantity;
    await cart.save();

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);

    let subtotal = 0;
    let totalOfferDiscount = 0;

    const updatedProducts = await Promise.all(
      cart.products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId).lean();
        let offerPrice = productDetails.price;
        let productDiscount = 0;

        const productOffers = activeOffers.filter(offer => {
          const matchesProduct = offer.products.some(prod => prod._id.equals(product.productId));
          const productCategoryId = productDetails.category._id || productDetails.category;
          const matchesCategory = offer.categories.some(cat => cat._id.equals(productCategoryId));
          return matchesProduct || matchesCategory;
        });

        if (productOffers.length > 0) {
          let bestOffer = productOffers[0];
          if (bestOffer.discountType === 'percentage') {
            const discountAmount = (productDetails.price * bestOffer.discountValue) / 100;
            offerPrice = productDetails.price - discountAmount;
            productDiscount = discountAmount * product.quantity;
          } else if (bestOffer.discountType === 'amount') {
            offerPrice = productDetails.price - bestOffer.discountValue;
            productDiscount = bestOffer.discountValue * product.quantity;
          }
        }

        subtotal += offerPrice * product.quantity;
        totalOfferDiscount += productDiscount;

        return {
          ...product,
          offerPrice: offerPrice.toFixed(2),
          quantity: product.quantity,
          productDiscount: productDiscount.toFixed(2)
        };
      })
    );

    // Recalculate coupon discount based on new subtotal
    const wasCouponApplied = !!req.session.appliedCoupon;
    const couponDiscount = recalculateCouponDiscount(req, subtotal);
    const appliedCoupon = getCurrentCoupon(req);
    const couponRemoved = wasCouponApplied && !appliedCoupon;

    res.json({
      success: true,
      message: "Quantity updated successfully",
      product: updatedProducts[productIndex],
      updatedProducts,
      subtotal: subtotal.toFixed(2),
      totalOfferDiscount: totalOfferDiscount.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      appliedCoupon: appliedCoupon,
      couponRemoved: couponRemoved
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// to delete the product from a specific user cart
const deleteCartProduct = async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const deleteProduct = await cartModel.updateOne(
      { userId: userId },
      { $pull: { products: { productId: productId } } }
    );

    if (!deleteProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // After deleting product, we need to recalculate everything
    // This will be handled by the getCartTotals call in the frontend
    res.json({ success: true, deleteProduct });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete the product from the cart' });
  }
};

const getCartTotals = async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await cartModel.findOne({ userId }).lean();

    if (!cart || !cart.products.length) {
      // Clear coupon if cart is empty
      req.session.appliedCoupon = null;
      return res.json({
        success: true,
        subtotal: '0.00',
        totalOfferDiscount: '0.00',
        couponDiscount: '0.00',
        appliedCoupon: null,
        couponRemoved: false
      });
    }

    const activeOffers = await offerModel.find({ isActive: true, expireDate: { $gt: new Date() } }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);

    let subtotal = 0;
    let totalOfferDiscount = 0;

    await Promise.all(
      cart.products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId).lean();
        if (!productDetails) return;

        let offerPrice = productDetails.price;
        let productDiscount = 0;

        const productOffers = activeOffers.filter(offer => {
          const matchesProduct = offer.products.some(prod => prod._id.equals(product.productId));
          const productCategoryId = productDetails.category._id || productDetails.category;
          const matchesCategory = offer.categories.some(cat => cat._id.equals(productCategoryId));
          return matchesProduct || matchesCategory;
        });

        if (productOffers.length > 0) {
          let bestOffer = productOffers[0];
          if (bestOffer.discountType === 'percentage') {
            const discountAmount = (productDetails.price * bestOffer.discountValue) / 100;
            offerPrice = productDetails.price - discountAmount;
            productDiscount = discountAmount * product.quantity;
          } else if (bestOffer.discountType === 'amount') {
            offerPrice = productDetails.price - bestOffer.discountValue;
            productDiscount = bestOffer.discountValue * product.quantity;
          }
        }

        subtotal += offerPrice * product.quantity;
        totalOfferDiscount += productDiscount;
      })
    );

    // Recalculate coupon discount based on current subtotal
    const couponDiscount = recalculateCouponDiscount(req, subtotal);
    const appliedCoupon = getCurrentCoupon(req);
    const couponRemoved = !appliedCoupon && req.session.appliedCoupon !== null;

    if (couponRemoved) {
      req.session.appliedCoupon = null; // Ensure coupon is cleared
    }

    res.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      totalOfferDiscount: totalOfferDiscount.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      appliedCoupon: appliedCoupon,
      couponRemoved: couponRemoved
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to retrieve cart totals' });
  }
};

const getCart = async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await cartModel.findOne({ userId }).lean();
    if (!cart || !cart.products.length) {
      return res.json({ success: true, products: [] });
    }

    const products = cart.products.map(product => ({
      productId: product.productId.toString(),
      name: product.name,
      price: product.price,
      quantity: product.quantity
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to retrieve cart' });
  }
};

module.exports = {
  loadCartPage,
  addToCart,
  updateQuantity,
  deleteCartProduct,
  getCartTotals,
  getCart
};