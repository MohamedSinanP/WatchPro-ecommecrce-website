document.addEventListener('DOMContentLoaded', function () {
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

    try {
      const response = await fetch('/defaultAddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set Content-Type header for JSON
        },
        body: JSON.stringify(formData), // Convert form data to JSON string
      });

      const data = await response.json();

      if (response.ok) {
        const newAddress = data.newAddress;

        const addressContainer = document.querySelector('.address-container .row');

        const newAddressCard = document.createElement('div');
        newAddressCard.classList.add('col-md-4');
        newAddressCard.innerHTML = `
          <div class="address-card p-3 mb-3 border rounded" data-address-id="${newAddress._id}">
            <p><strong>${newAddress.firstName} ${newAddress.lastName}</strong></p>
            <p>${newAddress.address}</p>
            <p>${newAddress.city}, ${newAddress.state} - ${newAddress.pincode}</p>
            <p>Phone: ${newAddress.phoneNumber}</p>
            <button class="btn btn-outline-primary btn-sm mt-2" onclick="selectAddress('${newAddress._id}')">Select this address</button>
          </div>
        `;
        addressContainer.appendChild(newAddressCard);

        // Reset the form
        document.getElementById('addAddressForm').reset();
        location.reload();
      } else {
        toastr.error(data.message || 'Error adding address. Please try again.', {
          duration: 2000,
          closeButton: true,
          gravity: "top",
          positionClass: "toast-right",
          backgroundColor: "red",
          stopOnFocus: true,
        });
      }
    } catch (error) {
      // Handle network or server errors
      toastr.error('Something went wrong. Please try again later.', {
        duration: 2000,
        closeButton: true,
        gravity: "top",
        positionClass: "toast-right",
        backgroundColor: "red",
        stopOnFocus: true,
      });
    }
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
    const totalElement = document.getElementById('total');
    const totalPrice = parseFloat(totalElement ? totalElement.querySelector('span').textContent : 0);
    const totalDiscount = parseFloat(document.getElementById('totalDiscount')?.innerText || 0);

    // Get couponId from the hidden element
    const couponId = document.getElementById('couponId')?.innerText?.trim() || null;

    if (!addressId) {
      alert("Please select an address.");
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (paymentMethod.value === "Razorpay") {
      try {
        const response = await axios.post('/createOrder', {
          totalPrice: totalPrice,
          addressId: addressId,
          paymentMethod: paymentMethod.value,
          totalDiscount: totalDiscount,
          couponId: couponId // Include couponId
        });

        if (response.data.success) {
          const { orderId, amount, currency, Id, order } = response.data;
          const orderid = Id;
          const options = {
            key: "rzp_test_X9NFs9mKeaCGys",
            amount: amount,
            currency: currency,
            name: "WatchPro",
            description: "Order Payment",
            order_id: orderId,
            handler: async function (response) {
              if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
                const orderId = response.razorpay_order_id;
                const result = await axios.post('/paymentSuccess', { orderid })
                if (result.data.success) {
                  window.location.href = result.data.redirectUrl;
                } else {
                  console.error("Payment success but server response indicates failure.");
                  alert("Payment verification failed on server. Please contact support.");
                }
              } else {
                console.error("Missing Razorpay response values.");
                alert("Payment verification failed. Please try again.");
              }
            },
            prefill: {
              name: "<%= user.fullName %>",
              email: "<%= user.email %>",
              contact: "9876543210"
            },
            theme: {
              color: "#3399cc"
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
            text: "Order creation failed. Please try again.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#FF0000",
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
      }
    } else if (paymentMethod.value === "COD") {
      try {
        const response = await axios.post('/placeOrder', {
          totalPrice: totalPrice,
          paymentMethod: "COD",
          addressId: addressId,
          totalDiscount: totalDiscount,
          couponId: couponId // Include couponId
        });

        if (response.data.success) {
          window.location.href = '/greetings';
        } else {
          const message = response.data.message;
          Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#FF0000",
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
        alert('An error occurred. Please try again.');
      }
    } else if (paymentMethod.value === "Wallet") {
      try {
        const response = await axios.post('/walletOrder', {
          totalPrice: totalPrice,
          paymentMethod: "Wallet",
          addressId: addressId,
          totalDiscount: totalDiscount,
          couponId: couponId // Include couponId
        });
        if (response.data.success) {
          window.location.href = '/greetings';
        } else {
          const message = response.data.message;
          Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#FF0000",
            stopOnFocus: true,
          }).showToast();
        }
      } catch (error) {
        alert('An error occurred. Please try again.');
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