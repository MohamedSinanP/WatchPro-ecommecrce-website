
const walletModel = require('../../models/walletModel');

// to show wallet page for the user

const loadWalletPage = async (req, res) => {
  const userId = req.session.user;
  try {
    const wallet = await walletModel.findOne({ userId: userId });
    res.render('user/wallet', { wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }

}

module.exports = {
  loadWalletPage
}
