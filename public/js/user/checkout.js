document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('addAddressForm');

  // Validate fields function
  const validateField = (input) => {
    if (input.value.trim() === "") {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    } else {
      input.classList.add('is-valid');
      input.classList.remove('is-invalid');
    }
  };

  // Form submit event
  form.addEventListener('submit', (e) => {
    let isFormValid = true;

    form.querySelectorAll('.form-control').forEach(input => {
      validateField(input);
      if (input.classList.contains('is-invalid')) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      e.preventDefault();
    }
  });

  // Address selection functionality
  function selectAddress(addressId) {
    document.querySelectorAll('.address-card').forEach(card => {
      card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`[data-address-id="${addressId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

    // Send POST request to set the default address
    axios.post(`/user/defaultAddress/${addressId}`)
      .then(response => {
        if (!response.data.success) {
          alert('Error setting default address.');
        }
      })
      .catch(error => console.error('Error:', error));
  }

  // Address card click event listener
  document.querySelectorAll('.address-card').forEach(card => {
    card.addEventListener('click', function () {
      const addressId = this.dataset.addressId;
      selectAddress(addressId);
    });
  });

  // Payment handling function
  async function handlePayment() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    const addressId = document.querySelector('.address-card.selected')?.dataset.addressId;
    const totalElement = document.getElementById('total');
    const totalPrice = parseFloat(totalElement ? totalElement.querySelector('span').textContent : 0);
    const totalDiscount = parseFloat(document.getElementById('totalDiscount')?.innerText || 0);

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
        const response = await axios.post('/user/createOrder', {
          totalPrice: totalPrice,
          addressId: addressId,
          paymentMethod: paymentMethod.value,
          totalDiscount: totalDiscount
        });

        if (response.data.success) {
          const { orderId, amount, currency } = response.data;

          const options = {
            key: "rzp_test_X9NFs9mKeaCGys",
            amount: amount,
            currency: currency,
            name: "WatchPro",
            description: "Order Payment",
            order_id: orderId,
            handler:  async function (response) {
              if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
                const orderId = response.razorpay_order_id;
                const result = await axios.post('/user/paymentSuccess', { orderId })
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
            console.log("Payment failed:", response.error);
            window.location.href = '/user/orders';  
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
        console.log('Error creating Razorpay order:', error);
      }
    } else if (paymentMethod.value === "COD") {
      try {
        const response = await axios.post('/user/placeOrder', {
          totalPrice: totalPrice,
          paymentMethod: "COD",
          addressId: addressId,
          totalDiscount: totalDiscount
        });

        if (response.data.success) {
          window.location.href = '/user/greetings';
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
        console.log('Error creating COD order:', error);
        alert('An error occurred. Please try again.');
      }
    }else if(paymentMethod.value === "Wallet"){
      try {
        const response = await axios.post('/user/walletOrder',{
          totalPrice: totalPrice,
          paymentMethod: "Wallet",
          addressId: addressId,
          totalDiscount: totalDiscount
        });
        if (response.data.success) {
          console.log('hhhhhhhhh');
          
          window.location.href = '/user/greetings';
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
        
      }
    }
  }

  document.querySelector('.pay-now').addEventListener('click', handlePayment);
});

