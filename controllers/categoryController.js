const categoryModel = require('../models/categoryModel');

// to show the categories page in admin side 

const loadCategories = async (req, res) => {
  try {
    const page = Number.isNaN(parseInt(req.query.page)) ? 1 : parseInt(req.query.page);
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalCategories = await categoryModel.countDocuments();
    const categories = await categoryModel.find({});

    const totalPages = Math.ceil(totalCategories / limit);
    currentPage = page;
    res.render('admin/categories', { categories ,currentPage,totalPages,limit})
  } catch (error) {
    res.send(error);
  }
}

// to add category to the category collection

const addCategory = async (req, res) => {
  try {
    const { name, genderType } = req.body;
    const newCategory = new categoryModel({
      name,
      genderType,
    });
    await newCategory.save();
    res.status(201).json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' }); 
  }


};

// to edit the existing category 

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

// to change the staus of category (listed/unlisted)

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