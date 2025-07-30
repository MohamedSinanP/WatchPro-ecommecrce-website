const couponModel = require('../../models/couponModel');

// to show coupons in admin side
const loadCoupons = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    // Get the total number of coupons
    const totalCoupons = await couponModel.countDocuments();

    const coupons = await couponModel
      .find({})
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCoupons / limit);
    const currentPage = page;

    res.render('admin/coupons', { coupons, currentPage, limit, totalPages });
  } catch (error) {
    console.error('Error loading coupon', error);
    res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
};

// to add new coupon in coupon collection 
const addCoupon = async (req, res) => {
  const { name, code, expireDate, discountType, discount, minPurchaseLimit, isActive } = req.body;

  const couponData = {
    name,
    code,
    expireDate,
    discountType,
    discount,
    minPurchaseLimit,
    isActive
  };

  if (discountType === 'percentage' && req.body.maxDiscount) {
    couponData.maxDiscount = req.body.maxDiscount;
  }

  try {
    const newCoupon = new couponModel(couponData);
    await newCoupon.save();

    res.status(201).json({ success: true, message: 'Coupon added successfully!' });
  } catch (error) {
    console.error('Error adding coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to add coupon. Please try again.' });
  }
};

// to get a single coupon for editing
const getCoupon = async (req, res) => {
  const couponId = req.params.id;
  try {
    const coupon = await couponModel.findById(couponId);
    if (coupon) {
      res.status(200).json({ success: true, coupon });
    } else {
      res.status(404).json({ success: false, message: 'Coupon not found' });
    }
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
  }
};

// to update a coupon
const updateCoupon = async (req, res) => {
  const couponId = req.params.id;
  const { name, code, expireDate, discountType, discount, minPurchaseLimit, isActive } = req.body;

  const couponData = {
    name,
    code,
    expireDate,
    discountType,
    discount,
    minPurchaseLimit,
    isActive
  };

  if (discountType === 'percentage' && req.body.maxDiscount) {
    couponData.maxDiscount = req.body.maxDiscount;
  }

  try {
    const updatedCoupon = await couponModel.findByIdAndUpdate(
      couponId,
      couponData,
      { new: true, runValidators: true }
    );

    if (updatedCoupon) {
      res.status(200).json({ success: true, message: 'Coupon updated successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Coupon not found' });
    }
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon. Please try again.' });
  }
};

// to delete a coupon
const deleteCoupon = async (req, res) => {
  const couponId = req.params.id;
  try {
    const deleteCoupon = await couponModel.findByIdAndDelete({ _id: couponId });
    if (deleteCoupon) {
      res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting coupon', error)
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

module.exports = {
  loadCoupons,
  addCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon
}