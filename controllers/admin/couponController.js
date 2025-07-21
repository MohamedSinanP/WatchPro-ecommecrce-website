const couponModel = require('../../models/couponModel');

// to show coupons in admin side

const loadCoupons = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalCoupons = await couponModel.countDocuments();
    const coupons = await couponModel.find({});

    const totalPages = Math.ceil(totalCoupons / limit);
    const currentPage = page;
    res.render('admin/coupons', { coupons, currentPage, limit, totalPages });
  } catch (error) {
    console.error('Error loading coupon', error)
    res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
}

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

// to delete a coupon

const deleteCoupon = async (req, res) => {
  const couponId = req.params.id;
  try {
    const deleteCoupon = await couponModel.findByIdAndDelete({ _id: couponId });
    if (deleteCoupon) {
      res.status(200).json({ success: true, message: 'coupoon deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting coupon', error)
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};


module.exports = {
  loadCoupons,
  addCoupon,
  deleteCoupon
}