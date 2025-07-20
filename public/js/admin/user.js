// Debounce function to limit how often a function is called
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Show/hide loading indicator
function toggleLoading(show) {
  document.getElementById('loading').classList.toggle('d-none', !show);
}

// Update the table and pagination dynamically
function updateTableAndPagination(data) {
  const { users, totalPages, currentPage, search } = data;
  const tableBody = document.getElementById('userTableBody');
  const paginationControls = document.getElementById('paginationControls');

  // Update table body
  tableBody.innerHTML = users.length
    ? users
      .map(
        (user, index) => `
            <tr data-user-id="${user._id}">
              <td>${index + 1}</td>
              <td>${user._id}</td>
              <td>${user.fullName}</td>
              <td>${user.email}</td>
              <td>
                <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                  ${user.isBlocked ? 'Inactive' : 'active'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm ${user.isBlocked ? 'btn-danger' : 'btn-success'}"
                  onclick="toggleListing('${user._id}', '${user.isBlocked}')">
                  ${user.isBlocked ? 'Unblock' : 'Block'}
                </button>
              </td>
            </tr>
          `
      )
      .join('')
    : '<tr><td colspan="6" class="text-center">No users found.</td></tr>';

  // Update pagination controls
  paginationControls.innerHTML = totalPages > 1
    ? `
        ${currentPage > 1 ? `<button onclick="loadPage(${currentPage - 1}, '${search}')" class="btn btn-primary mx-1 my-1">«</button>` : ''}
        ${Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(
        (i) => `
              <button onclick="loadPage(${i}, '${search}')" class="btn ${i === currentPage ? 'btn-secondary' : 'btn-light'} mx-1">
                ${i}
              </button>
            `
      )
      .join('')}
        ${currentPage < totalPages ? `<button onclick="loadPage(${currentPage + 1}, '${search}')" class="btn btn-primary mx-1 my-1">»</button>` : ''}
      `
    : '';
}

// Load a specific page with optional search query
async function loadPage(pageNumber, search = '') {
  try {
    toggleLoading(true);
    const response = await axios.get(`/admin/users?page=${pageNumber}&search=${encodeURIComponent(search)}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (response.data.success) {
      updateTableAndPagination(response.data);
    } else {
      alert('Failed to load users: ' + (response.data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error loading page:', error);
    alert('An error occurred while loading users.');
  } finally {
    toggleLoading(false);
  }
}

// Toggle sidebar
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Handle search form submission
document.getElementById('searchForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const searchButton = event.target.querySelector('.btn-primary');
  searchButton.classList.add('loading');
  searchButton.disabled = true;
  const searchInput = document.getElementById('searchInput').value.trim();
  loadPage(1, searchInput).finally(() => {
    searchButton.classList.remove('loading');
    searchButton.disabled = false;
  });
});

// Handle real-time search
document.getElementById('searchInput')?.addEventListener('input', debounce((event) => {
  const searchInput = event.target.value.trim();
  const clearButton = document.querySelector('.btn-clear-search');
  clearButton.classList.toggle('d-none', !searchInput);
  loadPage(1, searchInput);
}, 500));

// Handle reset button
function resetSearch() {
  document.getElementById('searchInput').value = '';
  const clearButton = document.querySelector('.btn-clear-search');
  clearButton.classList.add('d-none');
  loadPage(1);
}

// Toggle user block/unblock status
async function toggleListing(userId, isCurrentlyBlocked) {
  const isBlocked = isCurrentlyBlocked === 'true';
  const action = isBlocked ? 'Unblock' : 'Block';

  const result = await Swal.fire({
    title: `${action} User`,
    text: `Are you sure you want to ${action.toLowerCase()} this user?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: isBlocked ? '#28a745' : '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Yes, ${action.toLowerCase()} user`,
  });

  if (!result.isConfirmed) return;

  try {
    toggleLoading(true);
    const newStatus = !isBlocked;

    const response = await fetch('/admin/blockUser', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        isBlocked: newStatus,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Update the UI dynamically
      const row = document.querySelector(`tr[data-user-id="${userId}"]`);
      if (row) {
        const statusCell = row.cells[4];
        const buttonCell = row.cells[5];
        statusCell.innerHTML = `
          <span class="badge ${newStatus ? 'bg-danger' : 'bg-success'}">
            ${newStatus ? 'Inactive' : 'active'}
          </span>
        `;
        buttonCell.innerHTML = `
          <button class="btn btn-sm ${newStatus ? 'btn-danger' : 'btn-success'}"
            onclick="toggleListing('${userId}', '${newStatus}')">
            ${newStatus ? 'Unblock' : 'Block'}
          </button>
        `;
      }

    } else {
      Swal.fire('Error', data.message || 'Failed to update user status.', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'An error occurred while updating the user status.', 'error');
  } finally {
    toggleLoading(false);
  }
}
