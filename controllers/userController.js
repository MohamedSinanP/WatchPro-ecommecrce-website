const userModel = require('../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const addressModel = require('../models/addressModel');
const walletModel = require('../models/walletModel');


const loadHomePage = async (req, res) => {
  try {
    const user = await userModel.findById(req.session.user);
    res.render('user/home', { user });
  } catch (error) {
    res.status(500).send('Failed to load home page Try again');
  }
};

const loadLoginPage = async (req, res) => {

  try {
    res.render('user/login', { message: undefined });
  } catch (error) {
    console.log('Error loading login page:', error);
    res.status(500).send('An error occurred while loading the login page.');
  }

}

const loadSignupPage = async (req, res) => {
  try {
    res.render('user/signup');
  } catch (error) {
    console.error('Error loading signup page:', error);
    res.status(500).send('An error occurred while loading the signup page.');
  }

}

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

const sendVerificationEmail = async (email, otp) => {
  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP : ${otp} </b>`
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error('error sending email', error);
    return false;
  }
}

const signup = async (req, res) => {

  try {
    const { fullName, email, password, confirmPassword, referralCode } = req.body;
    console.log(req.body);

    if (password !== confirmPassword) {
      return res.render('user/signup', { message: "Password does not match" });
    };

    const findUser = await userModel.findOne({ email });
    if (findUser) {
      return res.render('user/signup', { message: "User with this emaili already exists" })
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp)

    if (!emailSent) {
      return res.json('email-error');
    }

    req.session.userOtp = otp;
    req.session.userData = { fullName, email, password };
    if (referralCode) {
      req.session.referralCode = referralCode;
    }


    res.render('user/verify-otp');
    console.log('OTP Sent', otp);



  } catch (error) {
    console.log('Signup error', error);
    res.status(500).send('internal server error');
  }
}

const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);

  return passwordHash;
}

const verifyOtp = async (req, res) => {
  try {

    const { otp } = req.body;
    console.log(otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const referralCode = generateReferralCode();
      const saveUserData = new userModel({
        fullName: user.fullName,
        email: user.email,
        password: passwordHash,
        referralCode: referralCode,
        ...(user.googleId ? { googleId: user.googleId } : {})
      })

      await saveUserData.save();

      const referredUser = await userModel.findOne({ referralCode: referralCode });
      const referredUserId = referredUser._id;
      let referredUserWallet = await walletModel.findOne({ userId: referredUserId });
      if (referredUserWallet) {
        referredUserWallet.balance += 50;
        referredUserWallet.transaction.push({
          transactionType: "Referral Bonus",
          amount: "50",
          date: new Date()
        });
        await referredUserWallet.save();
      } else {
        referredUserWallet = new walletModel({
          userId: referredUserId,
          balance: 50,
          transaction: [{
            transactionType: "Referral Bonus",
            amount: "50",
            date: new Date()
          }]
        });
        await referredUserWallet.save();
      }



      req.session.user = saveUserData._id;

      res.json({ success: true, redirectUrl: "/user/home" })
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP , Please try again" })
    }


  } catch (error) {
    console.error("Error Verifying OTP ", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
}

const resendOtp = async (req, res) => {

  try {
    const { email } = req.session.userData;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log('Resend OTP', otp);
      res.status(200).json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res.status(500).json({ success: false, message: 'Failed to eesend OTP, Pleas try again' })
    }
  } catch (error) {
    console.error('Error resending OTP', error);
    res.status(500).json({ success: false, message: "Internel Server Error, Please try again" });
  }


};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await userModel.findOne({ email });

    if (!findUser) {
      return res.render('user/login', { message: 'User does not exist' });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render('user/login', { message: 'Incorrect password' });
    }
    if (findUser.isBlocked) {
      return res.render('user/login', { message: 'You are blocked' });
    }



    req.session.isAuthenticated = true;
    req.session.user = findUser._id;

    return res.redirect('/user/home');
  } catch (error) {
    console.error(error);
    return res.render('user/login', { message: 'An error occurred, please try again' });
  }
}

const demoLogin = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (email === "demo@example.com" && password === "demopassword123") {
      req.session.user = { email, role: 'demo' };

      res.redirect('/user/home');
    } else {
      res.status(401).send('Invalid demo login credentials.');
    }
  } catch (error) {
    console.error("Error during demo login:", error);
    return res.status(500).send('An error occurred while processing your request.');
  }
};

const loadAccountPage = async (req, res) => {
  try {
    res.render('user/account');
  } catch (error) {
    res.status(500).send('failed to load user account page');
  }


}

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

const changePassword = async (req, res) => {
  try {
    const userId = req.session.user.id;
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

const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const addresses = await addressModel.find({ userId: userId });
    res.render('user/address', { addresses });
  } catch (error) {
    res.status(500).send('Failed to load address page Try again');
  }
}

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
    res.status(201).json('product added successfully');
  } catch (error) {
    console.log(error)
    res.status(500).send('Failed to add new address Try again');
  }



};

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
    const addressId = newAddress._id;
    console.log(addressId);

    await addressModel.updateMany({ userId: userId }, { default: false });

    await addressModel.findByIdAndUpdate(addressId, { default: true });

    res.redirect('/user/checkout');

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Interenal server error' });
  }
}

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

const deleteAddress = async (req, res) => {

  try {
    const addressId = req.params.id;

    addressDelete = await addressModel.findByIdAndDelete({ _id: addressId });
    console.log(addressDelete);

    if (!addressDelete) {
      return res.status(404).json({ success: false, message: 'Cannot delete address. Address not found.' });
    }

    res.status(200).json({ success: true, message: 'Address deleted successfully.' });


  } catch (error) {
    console.log(error);

    res.status(500).send('Failed to delete address Try again');
  }


};


module.exports = {
  loadHomePage,
  loadLoginPage,
  loadSignupPage,
  signup,
  verifyOtp,
  resendOtp,
  login,
  demoLogin,
  loadAccountPage,
  loadProfilePage,
  updateUser,
  changePassword,
  loadAddressPage,
  addAddress,
  addDefaultAddress,
  updateAddress,
  deleteAddress,
}
