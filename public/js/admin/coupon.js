function loadPage(pageNumber) {
  window.location.href = `/admin/coupons?page=${pageNumber}`;
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Toast notification utility function
function showToast(message, type = 'info', duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1060';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  toastElement.className = `toast align-items-center text-bg-${type} border-0`;
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', 'assertive');
  toastElement.setAttribute('aria-atomic', 'true');

  // Set icon based on type
  let icon = '';
  switch (type) {
    case 'success':
      icon = '<i class="fas fa-check-circle me-2"></i>';
      break;
    case 'danger':
    case 'error':
      icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
      break;
    case 'warning':
      icon = '<i class="fas fa-exclamation-circle me-2"></i>';
      break;
    case 'info':
      icon = '<i class="fas fa-info-circle me-2"></i>';
      break;
    default:
      icon = '<i class="fas fa-bell me-2"></i>';
  }

  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${icon}${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  // Add toast to container
  toastContainer.appendChild(toastElement);

  // Initialize Bootstrap toast
  const bsToast = new bootstrap.Toast(toastElement, {
    autohide: duration > 0,
    delay: duration
  });

  // Show toast
  bsToast.show();

  // Remove toast element after it's hidden
  toastElement.addEventListener('hidden.bs.toast', function () {
    toastElement.remove();
  });

  return bsToast;
}

// Utility function to display error messages
function showError(message, isEdit = false) {
  const alertClass = 'alert alert-danger mt-2';
  const alertId = isEdit ? 'edit-error-alert' : 'add-error-alert';
  const modalBody = isEdit ?
    document.querySelector('#editCouponModal .modal-body') :
    document.querySelector('#addCouponModal .modal-body');

  // Remove existing error alert
  const existingAlert = document.getElementById(alertId);
  if (existingAlert) {
    existingAlert.remove();
  }

  // Create new error alert
  const errorAlert = document.createElement('div');
  errorAlert.className = alertClass;
  errorAlert.id = alertId;
  errorAlert.innerHTML = `<strong>Error:</strong> ${message}`;

  modalBody.insertBefore(errorAlert, modalBody.firstChild);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (document.getElementById(alertId)) {
      document.getElementById(alertId).remove();
    }
  }, 5000);
}

// Utility function to remove error messages
function clearErrors(isEdit = false) {
  const alertId = isEdit ? 'edit-error-alert' : 'add-error-alert';
  const existingAlert = document.getElementById(alertId);
  if (existingAlert) {
    existingAlert.style.transition = 'opacity 0.3s';
    existingAlert.style.opacity = '0';
    setTimeout(() => {
      if (existingAlert.parentNode) {
        existingAlert.remove();
      }
    }, 300);
  }
}

// Validation functions
function validateCouponName(name) {
  if (!name || name.trim().length === 0) {
    return "Coupon name is required.";
  }
  if (name.trim().length < 3) {
    return "Coupon name must be at least 3 characters long.";
  }
  if (name.trim().length > 50) {
    return "Coupon name cannot exceed 50 characters.";
  }
  return null;
}

function validateCouponCode(code) {
  if (!code || code.trim().length === 0) {
    return "Coupon code is required.";
  }
  if (code.trim().length < 3) {
    return "Coupon code must be at least 3 characters long.";
  }
  if (code.trim().length > 20) {
    return "Coupon code cannot exceed 20 characters.";
  }
  // Check for valid characters (alphanumeric and some special characters)
  const codePattern = /^[A-Za-z0-9_-]+$/;
  if (!codePattern.test(code.trim())) {
    return "Coupon code can only contain letters, numbers, hyphens, and underscores.";
  }
  return null;
}

function validateDiscount(discountType, discount) {
  if (!discount || discount.trim().length === 0) {
    return "Discount value is required.";
  }

  const discountValue = parseFloat(discount);
  if (isNaN(discountValue) || discountValue <= 0) {
    return "Discount must be a positive number.";
  }

  if (discountType === "percentage") {
    if (discountValue > 100) {
      return "Percentage discount cannot exceed 100%.";
    }
    if (discountValue < 1) {
      return "Percentage discount must be at least 1%.";
    }
  } else if (discountType === "amount") {
    if (discountValue < 1) {
      return "Amount discount must be at least ₹1.";
    }
    if (discountValue > 10000) {
      return "Amount discount cannot exceed ₹10,000.";
    }
  }
  return null;
}

