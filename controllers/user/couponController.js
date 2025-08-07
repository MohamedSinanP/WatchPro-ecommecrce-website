const couponModel = require('../../models/couponModel');

// to apply coupon to the user cart total 
const applyCoupon = async (req, res) => {
  const { code, cartTotal } = req.body;
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
    }

    // Minimum purchase limit check
    if (cartTotal < coupon.minPurchaseLimit) {
      return res.json({
        success: false,
        message: `This coupon is valid only for purchases above ₹${coupon.minPurchaseLimit}`
      });
    }

    // Store coupon details in session instead of calculating discount here
    req.session.appliedCoupon = {
      id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discount: coupon.discount,
      maxDiscount: coupon.maxDiscount,
      minPurchaseLimit: coupon.minPurchaseLimit
    };

    // Calculate discount dynamically
    const discount = calculateCouponDiscount(coupon, cartTotal);
    const newTotal = Math.max(0, cartTotal - discount);

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

// Helper function to calculate coupon discount
const calculateCouponDiscount = (coupon, cartTotal) => {
  let discount = 0;

  // Calculate discount based on type
  if (coupon.discountType === 'percentage') {
    discount = (cartTotal * coupon.discount) / 100;

    // Apply max discount limit if exists
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === 'amount') {
    discount = coupon.discount;
  }

  // Ensure discount doesn't exceed cart total
  discount = Math.min(discount, cartTotal);

  return discount;
};

// Function to recalculate coupon discount (to be used when cart changes)
const recalculateCouponDiscount = (req, cartTotal) => {
  if (!req.session.appliedCoupon) {
    return 0;
  }

  const coupon = req.session.appliedCoupon;

  // Check if cart total still meets minimum purchase limit
  if (cartTotal < coupon.minPurchaseLimit) {
    // Remove coupon if minimum limit not met
    req.session.appliedCoupon = null;
    return 0;
  }

  // Recalculate discount
  return calculateCouponDiscount(coupon, cartTotal);
};

// to remove coupon from cart total
const removeCoupon = async (req, res) => {
  try {
    // Clear the applied coupon from session
    req.session.appliedCoupon = null;

    res.json({ success: true, message: 'Coupon removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to remove coupon' });
  }
};

// Function to get current coupon details 
const getCurrentCoupon = (req) => {
  return req.session.appliedCoupon || null;
};

module.exports = {
  applyCoupon,
  removeCoupon,
  calculateCouponDiscount,
  recalculateCouponDiscount,
  getCurrentCoupon
};