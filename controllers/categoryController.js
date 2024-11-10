const categoryModel = require('../models/categoryModel');


const loadCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find({});
    res.render('admin/categories', { categories })
  } catch (error) {
    res.send(error);
  }
}

const addCategory = async (req, res) => {
  try {
    const { name, genderType } = req.body;
    const newCategory = new categoryModel({
      name,
      genderType,
    });
    await newCategory.save();
    res.status(201).json({ message: 'Category added successfully' }); // Respond with a success message
    console.log('added successfully');

  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' }); // Respond with an error message
  }


};

const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, genderType } = req.body;

    const updateCategory = await categoryModel.findOneAndUpdate(
      { _id: id },
      { name, genderType },
      { new: true }
    );

    if (updateCategory) {
      res.status(200).json(updateCategory);
    } else {
      res.status(404).json({ message: 'Category not found' })
    }


  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }



}

const isListedCategory = async (req, res) => {
  try {
    const { categoryId, isListed } = req.body;
    const updatedCategory = await categoryModel.findByIdAndUpdate(
      categoryId,
      { isListed },
      { new: true }
    );

    if (updatedCategory) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  loadCategories,
  addCategory,
  editCategory,
  isListedCategory
}