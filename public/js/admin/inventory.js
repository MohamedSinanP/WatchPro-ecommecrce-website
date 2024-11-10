// Menu Toggle Logic
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Modal and Validation Logic
function openModal(price, stock, id) {
  // Set form values
  document.getElementById("productPrice").value = price;
  document.getElementById("productStock").value = stock;
  document.getElementById("productId").value = id; // Set product ID in hidden input

  // Display the modal
  document.getElementById("editModal").style.display = "block";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

function validatePrice() {
  const price = document.getElementById('productPrice').value;
  const priceError = document.getElementById('priceError');
  if (price <= 0) {
    priceError.style.display = 'block';
    return false;
  } else {
    priceError.style.display = 'none';
    return true;
  }
}

function validateStock() {
  const stock = document.getElementById('productStock').value;
  const stockError = document.getElementById('stockError');
  if (stock < 0) {
    stockError.style.display = 'block';
    return false;
  } else {
    stockError.style.display = 'none';
    return true;
  }
}

function saveChanges(event) {
  // Prevent the default form submission
  event.preventDefault();

  const productId = document.getElementById('productId').value;
  const price = document.getElementById('productPrice').value;
  const stock = document.getElementById('productStock').value;
  console.log(productId, price)

  // Validate input values
  if (validatePrice() && validateStock()) {
    // Create an object to hold the data
    const data = {
      productId,
      price,
      stock,
    };

    // Make the Axios POST request
    axios.post(`/admin/updateInventory/${productId}`, data)
      .then((response) => {
        console.log('Product updated successfully:', response.data); // Access the updated product data
        closeModal(); // Close the modal
        setTimeout(() => {
          window.location.reload(); // Refresh the page
        }, 300); // Adjust timing if necessary
      })
      .catch((error) => {
        console.error('There was an error updating the product:', error);
        alert('Oops! Something went wrong while saving. Please try again.');
      });
  } else {
    alert('Please fix the errors in the form before saving. Your products are counting on you!');
  }
}
