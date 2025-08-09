const userModel = require('../../models/userModel');

// to show users in website

const loadUsers = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const search = req.query.search || '';
    const limit = 6;
    const skip = (page - 1) * limit;

    // Build query for searching users
    const query = search
      ? {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    const totalUsers = await userModel.countDocuments(query);
    const users = await userModel.find(query).skip(skip).limit(limit);

    const totalPages = Math.ceil(totalUsers / limit);
    const currentPage = page;

    // Check if the request is AJAX
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.json({
        success: true,
        users,
        totalPages,
        currentPage,
        search,
      });
    } else {
      res.render('admin/users', { users, totalPages, currentPage, limit, search });
    }
  } catch (error) {
    console.error('Error loading users:', error);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.status(500).json({ success: false, message: 'Error loading users' });
    } else {
      res.status(500).send('An error occurred while loading users.');
    }
  }
};

// to bloack user 

const blockUser = async (req, res) => {

  const { userId, isBlocked } = req.body;
  try {
    const blockedUser = await userModel.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true }

    );
    if (blockedUser) {
      res.json({ success: true });
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'failed to bloack user' });
  }


}

module.exports = {
  loadUsers,
  blockUser
}
