const categoryModel = require('../../models/categoryModel');
const productModel = require('../../models/productModel');
require('dotenv').config();


// to show products in admin side 

const loadProducts = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const search = req.query.search || '';
    const limit = 6;
    const skip = (page - 1) * limit;

    const query = search
      ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { 'category.name': { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    const categories = await categoryModel.find();
    const totalProducts = await productModel.countDocuments(query);
    const products = await productModel
      .find(query)
      .sort({ updatedAt: -1 })
      .populate('category')
      .skip(skip)
      .limit(limit);


    const totalPages = Math.ceil(totalProducts / limit);
    const currentPage = page;
    res.render('admin/products', { products, categories, currentPage, limit, totalPages, search });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).send('Internal server error');
  }
};

// to add new product in products collection

const addProduct = async (req, res) => {
  try {
    const { name, brand, price, description, category, stock } = req.body;

    if (!name || !brand || !price || !description || !category || !stock) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }

    const images = req.files;
    const imageUrls = images.map(file => file.path);

    const newProduct = new productModel({
      name: name.trim(),
      brand: brand.trim(),
      price: parseFloat(price),
      description: description.trim(),
      category,
      stock: parseInt(stock),
      images: imageUrls
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully!',
      product: newProduct
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product',
      error: error.message
    });
  }
};

// edit existing product in products collection

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

    if (!name || !brand || !category || !description || !price || !stock) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const updateData = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      description: description.trim(),
      price: parseFloat(price),
      stock: parseInt(stock)
    };

    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => file.path);
      updateData.images = imageUrls;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the product',
      error: error.message
    });
  }
};


// to change the status of the products (listed/unlisted)

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


module.exports = {
  loadProducts,
  addProduct,
  editProduct,
  isListedProduct
}