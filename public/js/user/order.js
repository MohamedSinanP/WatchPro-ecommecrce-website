function loadPage(pageNumber) {
  window.location.href = `/orders?page=${pageNumber}`;
}

async function cancelOrderProduct(orderId, total) {

  try {
    const response = await axios.delete(`/deleteOrderItem/${orderId}`, {
      data: { total }
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
      const response = await axios.post(`/returnOrder/${orderId}`);
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
    const response = await axios.post('/retryPayment', {
      orderId,
      razorpayId
    })

    if (response.data.success) {
      const { orderId, amount, currency, name, email, phoneNumber, order } = response.data;
      const orderid = order._id;

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
}

async function downloadInvoice(orderId) {
  try {
    const response = await axios.get(`/invoice/${orderId}`, { responseType: 'blob' });
    if (response.status === 200) {
      const blob = new Blob([response.data], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    }
  } catch (error) {
    console.error('Error downloading invoice:', error);
  }
}

// Enhanced order details modal function
function showProductDetails(button) {
  const orderData = JSON.parse(button.getAttribute('data-order'));

  // Populate Order Summary
  document.getElementById('modal-order-id').textContent = orderData._id;
  document.getElementById('modal-order-date').textContent = new Date(orderData.createdAt).toLocaleDateString('en-IN');

  // Set status badge with appropriate color
  const statusElement = document.getElementById('modal-order-status');
  statusElement.textContent = orderData.status;
  statusElement.className = 'badge ' + getStatusBadgeClass(orderData.status);

  document.getElementById('modal-order-total').textContent = orderData.total;
  document.getElementById('modal-order-discount').textContent = orderData.totalDiscount || '0';
  document.getElementById('modal-payment-method').textContent = orderData.paymentMethod;

  // Set payment status badge with appropriate color
  const paymentStatusElement = document.getElementById('modal-payment-status');
  paymentStatusElement.textContent = orderData.paymentStatus;
  paymentStatusElement.className = 'badge ' + getPaymentStatusBadgeClass(orderData.paymentStatus);

  // Show/hide delivery date if available
  if (orderData.deliveryDate) {
    document.getElementById('modal-delivery-date').textContent = new Date(orderData.deliveryDate).toLocaleDateString('en-IN');
    document.getElementById('modal-delivery-date-row').style.display = 'block';
  } else {
    document.getElementById('modal-delivery-date-row').style.display = 'none';
  }

  // Show/hide Razorpay ID if available
  if (orderData.razorpayId) {
    document.getElementById('modal-razorpay-id').textContent = orderData.razorpayId;
    document.getElementById('modal-razorpay-id-row').style.display = 'block';
  } else {
    document.getElementById('modal-razorpay-id-row').style.display = 'none';
  }

  // Populate Delivery Address
  document.getElementById('modal-address-name').textContent = `${orderData.address.firstName} ${orderData.address.lastName}`;
  document.getElementById('modal-address-phone').textContent = orderData.address.phoneNumber;
  document.getElementById('modal-address-full').textContent = orderData.address.address;
  document.getElementById('modal-address-city').textContent = orderData.address.city;
  document.getElementById('modal-address-state').textContent = orderData.address.state;
  document.getElementById('modal-address-pincode').textContent = orderData.address.pincode;

  // Populate Products List
  const productsContainer = document.getElementById('modal-products-list');
  productsContainer.innerHTML = '';

  orderData.products.forEach((product, index) => {
    const productDiv = document.createElement('div');
    productDiv.className = 'row border-bottom pb-3 mb-3';

    // Use fallback images if the primary image is not available
    const productImage = product.productId.images && product.productId.images.length > 0
      ? (product.productId.images[0] || product.productId.images[2] || product.productId.images[1])
      : '/default-image.jpg';

    productDiv.innerHTML = `
            <div class="col-md-3">
                <img src="${productImage}" 
                     alt="Product Image" class="img-fluid rounded" style="max-height: 100px; object-fit: cover;">
            </div>
            <div class="col-md-9">
                <h6>${product.productId.name}</h6>
                <p class="mb-1"><strong>Price:</strong> &#8377; ${product.productId.price}</p>
                <p class="mb-1"><strong>Quantity:</strong> ${product.quantity}</p>
                <p class="mb-1"><strong>Subtotal:</strong> &#8377; ${product.productId.price * product.quantity}</p>
                ${product.productId.description ? `<p class="mb-0 text-muted"><small>${product.productId.description}</small></p>` : ''}
            </div>
        `;
    productsContainer.appendChild(productDiv);
  });
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'badge-warning';
    case 'Confirmed': return 'badge-info';
    case 'Shipped': return 'badge-primary';
    case 'Delivered': return 'badge-success';
    case 'Cancelled': return 'badge-danger';
    case 'Returned': return 'badge-secondary';
    default: return 'badge-light';
  }
}

// Helper function to get payment status badge class
function getPaymentStatusBadgeClass(paymentStatus) {
  switch (paymentStatus) {
    case 'success': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'failed': return 'badge-danger';
    default: return 'badge-light';
  }
}