function validateMinPurchase(minPurchase) {
  if (!minPurchase || minPurchase.trim().length === 0) {
    return "Minimum purchase limit is required.";
  }

  const minValue = parseFloat(minPurchase);
  if (isNaN(minValue) || minValue <= 0) {
    return "Minimum purchase limit must be a positive number.";
  }
  if (minValue < 1) {
    return "Minimum purchase limit must be at least ₹1.";
  }
  if (minValue > 100000) {
    return "Minimum purchase limit cannot exceed ₹1,00,000.";
  }
  return null;
}

function validateMaxDiscount(maxDiscount, discountType, discount, minPurchase) {
  if (maxDiscount && maxDiscount.trim().length > 0) {
    const maxValue = parseFloat(maxDiscount);
    if (isNaN(maxValue) || maxValue <= 0) {
      return "Maximum discount must be a positive number.";
    }

    // For percentage discounts, validate max discount against calculated value
    if (discountType === "percentage" && minPurchase) {
      const minPurchaseValue = parseFloat(minPurchase);
      const discountValue = parseFloat(discount);
      if (!isNaN(minPurchaseValue) && !isNaN(discountValue)) {
        const calculatedMaxDiscount = (minPurchaseValue * discountValue) / 100;
        if (maxValue > calculatedMaxDiscount * 10) { // Allow some flexibility
          return "Maximum discount seems too high compared to minimum purchase and percentage.";
        }
      }
    }

    // For amount discounts, max discount should be reasonable
    if (discountType === "amount") {
      const discountValue = parseFloat(discount);
      if (!isNaN(discountValue) && maxValue < discountValue) {
        return "Maximum discount cannot be less than the discount amount.";
      }
    }
  }
  return null;
}

function validateExpirationDate(expirationDate) {
  if (!expirationDate || expirationDate.trim().length === 0) {
    return "Expiration date is required.";
  }

  const expDate = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  if (isNaN(expDate.getTime())) {
    return "Invalid expiration date format.";
  }

  if (expDate <= today) {
    return "Expiration date must be in the future.";
  }

  // Check if expiration date is not too far in the future (e.g., 5 years)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  if (expDate > maxDate) {
    return "Expiration date cannot be more than 5 years from now.";
  }

  return null;
}

function validateCouponData(formData, isEdit = false) {
  const errors = [];

  // Validate coupon name
  const nameError = validateCouponName(formData.name);
  if (nameError) errors.push(nameError);

  // Validate coupon code
  const codeError = validateCouponCode(formData.code);
  if (codeError) errors.push(codeError);

  // Validate discount
  const discountError = validateDiscount(formData.discountType, formData.discount);
  if (discountError) errors.push(discountError);

  // Validate minimum purchase
  const minPurchaseError = validateMinPurchase(formData.minPurchaseLimit);
  if (minPurchaseError) errors.push(minPurchaseError);

  // Validate maximum discount
  const maxDiscountError = validateMaxDiscount(
    formData.maxDiscount,
    formData.discountType,
    formData.discount,
    formData.minPurchaseLimit
  );
  if (maxDiscountError) errors.push(maxDiscountError);

  // Validate expiration date
  const expirationError = validateExpirationDate(formData.expireDate);
  if (expirationError) errors.push(expirationError);

  return errors;
}

function toggleDiscountFields() {
  const discountType = document.getElementById("discountType").value;
  const percentageField = document.getElementById("percentageDiscountField");
  const amountField = document.getElementById("amountDiscountField");

  if (discountType === "percentage") {
    percentageField.style.display = "block";
    amountField.style.display = "none";
    // Clear amount field when switching
    document.getElementById("discountAmount").value = "";
  } else {
    percentageField.style.display = "none";
    amountField.style.display = "block";
    // Clear percentage field when switching
    document.getElementById("discountPercentage").value = "";
  }
}

function toggleEditDiscountFields() {
  const discountType = document.getElementById("editDiscountType").value;
  const percentageField = document.getElementById("editPercentageDiscountField");
  const amountField = document.getElementById("editAmountDiscountField");

  if (discountType === "percentage") {
    percentageField.style.display = "block";
    amountField.style.display = "none";
    // Clear amount field when switching
    document.getElementById("editDiscountAmount").value = "";
  } else {
    percentageField.style.display = "none";
    amountField.style.display = "block";
    // Clear percentage field when switching
    document.getElementById("editDiscountPercentage").value = "";
  }
}

