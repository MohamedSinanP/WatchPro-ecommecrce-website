const categoryModel = require('../models/categoryModel');
const productModel = require('../models/productModel');
const offerModel = require('../models/offerModel');


const loadOffers = async (req, res) => {

  try {
    const products = await productModel.find();
    const categories = await categoryModel.find();
    const offers = await offerModel.find().populate('products').populate('categories');
    res.render('admin/offers', { offers, products, categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internel server error' });
  }

};

const addOffer = async (req, res) => {
  const { title, discountType, discountValue, products, categories, expireDate, isActive } = req.body;

  if (!title || !discountType || !discountValue || !expireDate || isActive === undefined) {
    return res.json({ success: false, message: 'Missing required fields' });
  }

  if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
    return res.json({ success: false, message: 'Percentage discount must be between 1 and 100' });
  }

  if (discountType === 'amount' && discountValue <= 0) {
    return res.json({ success: false, message: 'Amount discount must be greater than 0' });
  }

  const parsedExpireDate = new Date(expireDate);
  if (isNaN(parsedExpireDate.getTime()) || parsedExpireDate < new Date()) {
    return res.json({ success: false, message: 'Invalid or past expire date' });
  }

  const offerData = {
    title,
    discountType,
    discountValue,
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories : [],
    expireDate: parsedExpireDate,
    isActive
  };

  try {
    const newOffer = new offerModel(offerData);
    await newOffer.save();
    res.status(201).json({ success: true, message: 'New offer added successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteOffer = async (req, res) => {
  const offerId = req.params.id;
  try {
    const offerDelete = await offerModel.findByIdAndDelete(offerId);
    if (offerDelete) {
      res.status(201).json({ success: true })
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false })
  }
};


module.exports = {
  loadOffers,
  addOffer,
  deleteOffer
}