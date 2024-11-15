const categoryModel = require('../models/categoryModel');
const productModel = require('../models/productModel');
const sharp = require('sharp');
const path = require('path');
const offerModel = require('../models/offerModel');


// admin product management


const loadProducts = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    const products = await productModel.find().populate('category');
    res.render('admin/products', { products, categories });
  } catch (error) {
    console.log(error);
    res.status(500).send('internal server error')
  }
}

const addProduct = async (req, res) => {


  try {
    const { name, brand, price, description, category, stock } = req.body;
    const images = req.files;
    console.log(req.body);

    const imagePaths = await Promise.all(
      images.map(async (file, index) => {

        const outputFileName = `resized-${Date.now()}-${index}.jpg`;
        const outputFilePath = path.join('uploads', outputFileName);

        await sharp(file.path)
          .resize(500, 500, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(outputFilePath);


        return `/${outputFilePath.replace(/\\/g, '/')}`;
      })
    );


    const newProduct = new productModel({
      name,
      brand,
      price,
      description,
      category,
      stock,
      images: imagePaths
    });

    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
};

const editProduct = async (req, res) => {
  console.log('ffff');


  try {
    const productId = req.params.id;
    console.log(productId);

    console.log(req.body);

    const {
      name,
      brand,
      category,
      description,
      price,
      stock,
    } = req.body;




    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      {
        name,
        brand,
        category,
        description,
        price,
        stock
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
    console.log('Error updating product:', error);
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
    const products = await productModel.find({ isListed: true }).populate('category');
    const offers = await offerModel.find({ isActive: true }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);

    const modifiedProducts = products.map(product => {

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
      };
    });

    res.render('user/products', { products: modifiedProducts });

  } catch (error) {
    console.error('Error in loadProductPage:', error.message, error.stack);
    res.status(500).render('error', { message: 'Error fetching products' });
  }
};

const loadSingleProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await productModel.findById(productId).populate('category');
    
 console.log(product.category);

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
      console.log(categoryDoc);
      
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
    console.log(error);
    res.status(500).json('Failed to filter data');
  }
};


const searchProduct = async (req, res) => {

  const query = req.query.query;
  console.log(query);

  try {

    const products = await productModel.find({
      name: { $regex: query, $options: 'i' }
    });

    if (products.length > 0) {
      const modifiedProducts = products.map(product => ({
        ...product._doc,
        imageUrl: product.images[product.images.length - 1],
      }));

      console.log(modifiedProducts);

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