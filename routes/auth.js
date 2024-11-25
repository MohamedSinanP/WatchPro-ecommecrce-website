const express = require('express');
const passport = require('passport');
const router = express.Router();


router.get('/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/google/callback',passport.authenticate('google',{failureRedirect:'/user/signup'}),(req,res) => {
  req.session.isAuthenticated = true;
  req.session.user = req.user._id;
  res.redirect('/home');
});


module.exports = router;