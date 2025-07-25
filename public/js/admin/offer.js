// Enhanced offer.js with comprehensive manual validation

function loadPage(pageNumber) {
  window.location.href = `/admin/offers?page=${pageNumber}`;
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Validation utility functions
function clearValidationErrors() {
  // Remove all existing error messages
  document.querySelectorAll('.validation-error').forEach(error => error.remove());

  // Remove error styling from form controls
  document.querySelectorAll('.form-control.is-invalid, .form-select.is-invalid').forEach(element => {
    element.classList.remove('is-invalid');
  });
}

function showValidationError(fieldId, message) {
  const field = document.getElementById(fieldId);

  // Add error styling
  field.classList.add('is-invalid');

  // Create and show error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'validation-error text-danger small mt-1';
  errorDiv.textContent = message;

  // Insert error message after the field
  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

function validateOfferForm() {
  clearValidationErrors();
  let isValid = true;

  // Validate offer title
  const title = document.getElementById('offerTitle').value.trim();
  if (!title) {
    showValidationError('offerTitle', 'Offer title is required');
    isValid = false;
  } else if (title.length < 3) {
    showValidationError('offerTitle', 'Offer title must be at least 3 characters long');
    isValid = false;
  } else if (title.length > 100) {
    showValidationError('offerTitle', 'Offer title cannot exceed 100 characters');
    isValid = false;
  }

  // Validate discount type and value
  const discountType = document.getElementById('discountType').value;
  let discountValue;

  if (discountType === 'percentage') {
    const percentageValue = document.getElementById('discountPercentage').value;
    if (!percentageValue) {
      showValidationError('discountPercentage', 'Discount percentage is required');
      isValid = false;
    } else {
      const percentage = parseFloat(percentageValue);
      if (isNaN(percentage) || percentage <= 0) {
        showValidationError('discountPercentage', 'Discount percentage must be a positive number');
        isValid = false;
      } else if (percentage > 100) {
        showValidationError('discountPercentage', 'Discount percentage cannot exceed 100%');
        isValid = false;
      }
      discountValue = percentage;
    }
  } else {
    const amountValue = document.getElementById('discountAmount').value;
    if (!amountValue) {
      showValidationError('discountAmount', 'Discount amount is required');
      isValid = false;
    } else {
      const amount = parseFloat(amountValue);
      if (isNaN(amount) || amount <= 0) {
        showValidationError('discountAmount', 'Discount amount must be a positive number');
        isValid = false;
      } else if (amount > 50000) {
        showValidationError('discountAmount', 'Discount amount cannot exceed ₹50,000');
        isValid = false;
      }
      discountValue = amount;
    }
  }

  // Validate expire date
  const expireDate = document.getElementById('expireDate').value;
  if (!expireDate) {
    showValidationError('expireDate', 'Expire date is required');
    isValid = false;
  } else {
    const selectedDate = new Date(expireDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    if (selectedDate < today) {
      showValidationError('expireDate', 'Expire date cannot be in the past');
      isValid = false;
    }

    // Check if date is too far in the future (e.g., more than 2 years)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    if (selectedDate > maxDate) {
      showValidationError('expireDate', 'Expire date cannot be more than 2 years from now');
      isValid = false;
    }
  }

  // Validate products or categories selection
  const applyTo = document.querySelector('input[name="applyTo"]:checked').value;

  if (applyTo === 'products') {
    const selectedProducts = Array.from(document.getElementById('offerProducts').selectedOptions);
    if (selectedProducts.length === 0) {
      showValidationError('offerProducts', 'Please select at least one product');
      isValid = false;
    } else if (selectedProducts.length > 50) {
      showValidationError('offerProducts', 'Cannot select more than 50 products');
      isValid = false;
    }
  } else {
    const selectedCategories = Array.from(document.getElementById('offerCategories').selectedOptions);
    if (selectedCategories.length === 0) {
      showValidationError('offerCategories', 'Please select at least one category');
      isValid = false;
    } else if (selectedCategories.length > 20) {
      showValidationError('offerCategories', 'Cannot select more than 20 categories');
      isValid = false;
    }
  }

  // Validate status
  const isActive = document.getElementById('isActive').value;
  if (isActive !== 'true' && isActive !== 'false') {
    showValidationError('isActive', 'Please select a valid status');
    isValid = false;
  }

  return isValid;
}

function openAddOfferModal() {
  // Reset form for add mode
  document.getElementById('addOfferForm').reset();
  document.getElementById('addOfferModalLabel').textContent = 'Add New Offer';
  document.getElementById('submitOfferButton').textContent = 'Save Offer';
  document.getElementById('addOfferForm').setAttribute('data-mode', 'add');

  // Clear any existing validation errors
  clearValidationErrors();

  // Reset field visibility
  toggleDiscountFields();
  toggleApplyFields();

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('expireDate').setAttribute('min', today);

  const addOfferModal = new bootstrap.Modal(document.getElementById('addOfferModal'));
  addOfferModal.show();
}

async function openEditOfferModal(offerId) {
  try {
    // Fetch offer details
    const response = await axios.get(`/admin/getOffer/${offerId}`);

    if (response.data.success) {
      const offer = response.data.offer;

      // Set modal title and button text
      document.getElementById('addOfferModalLabel').textContent = 'Edit Offer';
      document.getElementById('submitOfferButton').textContent = 'Update Offer';
      document.getElementById('addOfferForm').setAttribute('data-mode', 'edit');
      document.getElementById('addOfferForm').setAttribute('data-offer-id', offerId);

      // Clear any existing validation errors
      clearValidationErrors();

      // Populate form fields
      document.getElementById('offerTitle').value = offer.title;
      document.getElementById('discountType').value = offer.discountType;
      document.getElementById('expireDate').value = offer.expireDate.split('T')[0];
      document.getElementById('isActive').value = offer.isActive.toString();

      // Set minimum date to today for editing
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('expireDate').setAttribute('min', today);

      // Set discount value based on type
      if (offer.discountType === 'percentage') {
        document.getElementById('discountPercentage').value = offer.discountValue;
      } else {
        document.getElementById('discountAmount').value = offer.discountValue;
      }

      // Set apply to field and select appropriate items
      if (offer.products && offer.products.length > 0) {
        document.getElementById('applyToProducts').checked = true;
        const productSelect = document.getElementById('offerProducts');
        for (let option of productSelect.options) {
          option.selected = offer.products.some(p => p._id === option.value);
        }
      } else if (offer.categories && offer.categories.length > 0) {
        document.getElementById('applyToCategories').checked = true;
        const categorySelect = document.getElementById('offerCategories');
        for (let option of categorySelect.options) {
          option.selected = offer.categories.some(c => c._id === option.value);
        }
      } else {
        document.getElementById('applyToProducts').checked = true;
      }

      // Update field visibility
      toggleDiscountFields();
      toggleApplyFields();

      // Show modal
      const addOfferModal = new bootstrap.Modal(document.getElementById('addOfferModal'));
      addOfferModal.show();

    } else {
      Swal.fire('Error', 'Failed to fetch offer details', 'error');
    }
  } catch (error) {
    console.error('Error fetching offer:', error);
    Swal.fire('Error', 'Failed to fetch offer details', 'error');
  }
}

async function toggleOfferStatus(offerId, isCurrentlyActive) {
  try {
    const newStatus = isCurrentlyActive === 'true' ? false : true;

    const response = await axios.put('/admin/toggleOffer', {
      offerId: offerId,
      isActive: newStatus,
    });

    if (response.data.success) {
      location.reload();
    } else {
      Swal.fire('Error', 'Failed to toggle offer status', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'Failed to toggle offer status', 'error');
  }
}

function toggleDiscountFields() {
  const discountType = document.getElementById("discountType").value;
  const percentageField = document.getElementById("percentageDiscountField");
  const amountField = document.getElementById("amountDiscountField");

  if (discountType === "percentage") {
    percentageField.style.display = "block";
    amountField.style.display = "none";
    // Clear amount field when switching to percentage
    document.getElementById("discountAmount").value = "";
  } else {
    percentageField.style.display = "none";
    amountField.style.display = "block";
    // Clear percentage field when switching to amount
    document.getElementById("discountPercentage").value = "";
  }

  // Clear validation errors when toggling
  clearValidationErrors();
}

function toggleApplyFields() {
  const applyTo = document.querySelector('input[name="applyTo"]:checked').value;
  if (applyTo === 'products') {
    document.getElementById('productsField').style.display = 'block';
    document.getElementById('categoriesField').style.display = 'none';
    // Clear categories selection
    document.getElementById('offerCategories').selectedIndex = -1;
  } else {
    document.getElementById('productsField').style.display = 'none';
    document.getElementById('categoriesField').style.display = 'block';
    // Clear products selection
    document.getElementById('offerProducts').selectedIndex = -1;
  }

  // Clear validation errors when toggling
  clearValidationErrors();
}

// Real-time validation for specific fields
document.getElementById('offerTitle').addEventListener('input', function () {
  const title = this.value.trim();
  const existingError = this.parentNode.querySelector('.validation-error');

  if (existingError) {
    existingError.remove();
    this.classList.remove('is-invalid');
  }

  if (title && (title.length < 3 || title.length > 100)) {
    if (title.length < 3) {
      showValidationError('offerTitle', 'Title must be at least 3 characters long');
    } else {
      showValidationError('offerTitle', 'Title cannot exceed 100 characters');
    }
  }
});

document.getElementById('discountPercentage').addEventListener('input', function () {
  const value = parseFloat(this.value);
  const existingError = this.parentNode.querySelector('.validation-error');

  if (existingError) {
    existingError.remove();
    this.classList.remove('is-invalid');
  }

  if (this.value && (isNaN(value) || value <= 0 || value > 100)) {
    if (isNaN(value) || value <= 0) {
      showValidationError('discountPercentage', 'Must be a positive number');
    } else {
      showValidationError('discountPercentage', 'Cannot exceed 100%');
    }
  }
});

document.getElementById('discountAmount').addEventListener('input', function () {
  const value = parseFloat(this.value);
  const existingError = this.parentNode.querySelector('.validation-error');

  if (existingError) {
    existingError.remove();
    this.classList.remove('is-invalid');
  }

  if (this.value && (isNaN(value) || value <= 0 || value > 50000)) {
    if (isNaN(value) || value <= 0) {
      showValidationError('discountAmount', 'Must be a positive number');
    } else {
      showValidationError('discountAmount', 'Cannot exceed ₹50,000');
    }
  }
});

// Form submission with validation
document.getElementById('addOfferForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  // Validate form before submission
  if (!validateOfferForm()) {
    // Scroll to first error
    const firstError = document.querySelector('.form-control.is-invalid, .form-select.is-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
    return;
  }

  const form = event.target;
  const mode = form.getAttribute('data-mode');
  const offerId = form.getAttribute('data-offer-id');

  const submitButton = document.getElementById('submitOfferButton');
  const originalText = submitButton.textContent;

  // Disable submit button and show loading state
  submitButton.disabled = true;
  submitButton.textContent = mode === 'edit' ? 'Updating...' : 'Saving...';

  try {
    const applyTo = document.querySelector('input[name="applyTo"]:checked').value;

    let selectedProducts = [];
    let selectedCategories = [];

    if (applyTo === 'products') {
      selectedProducts = Array.from(document.getElementById('offerProducts').selectedOptions).map(option => option.value);
    } else if (applyTo === 'categories') {
      selectedCategories = Array.from(document.getElementById('offerCategories').selectedOptions).map(option => option.value);
    }

    const title = document.getElementById('offerTitle').value.trim();
    const discountType = document.getElementById('discountType').value;
    const discountPercentage = document.getElementById('discountPercentage').value;
    const discountAmount = document.getElementById('discountAmount').value;
    const discountValue = discountType === 'percentage' ? discountPercentage : discountAmount;
    const expireDate = document.getElementById('expireDate').value;
    const isActive = document.getElementById('isActive').value === 'true';

    const formData = {
      title,
      discountType,
      discountValue,
      products: selectedProducts,
      categories: selectedCategories,
      expireDate,
      isActive,
    };

    let response;

    if (mode === 'edit') {
      response = await axios.put(`/admin/updateOffer/${offerId}`, formData);
    } else {
      response = await axios.post('/admin/addOffer', formData);
    }

    if (response.data.success) {
      Swal.fire('Success', response.data.message, 'success').then(() => {
        location.reload();
      });
    } else {
      Swal.fire('Error', response.data.message, 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'An error occurred while processing the request';

    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }

    Swal.fire('Error', errorMessage, 'error');
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});

async function deleteOffer(offerId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      const response = await axios.delete(`/admin/deleteOffer/${offerId}`);
      if (response.data.success) {
        Swal.fire('Deleted!', 'Offer has been deleted.', 'success').then(() => {
          location.reload();
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Failed to delete offer', 'error');
    }
  }
}