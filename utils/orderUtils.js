const productModel = require('../models/productModel');
const offerModel = require('../models/offerModel');
const getDiscountedPrice = require('./getDiscount');

// Prepare order products from cart
const prepareOrderProducts = async (cart, activeOffers) => {
  let originalTotal = 0;
  const products = cart.products.map(item => {
    const product = item.productId;
    const quantity = item.quantity;
    const variantSize = item.variantSize;

    if (!variantSize) {
      throw new Error(`Variant size is missing for product ${product.name}`);
    }

    const variant = product.variants.find(v => v.size === variantSize);
    if (!variant) {
      throw new Error(`Variant size ${variantSize} not found for product ${product.name}`);
    }

    if (variant.stock < quantity) {
      throw new Error(`Insufficient stock for variant ${variantSize} of product ${product.name}`);
    }

    const discounted = getDiscountedPrice(product, activeOffers);
    const original = product.price;
    const isOfferApplied = discounted < original;

    const effectivePrice = isOfferApplied ? discounted : original;
    originalTotal += effectivePrice * quantity;

    const productEntry = {
      productId: product._id,
      variantSize,
      quantity,
      name: product.name,
      price: original,
      status: 'Pending'
    };

    if (isOfferApplied) {
      productEntry.discountedPrice = discounted;
    }

    return productEntry;
  });

  return { products, originalTotal };
};

// Update product stock
const updateProductStock = async (products) => {
  for (const product of products) {
    const { productId, quantity, variantSize } = product;

    const updateResult = await productModel.updateOne(
      { _id: productId, 'variants.size': variantSize, 'variants.stock': { $gte: quantity } },
      { $inc: { 'variants.$.stock': -quantity } }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error(`Failed to update stock for variant ${variantSize} of product ${productId}`);
    }

    const updatedProduct = await productModel.findById(productId);
    const totalStock = updatedProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
    updatedProduct.stock = totalStock;
    await updatedProduct.save();
  }
};

module.exports = {
  prepareOrderProducts,
  updateProductStock
};