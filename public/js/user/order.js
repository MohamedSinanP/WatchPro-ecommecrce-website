function loadPage(pageNumber) {
  window.location.href = `/user/orders?page=${pageNumber}`;
}

async function cancelOrderProduct(orderId, productId, total) {
  console.log(orderId + '   ' + productId);

  try {
    const response = await axios.delete(`/user/deleteOrderItem/${orderId}`, {
      data: { productId, total }
    });
    if (response.data.success) {
      location.reload()
    }
  } catch (error) {
    console.error('Error cancelling product:', error);
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

async function retryPayment(orderId, razorpayId) {

  try {
    const response = await axios.post('/user/retryPayment', {
      orderId,
      razorpayId
    })

    if (response.data.success) {
      const { orderId, amount, currency, name, email, phoneNumber, order } = response.data;
      const orderid = order._id;


      console.log('hhhhhhh');

      const options = {
        key: "rzp_test_X9NFs9mKeaCGys",
        amount: amount,
        currency: currency,
        name: "WatchPro",
        description: "Order Payment",
        order_id: orderId,
        handler: async function (response) {
          if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
            console.log('hhhhhhhh');

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
          name: name || '',
          email: email || '',
          contact: phoneNumber || ''
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
    console.log(error);

  }
}


async function downloadInvoice(orderId) {
  try {
    // Make a GET request and specify the response type as 'blob' for binary data
    const response = await axios.get(`/user/invoice/${orderId}`, { responseType: 'blob' });

    // Check if the response was successful
    if (response.status === 200) {

      const blob = new Blob([response.data], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${orderId}.pdf`;

      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      console.log('Invoice downloaded successfully');
    }
  } catch (error) {
    console.error('Error downloading invoice:', error);
  }
}

// order details modal 

function showProductDetails(button) {
  const orderJson = button.getAttribute('data-order');
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = '';
  const order = JSON.parse(orderJson);

  order.products.forEach(product => {
    modalContent.innerHTML += `
<div class="product-detail d-flex align-items-start">
  <img src="${product.productId.images[2]}" alt="Product Image" class="img-fluid mr-3" style="width: 150px; height: auto; border-radius: 8px;">
  <div>
      <h6>Product Name: ${product.productId.name}</h6>
      <p><strong>Price:</strong> $${product.productId.price}</p>
      <p><strong>Quantity:</strong> ${product.quantity}</p>
      <p><strong>Description:</strong> ${product.productId.description || 'No description available.'}</p>
  </div>
</div>
<hr>
`;
  });
}

