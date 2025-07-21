const userModel = require('../../models/userModel');
const productModel = require('../../models/productModel');
const offerModel = require('../../models/offerModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const addressModel = require('../../models/addressModel');
const walletModel = require('../../models/walletModel');

// load home page for the user

const loadHomePage = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user);
    const products = await productModel.find({}).limit(8);
    const offers = await offerModel.find({ isActive: true }).populate([
      { path: 'products' },
      { path: 'categories' }
    ]);

    const modifiedProducts = products.map(product => {

      const productOffers = offers.filter(offer => {
        const matchesProduct = offer.products.some(prod => {

          return prod._id.equals(product._id);
        });

        const productCategoryId = product.category._id ? product.category._id : product.category;
        const matchesCategory = offer.categories.some(cat => {
          return cat._id.equals(productCategoryId);
        });


        return matchesProduct || matchesCategory;
      });


      let offerPrice = product.price;

      if (productOffers.length > 0) {

        let bestOffer = productOffers[0];

        if (bestOffer.discountType === 'percentage') {
          const discountAmount = (product.price * bestOffer.discountValue) / 100;
          offerPrice = (product.price - discountAmount).toFixed(2);
        } else if (bestOffer.discountType === 'amount') {
          offerPrice = (product.price - bestOffer.discountValue).toFixed(2);
        }
      }

      return {
        ...product.toObject(),
        imageUrl: product.images[2],
        offers: productOffers,
        offerPrice,
      };
    });
    res.render('user/home', { user, products: modifiedProducts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to load home page Try again');
  }
};

// to show user profile page

const loadProfilePage = async (req, res) => {

  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });
    if (user) {
      res.render('user/profile', { user });
    } else {
      res.status(404).send('User not found');
    }

  } catch (error) {
    res.status(500).send('falied to load profile page Try again')
    console.error(error)
  }


};

// to update user informations

const updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { fullName, email } = req.body;

    const existingUser = await userModel.findOne({ email: email, _id: { $ne: userId } });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use by another user' });
    }


    const editUser = await userModel.findOneAndUpdate(
      { _id: userId },
      { fullName: fullName, email: email },
      { new: true }
    );

    if (editUser) {
      res.status(200).json({ message: 'User updated successfully!', user: editUser });
    } else {
      res.status(404).json({ message: 'User not found' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to edit profile, please try again');
  }
};

// to change user password

const changePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const { oldPassword, newPassword } = req.body;


    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }


    const hashedNewPassword = await bcrypt.hash(newPassword, 10);


    await userModel.findOneAndUpdate(
      { _id: userId },
      { password: hashedNewPassword },
      { new: true }
    );
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to change password, please try again' });
  }
};

// to show user addresses in user side

const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalAddress = await addressModel.countDocuments({ userId: userId });
    const addresses = await addressModel
      .find({ userId: userId })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalAddress / limit);
    const currentPage = page;

    res.render('user/address', {
      addresses,
      currentPage,
      totalPages,
      limit
    });
  } catch (error) {
    console.error('Error loading address page:', error);
    res.status(500).send('Failed to load address page. Try again.');
  }
};

// to add new address for users

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { firstName, lastName, email, address, phoneNumber, city, state, pincode } = req.body;
    const newAddress = new addressModel({
      userId,
      firstName,
      lastName,
      email,
      address,
      phoneNumber,
      city,
      state,
      pincode
    });
    await newAddress.save();
    res.status(201).json('address added successfully');
  } catch (error) {
    console.error(error)
    res.status(500).send('Failed to add new address Try again');
  }
};

// to add default address from checkout page

const addDefaultAddress = async (req, res) => {

  const { firstName, lastName, email, address, phoneNumber, city, state, pincode } = req.body;
  const userId = req.session.user;
  try {
    const newAddress = new addressModel({
      userId,
      firstName,
      lastName,
      email,
      address,
      phoneNumber,
      city,
      state,
      pincode
    });

    await newAddress.save();
    res.status(200).json({
      message: 'Address added successfully',
      newAddress,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Interenal server error' });
  }
}

// to update an existing addresss

const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const { firsName, lastName, email, address, phoneNumber, city, state, pincode } = req.body;

    const editAddress = await addressModel.findByIdAndUpdate(
      addressId,
      {
        firsName,
        lastName,
        email,
        address,
        phoneNumber,
        city,
        state,
        pincode
      },
      { new: true }
    );

    if (!editAddress) {
      res.status(404).send('Address not found');
    }

    res.status(200).json({ success: true, data: editAddress });


  } catch (error) {
    res.status(500).send('Error updating address Try again');
  }


};

// to delete address of a specific user

const deleteAddress = async (req, res) => {

  try {
    const addressId = req.params.id;

    addressDelete = await addressModel.findByIdAndDelete({ _id: addressId });

    if (!addressDelete) {
      return res.status(404).json({ success: false, message: 'Cannot delete address. Address not found.' });
    }

    res.status(200).json({ success: true, message: 'Address deleted successfully.' });


  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to delete address Try again');
  }


};

// to load about page for the user

const loadAboutPage = async (req, res) => {
  try {
    res.render('user/about');
  } catch (error) {
    res.status(500).send('Internal server error');
  }
}

// to load contact page for the user

const loadContactPage = async (req, res) => {
  try {
    res.render('user/contact');
  } catch (error) {
    res.status(500).send('Internal server error');
  }

}


module.exports = {
  loadHomePage,
  loadProfilePage,
  updateUser,
  changePassword,
  loadAddressPage,
  addAddress,
  addDefaultAddress,
  updateAddress,
  deleteAddress,
  loadAboutPage,
  loadContactPage,
}
