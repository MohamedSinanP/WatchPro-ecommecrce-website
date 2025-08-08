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

    try {
      const response = await fetch('/admin/addCategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName, genderType }),
      });

      if (response.ok) {
        // Instead of updating DOM, redirect to categories page
        window.location.href = '/admin/categories';
      } else {
        alert('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('An error occurred while adding the category.');
    }
  });

  window.openEditModal = function (id, name, genderType, brand) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('editCategoryName').value = name;
    // Set the gender type dropdown value
    document.getElementById('editGenderType').value = genderType;

    const editCategoryModalElement = document.getElementById('editCategoryModal');
    const editCategoryModal = new bootstrap.Modal(editCategoryModalElement);
    editCategoryModal.show();
  };

  editCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryName').value;
    const genderType = document.getElementById('editGenderType').value;

    try {
      const response = await fetch(`/admin/editCategory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, genderType }),
      });

      if (response.ok) {
        // Redirect to categories page after successful edit
        window.location.href = '/admin/categories';
      } else {
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
      method: 'PATCH',
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
      alert('Failed to update category listing status');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while updating the category.');
  }
}