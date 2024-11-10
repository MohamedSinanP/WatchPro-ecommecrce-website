const couponModel = require('../models/couponModel');


const loadCoupons = async (req, res) => {
  const coupons = await couponModel.find({});
  res.render('admin/coupons', { coupons });

}

const addCoupon = async (req, res) => {
  console.log(req.body);

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

// user coupon management

const applyCoupon = async (req, res) => {

  console.log('hh');

  const { code, cartTotal } = req.body;
  req.session.cartTotal = cartTotal;
  try {
    const coupon = await couponModel.findOne({ code: code });

    const minPurchaseLimit = coupon.minPurchaseLimit;
    console.log(minPurchaseLimit);

    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }


    if (new Date() > coupon.expireDate) {
      return res.json({ success: false, message: 'Coupon has expired' });
    }

    if (cartTotal < minPurchaseLimit) {
      return res.json({ success: false, message: `The coupon only get for purchase greter than ${minPurchaseLimit}` })
    }



    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discount) / 100;
    } else if (coupon.discountType === 'amount') {
      discount = coupon.discount;
      console.log(discount);
    }


    discount = Math.min(discount, cartTotal);
    console.log(discount);


    const newTotal = cartTotal - discount;
    console.log(newTotal);

    return res.json({ success: true, newTotal: newTotal, message: 'Coupon applied successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false })
  }

}

const removeCoupon = async (req, res) => {
  const { code, cartTotal } = req.body;
  const oldCartTotal = req.session.cartTotal;
  console.log(oldCartTotal);

  try {
    res.json({ success: true, oldCartTotal: oldCartTotal });

    req.session.cartTotal = null;
  } catch (error) {
    console.log(error);
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