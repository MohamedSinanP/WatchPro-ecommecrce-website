const userModel = require('../models/userModel');

const checkSession = async (req, res, next) => {
  const userId = req.session.user;

  try {
    const user = await userModel.findOne({ _id: userId }); 

    if (!user) {

      return res.redirect('/user/login');
    }

    if (user.isBlocked) {
      req.session.toastMessage = 'Your account is blocked.';
      return res.redirect('/user/login'); 
    }

  
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {checkSession};

