const categoryModel = require('../models/categoryModel');
const productModel = require('../models/productModel');
const wishlistModel = require('../models/wishlistModel');
const sharp = require('sharp');
const path = require('path');
const offerModel = require('../models/offerModel');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

// admin product management

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
const accessKey = process.env.ACCESS_KEY;

const s3Client = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
});

const loadProducts = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;
    const categories = await categoryModel.find();
    const totalProducts = await productModel.countDocuments();
    const products = await productModel.find().populate('category')
      .skip(skip)
      .limit(limit);

    // for (let product of products) {
    //   const imageUrls = await Promise.all(
    //     product.images.map(async (image) => {
    //       const getObjectParams = {
    //         Bucket: bucketName,
    //         Key: image, 
    //       };

    //       const command = new GetObjectCommand(getObjectParams);
    //       const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); 
    //       return signedUrl;
    //     })
    //   );
    //   product.imageUrls = imageUrls; 
    // }

    const totalPages = Math.ceil(totalProducts / limit);
    currentPage = page;
    res.render('admin/products', { products, categories, currentPage, limit, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send('internal server error')
  }
}

const addProduct = async (req, res) => {


  try {
    const { name, brand, price, description, category, stock } = req.body;
    const images = req.files;

    const imageUrls = await Promise.all(
      images.map(async (file, index) => {
        const resizedImageBuffer = await sharp(file.path)
          .resize(500, 500, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const s3Key = `products/${Date.now()}-${index}-${file.originalname}`;

        const params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: resizedImageBuffer,
          ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        return `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${s3Key}`;
      })
    );


    const newProduct = new productModel({
      name,
      brand,
      price,
      description,
      category,
      stock,
      images: imageUrls
    });

    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const {
      name,
      brand,
      category,
      description,
      price,
      stock
    } = req.body;

    const images = req.files;

    const imageUrls = await Promise.all(
      images.map(async (file, index) => {
        const resizedImageBuffer = await sharp(file.path)
          .resize(500, 500, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const s3Key = `products/${Date.now()}-${index}-${file.originalname}`;

        const params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: resizedImageBuffer,
          ContentType: file.mimety
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        return `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${s3Key}`;
      })
    );

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      {
        name,
        brand,
        category,
        description,
        price,
        stock,
        images: imageUrls
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'An error occurred while updating the product' });
  }
};

const isListedProduct = async (req, res) => {
  try {
    const { productId, isListed } = req.body;
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { isListed },
      { new: true }
    );

    if (updatedProduct) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// user product management

const loadProductPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 10;
    const skip = (page - 1) * limit;
    const totalProducts = await productModel.countDocuments();
    const products = await productModel.find({ isListed: true }).populate('category')
    .skip(skip)
    .limit(limit);
    const totalPages = Math.ceil(totalProducts / limit);
    const currentPage = page;

    const offers = await offerModel.find({ isActive: true }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);
    const wishlist = await wishlistModel.findOne({ userId: userId });
    const wishlistProductIds = wishlist ? wishlist.products.map(product => product.productId.toString()) : [];
    const modifiedProducts = products.map(product => {
      const isInWishlist = wishlistProductIds.includes(product._id.toString());
      const productOffers = offers.filter(offer => {
        const matchesProduct = offer.products.some(prod => {

          return prod._id.equals(product._id);
        });

        const productCategoryId = product.category._id ? product.category._id : product.category;
        const matchesCategory = offer.categories.some(cat => {
          return cat._id.equals(productCategoryId);
        });


        return matchesProduct || matchesCategory;
      });


      let offerPrice = product.price;

      if (productOffers.length > 0) {

        let bestOffer = productOffers[0];

        if (bestOffer.discountType === 'percentage') {
          const discountAmount = (product.price * bestOffer.discountValue) / 100;
          offerPrice = (product.price - discountAmount).toFixed(2);
        } else if (bestOffer.discountType === 'amount') {
          offerPrice = (product.price - bestOffer.discountValue).toFixed(2);
        }
      }

      return {
        ...product.toObject(),
        imageUrl: product.images[2],
        offers: productOffers,
        offerPrice,
        isInWishlist  
      };
    });

     

    res.render('user/products', { products: modifiedProducts,currentPage, totalPages, limit });

  } catch (error) {
    console.error('Error in loadProductPage:', error.message, error.stack);
    res.status(500).render('error', { message: 'Error fetching products' });
  }
};

const loadSingleProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await productModel.findById(productId).populate('category');


    const relatedProducts = await productModel
      .find({ category: product.category._id, _id: { $ne: productId } })
      .select('name price images')
      .limit(4);



    const formattedRelatedProducts = relatedProducts.map(relatedProduct => ({
      ...relatedProduct.toObject(),
      imageUrl: relatedProduct.images[2] || ''
    }));

    // Fetch active offers
    const offers = await offerModel.find({ isActive: true }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);


    const productOffers = offers.filter(offer => {
      const matchesProduct = offer.products.some(prod => prod._id.equals(product._id));
      const productCategoryId = product.category._id ? product.category._id : product.category;
      const matchesCategory = offer.categories.some(cat => cat._id.equals(productCategoryId));

      return matchesProduct || matchesCategory;
    });

    // Calculate offer price
    let offerPrice = product.price;
    if (productOffers.length > 0) {
      const bestOffer = productOffers[0];

      if (bestOffer.discountType === 'percentage') {
        const discountAmount = (product.price * bestOffer.discountValue) / 100;
        offerPrice = (product.price - discountAmount).toFixed(2);
      } else if (bestOffer.discountType === 'amount') {
        offerPrice = (product.price - bestOffer.discountValue).toFixed(2);
      }
    }

    // Render the product page with product details, offers, and related products
    res.render('user/singleProduct', {
      product: {
        ...product.toObject(),
        offerPrice,
        offers: productOffers,
      },
      relatedProducts: formattedRelatedProducts // Send formatted related products to the view
    });

  } catch (error) {
    console.error('Error in loadSingleProductPage:', error.message, error.stack);
    res.status(500).send('Failed to load product details page');
  }
};

const filterProduct = async (req, res) => {
  const { category, genderType, sortBy, price, order, page = 1, limit = 10 } = req.query;

  try {
    let categoryFilter = {};

    // Check if both category name and genderType are provided
    if (category || genderType) {

      const categoryDoc = await categoryModel.findOne({ name: category, genderType: genderType });

      if (categoryDoc) {
        categoryFilter = { category: categoryDoc._id };
      } else {
        return res.status(404).json({ message: 'Category with the specified gender type not found' });
      }
    }

    const pipeline = [];

    if (Object.keys(categoryFilter).length) {
      pipeline.push({ $match: categoryFilter });
    }

    const sort = {};
    if (price === 'lowtohigh') sort.price = 1;
    if (price === 'hightolow') sort.price = -1;
    if (order === 'a-z') sort.name = 1;
    if (order === 'z-a') sort.name = -1;
    if (sortBy === 'newness') sort.createdAt = -1;

    if (Object.keys(sort).length) {
      pipeline.push({ $sort: sort });
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit, 10) });

    const products = await productModel.aggregate(pipeline);
    const totalProducts = await productModel.countDocuments(categoryFilter);
    const totalPages = Math.ceil(totalProducts / limit);

    const modifiedProducts = products.map(product => ({
      ...product,
      imageUrl: product.images[product.images.length - 1],
    }));

    res.json({
      products: modifiedProducts,
      totalPages,
      currentPage: parseInt(page, 10),
      totalProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json('Failed to filter data');
  }
};

const searchProduct = async (req, res) => {

  const query = req.query.query;

  try {

    const products = await productModel.find({
      name: { $regex: query, $options: 'i' }
    });

    if (products.length > 0) {
      const modifiedProducts = products.map(product => ({
        ...product._doc,
        imageUrl: product.images[product.images.length - 1],
      }));

      res.json({ success: true, products: modifiedProducts });
    } else {
      res.json({ success: false, message: "No results found" });
    }
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }

}


module.exports = {
  loadProducts,
  addProduct,
  editProduct,
  isListedProduct,
  loadProductPage,
  loadSingleProductPage,
  filterProduct,
  searchProduct
}