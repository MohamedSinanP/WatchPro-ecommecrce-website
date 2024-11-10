// Toggle sidebar for mobile view
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

    // Hide the modal by finding the existing instance
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

// Handle the edit form submission (assuming a PUT request)
window.openEditModal = function(id, name, genderType, brand) {
        document.getElementById('editCategoryId').value = id;
        document.getElementById('editCategoryName').value = name;
       
       

        // Show the edit modal
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
    // Hide the modal and refresh the page or update the UI here
    const editCategoryModalElement = document.getElementById('editCategoryModal');
    const editCategoryModal = bootstrap.Modal.getInstance(editCategoryModalElement);
    editCategoryModal.hide();
    location.reload(); // Refresh the page or update the UI dynamically
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
// Determine the new status to be updated (flip the current status)
const newStatus = isCurrentlyListed === 'true' ? false : true;

// Make a POST request using fetch with the updated status
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

// Parse the JSON response
const data = await response.json();

// Handle the response based on success or failure
if (data.success) {
  alert(`Category ${newStatus ? 'listed' : 'unlisted'} successfully!`);
  location.reload(); // Reload the page to reflect changes
} else {
  alert('Failed to update the category status. Please try again.');
}
} catch (error) {
console.error('Error:', error);
alert('An error occurred while updating the category status.');
}
}
