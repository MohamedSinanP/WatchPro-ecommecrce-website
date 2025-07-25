function loadPage(pageNumber) {
  window.location.href = `/orders?page=${pageNumber}`;
}

// Cancel entire order
async function cancelOrderProduct(orderId) { // Remove total parameter
  try {
    const result = await Swal.fire({
      title: 'Cancel Entire Order?',
      text: 'Do you really want to cancel this entire order? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel entire order!',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      const response = await axios.delete(`/deleteOrderItem/${orderId}`, {
        data: {}
      });

      if (response.data.success) {
        const orderCard = document.querySelector(`.order-card[data-orderid="${orderId}"]`);
        if (orderCard) {
          const statusDiv = orderCard.closest('.order-card').previousElementSibling;
          if (statusDiv) {
            statusDiv.querySelector('p').innerHTML = '<strong>Order Status:</strong> Cancelled';
          }
          const actionsDiv = orderCard.querySelector('.actions');
          actionsDiv.innerHTML = ''; // Clear actions
          // Update all product statuses
          const productDivs = orderCard.querySelectorAll('.product-detail');
          productDivs.forEach(div => {
            div.style.opacity = '0.5';
            const statusP = div.querySelector('p:last-child') || document.createElement('p');
            statusP.innerHTML = '<strong>Status:</strong> <span class="text-danger">Cancelled</span>';
            div.appendChild(statusP);
          });
        }

        await Swal.fire({
          title: 'Cancelled!',
          text: `Your order has been cancelled successfully. ${response.data.refundAmount ? `₹${response.data.refundAmount} will be refunded to your wallet.` : ''}`,
          icon: 'success',
          confirmButtonColor: '#28a745',
          timer: 4000,
          timerProgressBar: true
        });
      } else {
        throw new Error(response.data.message || 'Failed to cancel order');
      }
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    await Swal.fire({
      title: 'Error!',
      text: 'Failed to cancel order. Please try again.',
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  }
}
// Cancel single product
async function cancelSingleProduct(orderId, productId, productName, productPrice, quantity) {
  try {
    const refundAmount = productPrice * quantity;

    const result = await Swal.fire({
      title: 'Cancel This Product?',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Price:</strong> ₹${productPrice}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Refund Amount:</strong> ₹${refundAmount}</p>
        </div>
        <p>Do you want to cancel this specific product?</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel this product!',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      // Send cancellation request
      const response = await axios.delete(`/deleteOrderItem/${orderId}`, {
        data: { productId }
      });

      if (response.data.success) {
        // Fetch updated order data
        const updatedOrderResponse = await axios.get(`/getOrder/${orderId}`);
        const updatedOrder = updatedOrderResponse.data.order;

        // Update the specific product display on the page
        const productDiv = document.querySelector(`.product-detail[data-orderid="${orderId}"][data-productid="${productId}"]`);
        if (productDiv) {
          productDiv.style.opacity = '0.5';
          const statusP = productDiv.querySelector('p:last-child') || document.createElement('p');
          statusP.innerHTML = '<strong>Status:</strong> <span class="badge badge-danger">Cancelled</span>';
          if (!productDiv.querySelector('p:last-child')) {
            productDiv.appendChild(statusP);
          }
        }

        // Update order card status and actions on the page
        const orderCard = document.querySelector(`.order-card[data-orderid="${orderId}"]`);
        if (orderCard) {
          const statusDiv = orderCard.previousElementSibling;
          if (statusDiv) {
            statusDiv.querySelector('p').innerHTML = `<strong>Order Status:</strong> ${updatedOrder.status}`;
          }

          const actionsDiv = orderCard.querySelector('.actions');
          if (updatedOrder.status === 'Cancelled') {
            // Clear all actions if the entire order is cancelled
            actionsDiv.innerHTML = `
              <button class="btn btn-primary view-more" data-toggle="modal" data-target="#productDetailsModal" 
                      data-order='${JSON.stringify(updatedOrder)}' onclick="showProductDetails(this)">
                View more
              </button>
            `;
          } else {
            // Update actions to reflect the current state
            const activeProducts = updatedOrder.products.filter(p => p.status !== 'Cancelled');
            actionsDiv.innerHTML = `
              <button class="btn btn-primary view-more" data-toggle="modal" data-target="#productDetailsModal" 
                      data-order='${JSON.stringify(updatedOrder)}' onclick="showProductDetails(this)">
                View more
              </button>
              ${activeProducts.length > 1 ? `
                <button class="btn btn-danger cancel-order" onclick="cancelOrderProduct('${orderId}')">
                  Cancel Entire Order
                </button>
              ` : activeProducts.length === 1 ? `
                <button class="btn btn-danger cancel-order" onclick="cancelOrderProduct('${orderId}')">
                  Cancel Order
                </button>
              ` : ''}
            `;
          }
        }

        // Update modal content if it's open
        const modal = document.getElementById('productDetailsModal');
        if (modal.classList.contains('show')) {
          const viewMoreButton = document.querySelector(`.order-card[data-orderid="${orderId}"] .view-more`);
          if (viewMoreButton) {
            viewMoreButton.setAttribute('data-order', JSON.stringify(updatedOrder));
            showProductDetails(viewMoreButton);
          }
        }

        await Swal.fire({
          title: 'Product Cancelled!',
          text: `${productName} has been cancelled successfully. ${response.data.refundAmount ? `₹${response.data.refundAmount} will be refunded to your wallet.` : ''}`,
          icon: 'success',
          confirmButtonColor: '#28a745',
          timer: 4000,
          timerProgressBar: true
        });
      } else {
        throw new Error(response.data.message || 'Failed to cancel product');
      }
    }
  } catch (error) {
    console.error('Error cancelling product:', error);
    await Swal.fire({
      title: 'Error!',
      text: 'Failed to cancel product. Please try again.',
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  }
}

// Helper function to check if order has multiple active products
function hasMultipleActiveProducts(order) {
  const activeProducts = order.products.filter(product => product.status !== 'Cancelled');
  return activeProducts.length > 1;
}

// Updated showProductDetails function to include individual cancel buttons
function showProductDetails(button) {
  const orderData = JSON.parse(button.getAttribute('data-order'));

  // Populate Order Summary
  document.getElementById('modal-order-date').textContent = orderData.createdAt
    ? new Date(orderData.createdAt).toLocaleDateString()
    : 'N/A';
  const statusBadge = document.getElementById('modal-order-status');
  statusBadge.textContent = orderData.status || 'Ordered';
  statusBadge.className = `badge ${getStatusBadgeClass(orderData.status)}`;
  document.getElementById('modal-order-total').textContent = orderData.total || '0';
  document.getElementById('modal-order-discount').textContent = orderData.totalDiscount || '0';
  document.getElementById('modal-payment-method').textContent = orderData.paymentMethod || 'N/A';
  const paymentStatusBadge = document.getElementById('modal-payment-status');
  paymentStatusBadge.textContent = orderData.paymentStatus || 'N/A';
  paymentStatusBadge.className = `badge ${getPaymentStatusBadgeClass(orderData.paymentStatus)}`;

  // Show refunded amount if greater than zero
  const refundedTotalRow = document.getElementById('modal-refunded-total-row');
  if (orderData.refundedTotal > 0) {
    document.getElementById('modal-refunded-total').textContent = orderData.refundedTotal;
    refundedTotalRow.style.display = 'block';
  } else {
    refundedTotalRow.style.display = 'none';
  }

  // Show delivery date if available
  const deliveryDateRow = document.getElementById('modal-delivery-date-row');
  if (orderData.deliveryDate) {
    document.getElementById('modal-delivery-date').textContent = new Date(
      orderData.deliveryDate
    ).toLocaleDateString();
    deliveryDateRow.style.display = 'block';
  } else {
    deliveryDateRow.style.display = 'none';
  }

  // Populate Delivery Address
  const address = orderData.address || {};
  document.getElementById('modal-address-name').textContent = address.firstName || 'N/A';
  document.getElementById('modal-address-phone').textContent = address.phoneNumber || 'N/A';
  document.getElementById('modal-address-full').textContent = address.address || 'N/A';
  document.getElementById('modal-address-city').textContent = address.city || 'N/A';
  document.getElementById('modal-address-state').textContent = address.state || 'N/A';
  document.getElementById('modal-address-pincode').textContent = address.pincode || 'N/A';

  // Populate Products List
  const productsContainer = document.getElementById('modal-products-list');
  productsContainer.innerHTML = '';

  orderData.products.forEach((product, index) => {
    const productDiv = document.createElement('div');
    productDiv.className = 'row border-bottom pb-3 mb-3';

    const productImage =
      product.productId.images && product.productId.images.length > 0
        ? product.productId.images[0] || product.productId.images[2] || product.productId.images[1]
        : '/default-image.jpg';

    const isProductCancellable =
      product.status !== 'Cancelled' &&
      orderData.status !== 'Cancelled' &&
      orderData.status !== 'Delivered' &&
      orderData.status !== 'Returned' &&
      orderData.paymentStatus === 'success';

    const showIndividualCancel = isProductCancellable && hasMultipleActiveProducts(orderData);

    // Use discountedPrice if available, otherwise use price
    const displayPrice = product.discountedPrice !== undefined && product.discountedPrice !== null
      ? product.discountedPrice
      : product.productId.price;

    productDiv.innerHTML = `
      <div class="col-md-3">
          <img src="${productImage}" 
               alt="Product Image" class="img-fluid rounded" style="max-height: 100px; object-fit: cover;">
      </div>
      <div class="col-md-9">
          <div class="d-flex justify-content-between align-items-start">
              <div>
                  <h6>${product.productId.name}</h6>
                  <p class="mb-1"><strong>Price:</strong> ₹${displayPrice}</p>
                  <p class="mb-1"><strong>Quantity:</strong> ${product.quantity}</p>
                  <p class="mb-1"><strong>Status:</strong> 
                      <span class="badge ${product.status === 'Cancelled' ? 'badge-danger' : 'badge-success'}">
                          ${product.status || 'Ordered'}
                      </span>
                  </p>
                  ${product.productId.description
        ? `<p class="mb-0 text-muted"><small>${product.productId.description}</small></p>`
        : ''
      }
              </div>
              <div>
                  ${showIndividualCancel
        ? `
                      <button class="btn btn-sm btn-danger" 
                              onclick="cancelSingleProduct('${orderData._id}', '${product.productId._id}', '${product.productId.name}', ${displayPrice}, ${product.quantity})">
                          Cancel This Item
                      </button>
                      `
        : ''
      }
              </div>
          </div>
      </div>
    `;
    productsContainer.appendChild(productDiv);
  });
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
        // Fetch updated order data to get the latest product statuses
        const updatedOrderResponse = await axios.get(`/getOrder/${orderId}`);
        const updatedOrder = updatedOrderResponse.data.order;

        // Update the order card status and product statuses
        const orderCard = document.querySelector(`.order-card[data-orderid="${orderId}"]`);
        if (orderCard) {
          const statusDiv = orderCard.previousElementSibling;
          if (statusDiv) {
            statusDiv.querySelector('p').innerHTML = '<strong>Order Status:</strong> Returned';
          }

          // Update each product's status in the order card
          const productDivs = orderCard.querySelectorAll('.product-detail');
          productDivs.forEach((div) => {
            const productId = div.getAttribute('data-productid');
            const product = updatedOrder.products.find(
              (p) => p.productId._id.toString() === productId
            );
            if (product && product.status === 'Returned') {
              div.style.opacity = '0.5';
              const statusP = div.querySelector('p:last-child') || document.createElement('p');
              statusP.innerHTML = '<strong>Status:</strong> <span class="badge badge-secondary">Returned</span>';
              if (!div.querySelector('p:last-child')) {
                div.appendChild(statusP);
              }
            }
          });

          // Clear actions since order is returned
          const actionsDiv = orderCard.querySelector('.actions');
          actionsDiv.innerHTML = `
            <button class="btn btn-primary view-more" data-toggle="modal" data-target="#productDetailsModal" 
                    data-order='${JSON.stringify(updatedOrder)}' onclick="showProductDetails(this)">
              View more
            </button>
          `;
        }

        // Update modal content if it's open
        const modal = document.getElementById('productDetailsModal');
        if (modal.classList.contains('show')) {
          const viewMoreButton = document.querySelector(`.order-card[data-orderid="${orderId}"] .view-more`);
          if (viewMoreButton) {
            viewMoreButton.setAttribute('data-order', JSON.stringify(updatedOrder));
            showProductDetails(viewMoreButton);
          }
        }

        Toastify({
          text: response.data.refundAmount > 0
            ? `Order returned successfully! ₹${response.data.refundAmount} refunded to your wallet.`
            : 'Order returned successfully! No additional refund processed.',
          duration: 3000,
          close: true,
          gravity: 'top',
          position: 'right',
          backgroundColor: '#4CAF50',
        }).showToast();
      } else {
        throw new Error(response.data.message || 'Failed to return order');
      }
    }
  } catch (error) {
    console.error('Error returning product:', error);
    Toastify({
      text: 'Failed to return order. Please try again.',
      duration: 3000,
      close: true,
      gravity: 'top',
      position: 'right',
      backgroundColor: '#FF0000',
    }).showToast();
  }
}

async function retryPayment(orderId, razorpayId) {
  try {
    const response = await axios.post('/retryPayment', {
      orderId,
      razorpayId
    });

    if (response.data.success) {
      const { orderId: razorpayOrderId, amount, currency, name, email, phoneNumber, order } = response.data;
      const orderid = order._id;

      const options = {
        key: "rzp_test_X9NFs9mKeaCGys",
        amount: amount,
        currency: currency,
        name: "WatchPro",
        description: "Order Payment",
        order_id: razorpayOrderId,
        handler: async function (response) {
          if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {
            const result = await axios.post('/paymentSuccess', { orderid });
            if (result.data.success) {
              // Update the order card
              const orderCard = document.querySelector(`.order-card[data-orderid="${orderid}"]`);
              if (orderCard) {
                const statusDiv = orderCard.closest('.order-card').previousElementSibling;
                if (statusDiv) {
                  statusDiv.querySelector('p').innerHTML = '<strong>Order Status:</strong> Confirmed';
                }
                // Update actions (remove retry payment button)
                const actionsDiv = orderCard.querySelector('.actions');
                actionsDiv.innerHTML = `
                  <button class="btn btn-primary view-more" data-toggle="modal" data-target="#productDetailsModal" 
                          data-order='${JSON.stringify({ ...order, status: 'Confirmed', paymentStatus: 'success' })}' 
                          onclick="showProductDetails(this)">
                    View more
                  </button>
                `;
              }
              Toastify({
                text: "Payment successful!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "#4CAF50",
              }).showToast();
            } else {
              throw new Error("Payment success but server response indicates failure.");
            }
          } else {
            throw new Error("Missing Razorpay response values.");
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
        Toastify({
          text: "Payment failed. Please try again.",
          duration: 3000,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "#FF0000",
        }).showToast();
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
      }).showToast();
    }
  } catch (error) {
    console.error('Error retrying payment:', error);
    Toastify({
      text: "Failed to retry payment. Please try again.",
      duration: 3000,
      close: true,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF0000",
    }).showToast();
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