const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});


async function toggleListing(userId, isCurrentlyBlocked) {
try {
// Determine the new status to be updated (flip the current status)
const newStatus = isCurrentlyBlocked === 'true' ? false : true;

// Make a POST request using fetch with the updated status
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
  alert(`successfully!`);
  location.reload(); // Reload the page to reflect changes
} else {
  alert('Failed to update the category status. Please try again.');
}
} catch (error) {
console.error('Error:', error);
alert('An error occurred while updating the user status.');
}
}
