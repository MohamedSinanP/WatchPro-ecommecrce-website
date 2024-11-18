function loadPage(pageNumber) {
  window.location.href = `/admin/categories?page=${pageNumber}`;
}
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');

menuToggle.addEventListener('click', () => {
sidebar.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', () => {
const categoryForm = document.getElementById('categoryForm');
const editCategoryForm = document.getElementById('editCategoryForm');
const categoryTableBody = document.getElementById('categoryTableBody');

// Add a new category
categoryForm.addEventListener('submit', async (e) => {
e.preventDefault();
const categoryName = document.getElementById('categoryName').value;
const genderType = document.getElementById('genderType').value;


console.log('Form Data:', { categoryName, genderType});

try {
  const response = await fetch('/admin/addCategory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: categoryName, genderType }),
  });

  console.log('Response status:', response.status);

  if (response.ok) {
    console.log('Response is OK');
    categoryForm.reset();
    console.log('Form reset and modal hiding');

    const addCategoryModalElement = document.getElementById('addCategoryModal');
    const addCategoryModal = bootstrap.Modal.getInstance(addCategoryModalElement);
    addCategoryModal.hide();
  } else {
    console.log('Response was not OK:', response.status);
    alert('Failed to add category');
  }
} catch (error) {
  console.error('Error adding category:', error);
  alert('An error occurred while adding the category.');
}
});

window.openEditModal = function(id, name, genderType, brand) {
        document.getElementById('editCategoryId').value = id;
        document.getElementById('editCategoryName').value = name;
       

        const editCategoryModalElement = document.getElementById('editCategoryModal');
        const editCategoryModal = new bootstrap.Modal(editCategoryModalElement);
        editCategoryModal.show();
    };
editCategoryForm.addEventListener('submit', async (e) => {
e.preventDefault();

const id = document.getElementById('editCategoryId').value;
const name = document.getElementById('editCategoryName').value;
const genderType = document.getElementById('editGenderType').value;


console.log('Submitting edited category:', { id, name, genderType });

try {
  const response = await fetch(`/admin/editCategory/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, genderType,  }),
  });

  console.log('Response status:', response.status);

  if (response.ok) {
    console.log('Category updated successfully');
    const editCategoryModalElement = document.getElementById('editCategoryModal');
    const editCategoryModal = bootstrap.Modal.getInstance(editCategoryModalElement);
    editCategoryModal.hide();
    location.reload(); 
  } else {
    console.log('Failed to update category:', response.status);
    alert('Failed to update category');
  }
} catch (error) {
  console.error('Error updating category:', error);
  alert('An error occurred while updating the category.');
}
});
});
async function toggleListing(categoryId, isCurrentlyListed) {
try {
const newStatus = isCurrentlyListed === 'true' ? false : true;
const response = await fetch('/admin/categoryListing', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    categoryId: categoryId,
    isListed: newStatus,
  }),
});

const data = await response.json();

if (data.success) {
  location.reload();
} else {
}
} catch (error) {
console.error('Error:', error);
}
}
