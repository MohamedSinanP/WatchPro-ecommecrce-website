document.addEventListener('DOMContentLoaded', function () {
  // Validation functions
  function validateField(fieldId, value, validationRules) {
    const field = document.getElementById(fieldId);
    const feedback = field.nextElementSibling;

    // Clear previous validation classes
    field.classList.remove('is-invalid', 'is-valid');

    for (let rule of validationRules) {
      if (!rule.test(value)) {
        field.classList.add('is-invalid');
        feedback.textContent = rule.message;
        return false;
      }
    }

    field.classList.add('is-valid');
    feedback.textContent = '';
    return true;
  }

  function validateForm(formData) {
    let isValid = true;

    // First Name validation
    const firstNameRules = [
      { test: (val) => val && val.length > 0, message: 'First Name is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'First Name should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'First Name should be at least 2 characters long.' }
    ];
    isValid = validateField('firstName', formData.firstName, firstNameRules) && isValid;

    // Last Name validation
    const lastNameRules = [
      { test: (val) => val && val.length > 0, message: 'Last Name is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'Last Name should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'Last Name should be at least 2 characters long.' }
    ];
    isValid = validateField('lastName', formData.lastName, lastNameRules) && isValid;

    // Address validation
    const addressRules = [
      { test: (val) => val && val.length > 0, message: 'Address is required.' },
      { test: (val) => val && val.length >= 10, message: 'Address should be at least 10 characters long.' },
      { test: (val) => val && val.length <= 200, message: 'Address should not exceed 200 characters.' }
    ];
    isValid = validateField('address', formData.address, addressRules) && isValid;

    // Phone Number validation
    const phoneRules = [
      { test: (val) => val && val.length > 0, message: 'Phone Number is required.' },
      { test: (val) => val && /^\d{10}$/.test(val), message: 'Phone Number should be exactly 10 digits.' }
    ];
    isValid = validateField('phoneNumber', formData.phoneNumber, phoneRules) && isValid;

    // City validation
    const cityRules = [
      { test: (val) => val && val.length > 0, message: 'City is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'City should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'City should be at least 2 characters long.' }
    ];
    isValid = validateField('city', formData.city, cityRules) && isValid;

    // State validation
    const stateRules = [
      { test: (val) => val && val.length > 0, message: 'State is required.' }
    ];
    isValid = validateField('state', formData.state, stateRules) && isValid;

    // Pincode validation
    const pincodeRules = [
      { test: (val) => val && val.length > 0, message: 'Pincode is required.' },
      { test: (val) => val && /^\d{6}$/.test(val), message: 'Pincode should be exactly 6 digits.' }
    ];
    isValid = validateField('pincode', formData.pincode, pincodeRules) && isValid;

    return isValid;
  }

  document.getElementById('addAddressForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission (no page reload)

    // Extract form data manually using DOM
    const formData = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      address: document.getElementById('address').value.trim(),
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value,
      pincode: document.getElementById('pincode').value.trim(),
    };

    // Validate form before submission
    if (!validateForm(formData)) {
      Toastify({
        text: "Please fix the errors in the form.",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF0000",
        stopOnFocus: true,
      }).showToast();
      return;
    }

    try {
      const response = await fetch('/defaultAddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set Content-Type header for JSON
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const newAddress = data.newAddress;

        // Fixed: Use the correct container selector that matches your HTML
        const addressContainer = document.querySelector('.addresses-grid');

        const newAddressCard = document.createElement('div');
        newAddressCard.classList.add('address-card');
        newAddressCard.setAttribute('data-address-id', newAddress._id);
        newAddressCard.innerHTML = `
          <div class="address-header">
            <div class="address-icon">
              <i class="fas fa-home"></i>
            </div>
            <div class="address-name">
              <strong>${newAddress.firstName} ${newAddress.lastName}</strong>
            </div>
          </div>
          <div class="address-details">
            <p class="address-text">
              <i class="fas fa-map-pin me-2 text-muted"></i>
              ${newAddress.address}
            </p>
            <p class="address-location">
              ${newAddress.city}, ${newAddress.state} - ${newAddress.pincode}
            </p>
            <p class="address-phone">
              <i class="fas fa-phone me-2 text-muted"></i>
              ${newAddress.phoneNumber}
            </p>
          </div>
          <button class="btn btn-select-address" onclick="selectAddress('${newAddress._id}')">
            <i class="fas fa-check me-2"></i>Select Address
          </button>
        `;
        addressContainer.appendChild(newAddressCard);

        // Reset the form
        document.getElementById('addAddressForm').reset();

        // Clear all validation classes after reset
        document.querySelectorAll('#addAddressForm .form-control, #addAddressForm .form-select').forEach(field => {
          field.classList.remove('is-invalid', 'is-valid');
        });

        // Show success message
        Toastify({
          text: "Address added successfully!",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "#28a745",
          stopOnFocus: true,
        }).showToast();

      } else {
        Toastify({
          text: data.message || 'Error adding address. Please try again.',
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "#FF0000",
          stopOnFocus: true,
        }).showToast();
      }
    } catch (error) {
      // Handle network or server errors
      Toastify({
        text: 'Something went wrong. Please try again later.',
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF0000",
        stopOnFocus: true,
      }).showToast();
    }
  });

  // Real-time validation on blur - Fixed to handle null/undefined values
  document.getElementById('firstName').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'First Name is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'First Name should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'First Name should be at least 2 characters long.' }
    ];
    validateField('firstName', value, rules);
  });

  document.getElementById('lastName').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'Last Name is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'Last Name should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'Last Name should be at least 2 characters long.' }
    ];
    validateField('lastName', value, rules);
  });

  document.getElementById('address').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'Address is required.' },
      { test: (val) => val && val.length >= 10, message: 'Address should be at least 10 characters long.' },
      { test: (val) => val && val.length <= 200, message: 'Address should not exceed 200 characters.' }
    ];
    validateField('address', value, rules);
  });

  document.getElementById('phoneNumber').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'Phone Number is required.' },
      { test: (val) => val && /^\d{10}$/.test(val), message: 'Phone Number should be exactly 10 digits.' }
    ];
    validateField('phoneNumber', value, rules);
  });

  document.getElementById('city').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'City is required.' },
      { test: (val) => val && /^[a-zA-Z\s]+$/.test(val), message: 'City should contain only letters.' },
      { test: (val) => val && val.length >= 2, message: 'City should be at least 2 characters long.' }
    ];
    validateField('city', value, rules);
  });

  document.getElementById('state').addEventListener('blur', function () {
    const value = this.value || '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'State is required.' }
    ];
    validateField('state', value, rules);
  });

  document.getElementById('pincode').addEventListener('blur', function () {
    const value = this.value ? this.value.trim() : '';
    const rules = [
      { test: (val) => val && val.length > 0, message: 'Pincode is required.' },
      { test: (val) => val && /^\d{6}$/.test(val), message: 'Pincode should be exactly 6 digits.' }
    ];
    validateField('pincode', value, rules);
  });

  // Clear validation on focus
  document.querySelectorAll('#addAddressForm input, #addAddressForm textarea, #addAddressForm select').forEach(field => {
    field.addEventListener('focus', function () {
      this.classList.remove('is-invalid', 'is-valid');
      // Also clear the feedback message
      const feedback = this.nextElementSibling;
      if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = '';
      }
    });
  });

  function selectAddress(addressId) {
    document.querySelectorAll('.address-card').forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-address-id="${addressId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    axios.post(`/defaultAddress/${addressId}`)
      .then(response => {
        if (!response.data.success) {
          alert('Error setting default address.');
        }
      })
      .catch(error => console.error('Error:', error));
  }

  // Make selectAddress function global so it can be called from HTML onclick
  window.selectAddress = selectAddress;

  document.querySelectorAll('.address-card').forEach(card => {
    card.addEventListener('click', function () {
      const addressId = this.dataset.addressId;
      selectAddress(addressId);
    });
  });

  async function handlePayment() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    const addressId = document.querySelector('.address-card.selected')?.dataset.addressId;
    const totalElement = document.getElementById('total').textContent;
    const totalPrice = parseFloat(totalElement.replace(/[^0-9.]/g, ""));
    const totalDiscount = parseFloat(document.getElementById('totalDiscount')?.textContent) || 0;
    const urlParams = new URLSearchParams(window.location.search);
    const couponId = urlParams.get('couponId') || null;
    const couponDiscount = urlParams.get('couponDiscount') || null;;
    const couponCode = document.getElementById('couponCode')?.value || null;


    if (!addressId) {
      Toastify({
        text: "Please select an address.",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF0000",
        stopOnFocus: true,
      }).showToast();
      return;
    }

    if (!paymentMethod) {
      Toastify({
        text: "Please select a payment method.",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF0000",
        stopOnFocus: true,
      }).showToast();
      return;
    }

    if (paymentMethod.value === "Razorpay") {
      try {
        const response = await axios.post('/createOrder', {
          totalPrice,
          addressId,
          paymentMethod: paymentMethod.value,
          totalDiscount,
          couponId,
          couponCode,
          couponDiscount
        });

        if (response.data.success) {
          const { orderId, amount, currency, Id, order } = response.data;
          const orderid = Id;
          const options = {
            key: "rzp_test_X9NFs9mKeaCGys",
            amount,
            currency,
            name: "WatchPro",
            description: "Order Payment",
            order_id: orderId,
            handler: async function (response) {
              if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
                const orderId = response.razorpay_order_id;
                const result = await axios.post('/paymentSuccess', { orderid });
                if (result.data.success) {
                  window.location.href = result.data.redirectUrl;
                } else {
                  Toastify({
                    text: "Payment verification failed on server. Please contact support.",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#FF0000",
                    stopOnFocus: true,
                  }).showToast();
                }
              } else {
                Toastify({
                  text: "Payment verification failed. Please try again.",
                  duration: 3000,
                  close: true,
                  gravity: "top",
                  position: "right",
                  backgroundColor: "#FF0000",
                  stopOnFocus: true,
                }).showToast();
              }
            },
            prefill: {
              name: "<%= user.fullName %>",
              email: "<%= user.email %>",
              contact: "9876543210",
            },
            theme: {
              color: "#3399cc",
            },
          };

          const rzp = new Razorpay(options);
          rzp.on('payment.failed', function (response) {
            const retryUrl = `/retryPaymentPage/${orderid}`;
            window.location.href = retryUrl;
          });
          rzp.open();
        } else {
          Toastify({
            text: response.data.message || "Order creation failed. Please try again.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#FF0000",
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
        console.error('Error creating order:', error.response?.data, error.response?.status);
        Toastify({
          text: error.response?.data?.message || "Failed to create order. Please try again.",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "#FF0000",
          stopOnFocus: true,
        }).showToast();
      }
    } else if (paymentMethod.value === "COD" || paymentMethod.value === "Wallet") {
      try {
        const endpoint = paymentMethod.value === "COD" ? '/placeOrder' : '/walletOrder';
        const response = await axios.post(endpoint, {
          totalPrice,
          paymentMethod: paymentMethod.value,
          addressId,
          totalDiscount,
          couponId,
          couponCode,
          couponDiscount
        });

        if (response.data.success) {
          window.location.href = '/greetings';
        } else {
          Toastify({
            text: response.data.message || "Order placement failed. Please try again.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#FF0000",
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
        console.error(`Error processing ${paymentMethod.value} order:`, error.response?.data, error.response?.status);
        Toastify({
          text: error.response?.data?.message || "An error occurred. Please try again.",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "#FF0000",
          stopOnFocus: true,
        }).showToast();
      }
    }
  }

  async function returnProduct(orderId) {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'Do you really want to return this product?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, return it!',
        cancelButtonText: 'No, keep it',
      });
      if (result.isConfirmed) {
        const response = await axios.post(`/returnOrder/${orderId}`);
        if (response.data.success) {
          location.reload();
        }
      }
    } catch (error) {
      console.error('Error cancelling product:', error);
    }
  }

  // Make returnProduct function global
  window.returnProduct = returnProduct;

  document.querySelector('.pay-now').addEventListener('click', handlePayment);
});