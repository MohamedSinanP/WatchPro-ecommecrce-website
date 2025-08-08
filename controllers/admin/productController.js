const categoryModel = require('../../models/categoryModel');
const productModel = require('../../models/productModel');
require('dotenv').config();

// Load products in admin side
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

// Add new product
const addProduct = async (req, res) => {
  try {
    const { name, brand, price, description, category, variants } = req.body;

    // Parse variants if it's a string (from JSON.stringify in frontend)
    let parsedVariants;
    try {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variants format',
      });
    }
    console.log('Parsed Variants:', parsedVariants);

    // Validate required fields
    if (!name || !brand || !price || !description || !category || !parsedVariants) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required, including at least one variant',
      });
    }

    // Validate variants
    const validSizes = ['Small', 'Medium', 'Large', 'ExtraLarge'];
    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required',
      });
    }

    // Validate each variant
    const variantsArray = parsedVariants.map(variant => ({
      size: variant.size,
      stock: parseInt(variant.stock) || 0,
    }));

    const hasValidVariant = variantsArray.some(variant => validSizes.includes(variant.size) && variant.stock > 0);
    if (!hasValidVariant) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid variant with stock greater than 0 is required',
      });
    }

    // Validate images
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required',
      });
    }

    const imageUrls = req.files.map(file => file.path);

    // Calculate total stock
    const totalStock = variantsArray.reduce((sum, variant) => sum + variant.stock, 0);

    const newProduct = new productModel({
      name: name.trim(),
      brand: brand.trim(),
      price: parseFloat(price),
      description: description.trim(),
      category,
      stock: totalStock,
      images: imageUrls,
      variants: variantsArray,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product added successfully!',
      product: newProduct,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding product',
      error: error.message,
    });
  }
};

// Edit existing product
const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, brand, category, description, price, variants } = req.body;

    // Parse variants if it's a string
    let parsedVariants;
    try {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variants format',
      });
    }

    // Validate required fields
    if (!name || !brand || !category || !description || !price || !parsedVariants) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required, including at least one variant',
      });
    }

    // Validate variants
    const validSizes = ['Small', 'Medium', 'Large', 'ExtraLarge'];
    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required',
      });
    }

    const variantsArray = parsedVariants.map(variant => ({
      size: variant.size,
      stock: parseInt(variant.stock) || 0,
    }));

    const hasValidVariant = variantsArray.some(variant => validSizes.includes(variant.size) && variant.stock > 0);
    if (!hasValidVariant) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid variant with stock greater than 0 is required',
      });
    }

    // Calculate total stock
    const totalStock = variantsArray.reduce((sum, variant) => sum + variant.stock, 0);

    const updateData = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      description: description.trim(),
      price: parseFloat(price),
      stock: totalStock,
      variants: variantsArray,
    };

    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map(file => file.path);
      updateData.images = imageUrls;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(productId, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
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
      error: error.message,
    });
  }
};

// Change product listing status
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
      res.json({ success: false, message: 'Product not found' });
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
  isListedProduct,
};