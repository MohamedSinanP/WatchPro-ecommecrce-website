const couponModel = require('../../models/couponModel');

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
    }

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

      if (discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'amount') {
      discount = coupon.discount;
    }
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
  applyCoupon,
  removeCoupon
}