const productModel = require('../models/productModel');
const wishlistModel = require('../models/wishlistModel');
const couponModel = require('../models/couponModel');



const loadWishlistPage = async (req, res) => {
  const userId = req.session.user;

  try {
    const wishlist = await wishlistModel.findOne({ userId: userId });
    const coupons = await couponModel.find({});
    console.log(coupons);

    if (!wishlist || !wishlist.products.length) {
      console.log("Wish list is not found or empty for this user");
      return res.render('user/wishlist', { products: [], coupons: coupons });
    }


    const productsWithImages = await Promise.all(
      wishlist.products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId).lean();
        console.log(productDetails);


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
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const addToWishlist = async (req, res) => {
  console.log('dfhkd');

  const userId = req.session.user;
  const { productId, name, price, quantity } = req.body;
  try {

    let wishlist = await wishlistModel.findOne({ userId });

    if (wishlist) {
      let itemIndex = wishlist.products.findIndex(p => p.productId == productId);

      if (itemIndex > -1) {
        console.log('blah blah blah');

      } else {
        wishlist.products.push({ productId, quantity, name, price });
      }
      wishlist = await wishlist.save();
      return res.status(201).send(wishlist);
    } else {
      console.log('kkkkk');

      const newWishlist = await wishlistModel.create({
        userId,
        products: [{ productId, quantity, name, price }]
      });
      return res.status(201).send(newWishlist);
    }



  } catch (error) {
    console.log(error);
    res.status(500).json('internel server error');

  }

}

const deleteWishlistProduct = async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user;

  try {
    const deleteItem = await wishlistModel.updateOne(
      { userId: userId },
      { $pull: { products: { productId: productId } } }
    );

    if (!deleteItem) {
      console.log('nnn');

      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, deleteItem })

  } catch (error) {
    console.log(error);
    res.status(500).json('Failed to delete the product from the wishlist');
  }


}

module.exports = {
  loadWishlistPage,
  addToWishlist,
  deleteWishlistProduct
}