async function addCoupon() {
  clearErrors(false);

  const couponName = document.getElementById("couponName").value;
  const couponCode = document.getElementById("couponCode").value;
  const discountType = document.getElementById("discountType").value;
  const discountPercentage = document.getElementById("discountPercentage").value;
  const discountAmount = document.getElementById("discountAmount").value;
  const minPurchase = document.getElementById("minPurchase").value;
  const maxDiscount = document.getElementById("maxDiscount").value;
  const expirationDate = document.getElementById("expirationDate").value;
  const isActive = document.getElementById("isActive").value === "true";

  const discount = discountType === "percentage" ? discountPercentage : discountAmount;

  const formData = {
    name: couponName,
    code: couponCode,
    discountType: discountType,
    discount: discount,
    minPurchaseLimit: minPurchase,
    maxDiscount: maxDiscount,
    expireDate: expirationDate,
    isActive: isActive
  };

  // Validate form data
  const validationErrors = validateCouponData(formData, false);
  if (validationErrors.length > 0) {
    showError(validationErrors.join('<br>'), false);
    return;
  }

  // Disable submit button to prevent double submission
  const submitBtn = document.querySelector('#addCouponModal button[onclick="addCoupon()"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const response = await axios.post('/admin/addCoupon', formData);

    if (response.data.success) {
      showToast('Coupon added successfully!', 'success');
      // Close the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addCouponModal'));
      modal.hide();
      // Reload after a short delay to show the toast
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showError(response.data.message || 'Failed to add coupon', false);
    }
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'Error adding coupon';

    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    showError(errorMessage, false);
    showToast(errorMessage, 'danger');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function editCoupon(couponId) {
  clearErrors(true);

  try {
    // Fetch coupon data
    const response = await axios.get(`/admin/getCoupon/${couponId}`);
    const coupon = response.data.coupon;

    // Populate the edit modal fields
    document.getElementById("editCouponId").value = coupon._id;
    document.getElementById("editCouponName").value = coupon.name;
    document.getElementById("editCouponCode").value = coupon.code;
    document.getElementById("editDiscountType").value = coupon.discountType;
    document.getElementById("editMinPurchase").value = coupon.minPurchaseLimit;
    document.getElementById("editMaxDiscount").value = coupon.maxDiscount || '';
    document.getElementById("editIsActive").value = coupon.isActive.toString();

    // Set the expiration date (format to YYYY-MM-DD)
    const expireDate = new Date(coupon.expireDate);
    document.getElementById("editExpirationDate").value = expireDate.toISOString().split('T')[0];

    // Set discount fields based on discount type
    if (coupon.discountType === "percentage") {
      document.getElementById("editDiscountPercentage").value = coupon.discount;
      document.getElementById("editDiscountAmount").value = '';
    } else {
      document.getElementById("editDiscountAmount").value = coupon.discount;
      document.getElementById("editDiscountPercentage").value = '';
    }

    // Toggle discount fields
    toggleEditDiscountFields();

    // Show the modal
    const editModal = new bootstrap.Modal(document.getElementById('editCouponModal'));
    editModal.show();

  } catch (error) {
    console.error('Error fetching coupon:', error);
    showToast('Error loading coupon data', 'danger');
  }
}

async function updateCoupon() {
  clearErrors(true);

  const couponId = document.getElementById("editCouponId").value;
  const couponName = document.getElementById("editCouponName").value;
  const couponCode = document.getElementById("editCouponCode").value;
  const discountType = document.getElementById("editDiscountType").value;
  const discountPercentage = document.getElementById("editDiscountPercentage").value;
  const discountAmount = document.getElementById("editDiscountAmount").value;
  const minPurchase = document.getElementById("editMinPurchase").value;
  const maxDiscount = document.getElementById("editMaxDiscount").value;
  const expirationDate = document.getElementById("editExpirationDate").value;
  const isActive = document.getElementById("editIsActive").value === "true";

  const discount = discountType === "percentage" ? discountPercentage : discountAmount;

  const formData = {
    name: couponName,
    code: couponCode,
    discountType: discountType,
    discount: discount,
    minPurchaseLimit: minPurchase,
    maxDiscount: maxDiscount,
    expireDate: expirationDate,
    isActive: isActive
  };

  // Validate form data
  const validationErrors = validateCouponData(formData, true);
  if (validationErrors.length > 0) {
    showError(validationErrors.join('<br>'), true);
    return;
  }

  // Disable submit button to prevent double submission
  const submitBtn = document.querySelector('#editCouponModal button[onclick="updateCoupon()"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';

  try {
    const response = await axios.put(`/admin/updateCoupon/${couponId}`, formData);

    if (response.data.success) {
      showToast('Coupon updated successfully!', 'success');
      // Close the modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editCouponModal'));
      modal.hide();
      // Reload after a short delay to show the toast
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showError(response.data.message || 'Failed to update coupon', true);
    }
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'Error updating coupon';

    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    showError(errorMessage, true);
    showToast(errorMessage, 'danger');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Custom confirmation toast function
function showConfirmationToast(message, onConfirm, onCancel = null) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1060';
    document.body.appendChild(toastContainer);
  }

  const toastId = 'confirm-toast-' + Date.now();
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  toastElement.className = 'toast align-items-center text-bg-warning border-0';
  toastElement.setAttribute('role', 'alert');
  toastElement.setAttribute('aria-live', 'assertive');
  toastElement.setAttribute('aria-atomic', 'true');

  toastElement.innerHTML = `
    <div class="toast-body">
      <div class="d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div class="flex-grow-1">${message}</div>
      </div>
      <div class="mt-2 pt-2 border-top">
        <button type="button" class="btn btn-outline-light btn-sm me-2" id="${toastId}-confirm">
          <i class="fas fa-check me-1"></i>Yes, Delete
        </button>
        <button type="button" class="btn btn-outline-light btn-sm" id="${toastId}-cancel">
          <i class="fas fa-times me-1"></i>Cancel
        </button>
      </div>
    </div>
  `;

  toastContainer.appendChild(toastElement);

  // Initialize Bootstrap toast (don't auto-hide)
  const bsToast = new bootstrap.Toast(toastElement, {
    autohide: false
  });

  // Add event listeners for buttons
  document.getElementById(`${toastId}-confirm`).addEventListener('click', function () {
    bsToast.hide();
    if (onConfirm) onConfirm();
  });

  document.getElementById(`${toastId}-cancel`).addEventListener('click', function () {
    bsToast.hide();
    if (onCancel) onCancel();
  });

  // Remove toast element after it's hidden
  toastElement.addEventListener('hidden.bs.toast', function () {
    toastElement.remove();
  });

  bsToast.show();
}

async function deleteCoupon(couponId) {
  // Show confirmation toast instead of browser confirm
  showConfirmationToast(
    'Are you sure you want to delete this coupon? This action cannot be undone.',
    async function () {
      // User confirmed deletion
      try {
        const response = await axios.delete(`/admin/deleteCoupon/${couponId}`);
        if (response.data.success) {
          showToast('Coupon deleted successfully!', 'success');
          setTimeout(() => {
            location.reload();
          }, 1500);
        } else {
          showToast(response.data.message || "Can't delete coupon", 'danger');
        }
      } catch (error) {
        console.error('Error deleting coupon:', error);
        let errorMessage = 'Error deleting coupon';

        if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }

        showToast(errorMessage, 'danger');
      }
    },
    function () {
      // User cancelled deletion
      showToast('Deletion cancelled', 'info', 2000);
    }
  );
}

// Add real-time validation listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Add validation listeners for add coupon form
  const addForm = document.getElementById('addCouponForm');
  if (addForm) {
    // Clear errors when user starts typing
    addForm.addEventListener('input', function () {
      clearErrors(false);
    });
  }

  // Add validation listeners for edit coupon form
  const editForm = document.getElementById('editCouponForm');
  if (editForm) {
    // Clear errors when user starts typing
    editForm.addEventListener('input', function () {
      clearErrors(true);
    });
  }

  // Set minimum date for expiration date fields to today
  const today = new Date().toISOString().split('T')[0];
  const expirationDateField = document.getElementById('expirationDate');
  const editExpirationDateField = document.getElementById('editExpirationDate');

  if (expirationDateField) {
    expirationDateField.setAttribute('min', today);
  }
  if (editExpirationDateField) {
    editExpirationDateField.setAttribute('min', today);
  }
});