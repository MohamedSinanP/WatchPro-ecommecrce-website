const couponModel = require('../models/couponModel');

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

// to apply coupon to the user cart total 

const applyCoupon = async (req, res) => {
  const { code, cartTotal } = req.body;
  req.session.cartTotal = cartTotal;
  const userId = req.session.user;

  try {
    const coupon = await couponModel.findOne({ code: code });

    // Handle missing coupon
    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }

    // Expiry check
    if (new Date() > coupon.expireDate) {
      return res.json({ success: false, message: 'Coupon has expired' });
    }

    // usage check
    if (coupon.userId.includes(userId)) {
      return res.json({ success: false, message: 'Coupon can use only once' });
    };

    // Minimum purchase limit check
    if (cartTotal < coupon.minPurchaseLimit) {
      return res.json({
        success: false,
        message: `This coupon is valid only for purchases above ₹${coupon.minPurchaseLimit}`
      });
    }

    let discount = 0;

    // Calculate discount
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discount) / 100;

      // Cap discount to maxDiscount
      if (discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'amount') {
      discount = coupon.discount;
    }

    // Ensure discount doesn't exceed total
    discount = Math.min(discount, cartTotal);

    const newTotal = cartTotal - discount;


    return res.json({
      success: true,
      newTotal: newTotal,
      discount,
      couponId: coupon._id,
      message: 'Coupon applied successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};


// to remove coupon from cart total

const removeCoupon = async (req, res) => {

  try {
    const oldCartTotal = req.session.cartTotal;
    res.json({ success: true, oldCartTotal: oldCartTotal });
    req.session.cartTotal = null;
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });

  }
}


module.exports = {
  loadCoupons,
  addCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon
}