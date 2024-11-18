document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('addAddressForm').addEventListener('submit', function (event) {
    event.preventDefault();
  
    const fields = ['firstName', 'lastName', 'address', 'phoneNumber', 'city', 'state', 'pincode'];

    fields.forEach(field => {
      document.getElementById(field).classList.remove('is-invalid', 'is-valid');
    });
  
    let isValid = true;

    const firstName = document.getElementById('firstName');
    if (firstName.value.trim() === '') {
      firstName.classList.add('is-invalid');
      isValid = false;
    } else {
      firstName.classList.add('is-valid');
    }

    const lastName = document.getElementById('lastName');
    if (lastName.value.trim() === '') {
      lastName.classList.add('is-invalid');
      isValid = false;
    } else {
      lastName.classList.add('is-valid');
    }
  
    const address = document.getElementById('address');
    if (address.value.trim() === '') {
      address.classList.add('is-invalid');
      isValid = false;
    } else {
      address.classList.add('is-valid');
    }

    const phoneNumber = document.getElementById('phoneNumber');
    if (phoneNumber.value.trim() === '') {
      phoneNumber.classList.add('is-invalid');
      isValid = false;
    } else {
      phoneNumber.classList.add('is-valid');
    }
 
    const city = document.getElementById('city');
    if (city.value.trim() === '') {
      city.classList.add('is-invalid');
      isValid = false;
    } else {
      city.classList.add('is-valid');
    }

    const state = document.getElementById('state');
    if (state.value === '') {
      state.classList.add('is-invalid');
      isValid = false;
    } else {
      state.classList.add('is-valid');
    }

    const pincode = document.getElementById('pincode');
    if (pincode.value === '' || Number(pincode.value) <= 0) {
      pincode.classList.add('is-invalid');
      isValid = false;
    } else {
      pincode.classList.add('is-valid');
    }

    if (isValid) {
      this.submit();
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

    axios.post(`/user/defaultAddress/${addressId}`)
      .then(response => {
        if (!response.data.success) {
          alert('Error setting default address.');
        }
      })
      .catch(error => console.error('Error:', error));
  }

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
          const { orderId, amount, currency, Id } = response.data;
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
                const result = await axios.post('/user/paymentSuccess', { orderid })
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
    } else if (paymentMethod.value === "Wallet") {
      try {
        const response = await axios.post('/user/walletOrder', {
          totalPrice: totalPrice,
          paymentMethod: "Wallet",
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
        const response = await axios.post(`/user/returnOrder/${orderId}`);
        if (response.data.success) {
          location.reload();
        }
      }
    } catch (error) {
      console.error('Error cancelling product:', error);
    }
  };
  document.querySelector('.pay-now').addEventListener('click', handlePayment);

  // const Form = document.getElementById("addAddressForm");
  // form.addEventListener("submit", async (event) => {
  //   event.preventDefault(); 

  //   const formData = new FormData(Form);
  //   const data = Object.fromEntries(formData.entries());

  //   try {
  //     const response = await axios.post("/user/defaultAddress", data);

  //     if (response.status === 200) {
  //       Toastify({
  //         text: "Address added successfully!",
  //         duration: 3000,
  //         gravity: "top",
  //         position: "right",
  //         style: {
  //           background: "green",
  //         },
  //       }).showToast();
  //       location.reload();
  //     } else {
  //       throw new Error("Failed to add address.");
  //     }
  //   } catch (error) {
  //     console.error(error);

  //     Toastify({
  //       text: "Error adding address. Please try again.",
  //       duration: 3000,
  //       gravity: "top",
  //       position: "right",
  //       style: {
  //         background: "red",
  //       },
  //     }).showToast();
  //   }
  // });
});

