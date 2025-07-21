const bcrypt = require('bcrypt');
const adminModel = require('../../models/adminModel');


// to show login page

const loadLogin = async (req, res) => {
  res.render('admin/login')
};

// to verify login

const login = async (req, res) => {

  try {
    const { username, password } = req.body

    const admin = await adminModel.findOne({ username })
    if (!admin) {
      return res.render('admin/login', { message: 'invalid credintials' })
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.render('admin/login', { message: 'Invalid password' });
    }
    req.session.admin = true;
    res.redirect('/admin/dashboard');

  } catch (error) {
    res.send(error);
    console.error(error);

  }
};

// to logout from website

const logout = async (req, res) => {
  try {
    req.session.admin = false;
    res.redirect('/admin/login');
  } catch (error) {
    res.status(500).send('Internal server error');
  }
}


module.exports = {
  loadLogin,
  login,
  logout
}