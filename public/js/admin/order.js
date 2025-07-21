// Updated order.js frontend file

function loadPage(pageNumber) {
  window.location.href = `/admin/orders?page=${pageNumber}`;
}

function viewOrderDetails(orderId) {
  const order = JSON.parse(document.getElementById(`order-data-${orderId}`).textContent);

  // Populate Order Summary
  document.getElementById('modal-order-date').textContent = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString()
    : 'N/A';
  const statusBadge = document.getElementById('modal-order-status');
  statusBadge.textContent = order.status || 'Ordered';
  statusBadge.className = `badge bg-${getStatusBadgeClass(order.status)}`;
  document.getElementById('modal-order-total').textContent = order.total || '0';
  document.getElementById('modal-order-discount').textContent = order.totalDiscount || '0';
  document.getElementById('modal-payment-method').textContent = order.paymentMethod || 'N/A';
  const paymentStatusBadge = document.getElementById('modal-payment-status');
  paymentStatusBadge.textContent = order.paymentStatus || 'N/A';
  paymentStatusBadge.className = `badge bg-${getPaymentStatusBadgeClass(order.paymentStatus)}`;

  // Show refunded amount if greater than zero
  const refundedTotalRow = document.getElementById('modal-refunded-total-row');
  if (order.refundedTotal > 0) {
    document.getElementById('modal-refunded-total').textContent = order.refundedTotal;
    refundedTotalRow.style.display = 'block';
  } else {
    refundedTotalRow.style.display = 'none';
  }

  // Show delivery date if available
  const deliveryDateRow = document.getElementById('modal-delivery-date-row');
  if (order.deliveryDate) {
    document.getElementById('modal-delivery-date').textContent = new Date(
      order.deliveryDate
    ).toLocaleDateString();
    deliveryDateRow.style.display = 'block';
  } else {
    deliveryDateRow.style.display = 'none';
  }

  // Populate Delivery Address
  const address = order.address || {};
  document.getElementById('modal-address-name').textContent = `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'N/A';
  document.getElementById('modal-address-phone').textContent = address.phoneNumber || 'N/A';
  document.getElementById('modal-address-full').textContent = address.address || 'N/A';
  document.getElementById('modal-address-city').textContent = address.city || 'N/A';
  document.getElementById('modal-address-state').textContent = address.state || 'N/A';
  document.getElementById('modal-address-pincode').textContent = address.pincode || 'N/A';

  // Populate Products List with individual status controls
  const productsContainer = document.getElementById('modal-products-list');
  productsContainer.innerHTML = '';

  order.products.forEach((product, index) => {
    const productDiv = document.createElement('div');
    productDiv.className = 'row border-bottom pb-3 mb-3';

    const productImage =
      product.productId && product.productId.images && product.productId.images.length > 0
        ? product.productId.images[0] || product.productId.images[2] || product.productId.images[1]
        : '/default-image.jpg';

    // Use discountedPrice if available, otherwise use price
    const displayPrice = product.discountedPrice !== undefined && product.discountedPrice !== null
      ? product.discountedPrice
      : product.price;

    productDiv.innerHTML = `
      <div class="col-md-3">
          <img src="${productImage}" 
               alt="Product Image" class="img-fluid rounded" style="max-height: 100px; object-fit: cover;">
      </div>
      <div class="col-md-9">
          <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                  <h6>${product.name}</h6>
                  <p class="mb-1"><strong>Price:</strong> ₹${displayPrice}</p>
                  <p class="mb-1"><strong>Quantity:</strong> ${product.quantity}</p>
                  <p class="mb-2"><strong>Status:</strong> 
                      <span class="badge bg-${getProductStatusBadgeClass(product.status)}">
                          ${product.status || 'Ordered'}
                      </span>
                  </p>
                  ${product.description
        ? `<p class="mb-2 text-muted"><small>${product.description}</small></p>`
        : ''
      }
              </div>
              <div class="ms-3">
                  <label class="form-label small">Update Status:</label>
                  <select class="form-select form-select-sm" 
                          onchange="updateProductStatus('${order._id}', '${product._id}', this.value)"
                          style="min-width: 120px;">
                      <option value="Pending" ${product.status === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Ordered" ${product.status === 'Ordered' ? 'selected' : ''}>Ordered</option>
                      <option value="Shipped" ${product.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                      <option value="Delivered" ${product.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                      <option value="Cancelled" ${product.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                      <option value="Returned" ${product.status === 'Returned' ? 'selected' : ''}>Returned</option>
                  </select>
              </div>
          </div>
      </div>
    `;
    productsContainer.appendChild(productDiv);
  });

  const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
  orderDetailsModal.show();
}

// New function to update individual product status
async function updateProductStatus(orderId, productId, newStatus) {
  try {
    const response = await axios.put(`/admin/orders/${orderId}/products/${productId}/status`, {
      status: newStatus
    });

    if (response.data.success) {
      Toastify({
        text: `Product status updated to ${newStatus}. Order status: ${response.data.newOrderStatus}`,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#28a745",
      }).showToast();

      // Reload after short delay to show updated status
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      Toastify({
        text: response.data.message || "Failed to update product status",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
    }
  } catch (error) {
    console.error('Error updating product status:', error);
    Toastify({
      text: "Error updating product status",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();
  }
}

// Helper function to get product status badge class
function getProductStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Ordered': return 'info';
    case 'Shipped': return 'primary';
    case 'Delivered': return 'success';
    case 'Cancelled': return 'danger';
    case 'Returned': return 'secondary';
    default: return 'light';
  }
}

// Helper function to get status badge class (Bootstrap 5)
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Confirmed': return 'info';
    case 'Shipped': return 'primary';
    case 'Delivered': return 'success';
    case 'Cancelled': return 'danger';
    case 'Returned': return 'secondary';
    default: return 'light';
  }
}

// Helper function to get payment status badge class (Bootstrap 5)
function getPaymentStatusBadgeClass(paymentStatus) {
  switch (paymentStatus) {
    case 'success': return 'success';
    case 'pending': return 'warning';
    case 'failed': return 'danger';
    default: return 'light';
  }
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

async function toggleOrderStatus(orderId, isCurrentlyCompleted) {
  const newStatus = isCurrentlyCompleted === 'true' ? false : true;
  try {
    const response = await fetch('/admin/updateOrderStatus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, isCompleted: newStatus }),
    });

    const data = await response.json();
    if (data.success) {
      location.reload();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await axios.put(`/admin/orders/updateStatus/${orderId}`, { status: newStatus });
    if (response.data.success) {
      Toastify({
        text: `Order status updated to ${newStatus}`,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#28a745",
      }).showToast();
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      const message = response.data.message;
      console.log(message);
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await axios.put(`/admin/orders/cancel/${orderId}`);
    if (response.data.success) {
      Toastify({
        text: response.data.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#28a745",
      }).showToast();
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      Toastify({
        text: response.data.message || "Failed to cancel order",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
    }
  } catch (error) {
    console.error('Error canceling order:', error);
    Toastify({
      text: "Error canceling order",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();
  }
}