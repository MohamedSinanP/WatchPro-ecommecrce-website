const userModel = require('../../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const walletModel = require('../../models/walletModel');

// load login page for the user

const loadLoginPage = async (req, res) => {

  try {
    res.render('user/login', { message: undefined });
  } catch (error) {
    console.error('Error loading login page:', error);
    res.status(500).send('An error occurred while loading the login page.');
  }

}

// load signup page for the user

const loadSignupPage = async (req, res) => {
  try {
    res.render('user/signup');
  } catch (error) {
    console.error('Error loading signup page:', error);
    res.status(500).send('An error occurred while loading the signup page.');
  }

}

// to generate OTP

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// to generate referral offer

const generateReferralCode = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// to send otp to the user 

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

// to save user informations 

const signup = async (req, res) => {

  try {
    const { fullName, email, password, confirmPassword, referralCode } = req.body;

    if (password !== confirmPassword) {
      return res.render('user/signup', { message: "Password does not match" });
    };

    const findUser = await userModel.findOne({ email });
    if (findUser) {
      return res.render('user/signup', { message: "User with this email already exists" })
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
    console.error('Signup error', error);
    res.status(500).send('internal server error');
  }
}

// to bcrypt the user password for security

const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);

  return passwordHash;
}

// to verify user otp

const verifyOtp = async (req, res) => {
  try {

    const { otp } = req.body;

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

      if (req.session.referralCode) {
        const referringUser = await userModel.findOne({ referralCode: req.session.referralCode });

        if (referringUser) {
          let referredUserWallet = await walletModel.findOne({ userId: referringUser._id });

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
              userId: referringUser._id,
              balance: 50,
              transaction: [{
                transactionType: "Referral Bonus",
                amount: "50",
                date: new Date()
              }]
            });
            await referredUserWallet.save();
          }
        }
      }



      req.session.user = saveUserData._id;

      res.json({ success: true, redirectUrl: "/home" })
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP , Please try again" })
    }


  } catch (error) {
    console.error("Error Verifying OTP ", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
}

// to send resend otp to the usesr

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

// to authenticate user login

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

    return res.redirect('/home');
  } catch (error) {
    console.error(error);
    return res.render('user/login', { message: 'An error occurred, please try again' });
  }
}

// to logout for users

const logout = async (req, res) => {
  try {
    const user = req.session.user;
    if (user) {
      req.session.isAuthenticated = false;
      req.session.user = null;
    }
    res.redirect('/home');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
}


module.exports = {
  loadLoginPage,
  loadSignupPage,
  signup,
  verifyOtp,
  sendVerificationEmail,
  resendOtp,
  login,
  logout
}