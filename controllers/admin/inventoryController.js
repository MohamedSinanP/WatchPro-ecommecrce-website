const productModel = require('../../models/productModel');


// to show inventory page 

const loadInventory = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await productModel.countDocuments();
    const products = await productModel.find({})
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    const totalPages = Math.ceil(totalProducts / limit);
    const currentPage = page;

    res.render('admin/inventory', { products, currentPage, limit, totalPages });
  } catch (error) {
    console.error('Error loading inventory:', error);
    res.status(500).send('Internal server error');
  }
};

const updateInventory = async (req, res) => {
  const productId = req.params.id;
  const { price, variants } = req.body;

  try {
    // Validate price
    if (!price || price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    // Validate variants input
    if (!Array.isArray(variants)) {
      return res.status(400).json({ message: 'Variants must be an array' });
    }

    // Validate variant stocks
    const hasInvalidStock = variants.some(variant => Number(variant.stock) < 0);
    if (hasInvalidStock) {
      return res.status(400).json({ message: 'Variant stock cannot be negative' });
    }

    // Calculate total stock from variants
    const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock), 0);

    // Update the product with new price, variants, and total stock
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      {
        price,
        variants: variants.map(v => ({
          _id: v._id,
          size: v.size,
          stock: Number(v.stock)
        })),
        stock: totalStock
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getProductDetails = async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await productModel.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getProductDetails, updateInventory, loadInventory }