function loadPage(pageNumber) {
  window.location.href = `/admin/users?page=${pageNumber}`;
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});


async function toggleListing(userId, isCurrentlyBlocked) {
try {
const newStatus = isCurrentlyBlocked === 'true' ? false : true;

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
  location.reload();
} else {
  alert('Failed to update the category status. Please try again.');
}
} catch (error) {
console.error('Error:', error);
alert('An error occurred while updating the user status.');
}
}
