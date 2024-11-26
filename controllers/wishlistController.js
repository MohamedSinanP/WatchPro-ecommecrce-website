const productModel = require('../models/productModel');
const wishlistModel = require('../models/wishlistModel');
const couponModel = require('../models/couponModel');

// to load wishlist page for the user

const loadWishlistPage = async (req, res) => {
  const userId = req.session.user;

  try {
    const wishlist = await wishlistModel.findOne({ userId: userId });
    const coupons = await couponModel.find({});

    if (!wishlist || !wishlist.products.length) {
      return res.render('user/wishlist', { products: [], coupons: coupons });
    }


    const productsWithImages = await Promise.all(
      wishlist.products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId).lean();


        return {
          ...product,
          id: productDetails ? productDetails._id : '',
          name: productDetails ? productDetails.name : '',
          price: productDetails ? productDetails.price : 0,
          stock: productDetails ? productDetails.stock : 0,
          quantity: product.quantity,
          imageUrl: productDetails ? productDetails.images[productDetails.images.length - 1] : '',

        };
      })
    );


    res.render('user/wishlist', {
      products: productsWithImages,
      wishlistId: wishlist._id,
      coupons: coupons
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// to add new product to wihslist

const addToWishlist = async (req, res) => {
  const userId = req.session.user;
  const { productId, name, price, quantity } = req.body;
  try {
    let wishlist = await wishlistModel.findOne({ userId });

    if (wishlist) {
      let itemIndex = wishlist.products.findIndex(p => p.productId == productId);

      if (itemIndex > -1) {
        return res.status(200).json({ success: false, message: 'The product is already added to wishlist' });
      } else {
        wishlist.products.push({ productId, quantity, name, price });
      }
      wishlist = await wishlist.save();
      return res.status(201).json({ success: true, message: 'Product added successfully to wishlist', wishlist });
    } else {
      const newWishlist = await wishlistModel.create({
        userId,
        products: [{ productId, quantity, name, price }]
      });
      return res.status(201).json({ success: true, message: 'Wishlist created and product added', wishlist: newWishlist });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// to delete a product from user wishlist

const deleteWishlistProduct = async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const deleteItem = await wishlistModel.updateOne(
      { userId: userId },
      { $pull: { products: { productId: productId } } }
    );

    if (!deleteItem) {

      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, deleteItem })

  } catch (error) {
    console.error(error);
    res.status(500).json('Failed to delete the product from the wishlist');
  }


}

module.exports = {
  loadWishlistPage,
  addToWishlist,
  deleteWishlistProduct
}