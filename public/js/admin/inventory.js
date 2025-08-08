function loadPage(pageNumber) {
  window.location.href = `/admin/inventory?page=${pageNumber}`;
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

function showToast(message, type = 'success') {
  const toastEl = document.getElementById('appToast');
  const toastTitle = document.getElementById('toastTitle');
  const toastBody = document.getElementById('toastBody');

  // Set title and message
  toastTitle.textContent = type === 'success' ? 'Success' : 'Error';
  toastBody.textContent = message;

  // Apply appropriate class for styling
  toastEl.classList.remove('toast-success', 'toast-error');
  toastEl.classList.add(`toast-${type}`);

  // Initialize and show the toast
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 3000 // Hide after 3 seconds
  });
  toast.show();
}

function openModal(price, stock, id) {
  document.getElementById('productPrice').value = price;
  document.getElementById('productId').value = id;

  // Fetch product details including variants
  axios.get(`/admin/product/${id}`)
    .then((response) => {
      const product = response.data.product;
      const variants = product.variants || [];

      // Populate variant stock fields
      const variantContainer = document.getElementById('variantStocks');
      variantContainer.innerHTML = ''; // Clear previous content

      variants.forEach((variant, index) => {
        const variantDiv = document.createElement('div');
        variantDiv.innerHTML = `
          <label>Stock for Size ${variant.size}</label>
          <input type="number" name="variantStock${index}" data-variant-id="${variant._id}" value="${variant.stock}" oninput="validateVariantStock(this)" />
          <div class="error-message" id="variantStockError${index}">Please enter a valid stock number (0 or greater).</div>
        `;
        variantContainer.appendChild(variantDiv);
      });

      document.getElementById('editModal').style.display = 'block';
    })
    .catch((error) => {
      console.error('Error fetching product details:', error);
      showToast('Failed to load product variants.', 'error');
    });
}

function validateVariantStock(input) {
  const stock = input.value;
  const errorDiv = input.nextElementSibling;
  if (stock < 0) {
    errorDiv.style.display = 'block';
    return false;
  } else {
    errorDiv.style.display = 'none';
    return true;
  }
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

function saveChanges(event) {
  event.preventDefault();

  const productId = document.getElementById('productId').value;
  const price = document.getElementById('productPrice').value;
  const variantInputs = document.querySelectorAll('#variantStocks input[type="number"]');
  const variants = Array.from(variantInputs).map((input, index) => ({
    _id: input.dataset.variantId,
    size: input.previousElementSibling.textContent.replace('Stock for Size ', ''),
    stock: input.value
  }));

  // Validate all inputs
  let isValid = validatePrice();
  variantInputs.forEach((input) => {
    if (!validateVariantStock(input)) {
      isValid = false;
    }
  });

  if (isValid) {
    const data = {
      productId,
      price,
      variants
    };

    axios.post(`/admin/updateInventory/${productId}`, data)
      .then((response) => {
        closeModal();
        showToast('Product updated successfully!', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 300);
      })
      .catch((error) => {
        console.error('Error updating product:', error);
        showToast('Oops! Something went wrong while saving.', 'error');
      });
  } else {
    showToast('Please fix the errors in the form before saving.', 'error');
  }
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}