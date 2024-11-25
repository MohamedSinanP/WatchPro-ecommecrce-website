const userModel = require('../models/userModel');

const checkSession = async (req, res, next) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ redirect: '/login' });
      } else {
        return res.redirect('/login'); 
      }
    }

    const user = await userModel.findById(userId);

    if (!user) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ redirect: '/login' });
      } else {
        return res.redirect('/login');
      }
    }

    if (user.isBlocked) {
      req.session.toastMessage = 'Your account is blocked.';
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ redirect: '/login' });
      } else {
        return res.redirect('/login');
      }
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = { checkSession };

