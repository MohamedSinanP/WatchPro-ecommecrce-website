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
        const data = await response.json();
        const category = data.category;

        // Add new row to table
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
    <td>#</td> 
    <td>${category.name}</td>
    <td>${category.genderType}</td>
    <td>
      <button class="btn btn-sm btn-primary"
        onclick="openEditModal('${category._id}', '${category.name}', '${category.genderType}')">Edit</button>
      <button class="btn btn-sm btn-success"
        onclick="toggleListing('${category._id}', 'false')">List</button>
    </td>
  `;

        categoryTableBody.appendChild(newRow);

        categoryForm.reset();
        const addCategoryModalElement = document.getElementById('addCategoryModal');
        const addCategoryModal = bootstrap.Modal.getInstance(addCategoryModalElement);
        addCategoryModal.hide();

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
        body: JSON.stringify({ name, genderType, }),
      });


      if (response.ok) {
        const updated = await response.json();

        // Find row by data-id
        const rowToUpdate = document.querySelector(`tr[data-id='${updated._id}']`);
        if (rowToUpdate) {
          rowToUpdate.children[1].textContent = updated.name;
          rowToUpdate.children[2].textContent = updated.genderType;

          // Update the edit button onclick handler with updated values
          rowToUpdate.querySelector('.btn-primary').setAttribute(
            'onclick',
            `openEditModal('${updated._id}', '${updated.name}', '${updated.genderType}')`
          );
        }

        // Close modal
        const editCategoryModalElement = document.getElementById('editCategoryModal');
        const editCategoryModal = bootstrap.Modal.getInstance(editCategoryModalElement);
        if (editCategoryModal) {
          editCategoryModal.hide();
        }

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
