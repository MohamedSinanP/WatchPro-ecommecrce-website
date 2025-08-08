// Updated order.js frontend file with status progression logic

function loadPage(pageNumber) {
  window.location.href = `/admin/orders?page=${pageNumber}`;
}

// Function to get allowed statuses based on current status (FOR PRODUCTS ONLY)
function getAllowedStatuses(currentStatus) {
  switch (currentStatus) {
    case 'Pending':
      return ['Pending', 'Confirmed', 'Cancelled'];
    case 'Confirmed':
      return ['Confirmed', 'Shipped', 'Cancelled'];
    case 'Shipped':
      return ['Shipped', 'Delivered', 'Cancelled'];
    case 'Delivered':
      return ['Delivered']; // Removed 'Returned' - products can't be individually returned
    case 'Cancelled':
      return ['Cancelled'];
    case 'Returned':
      return ['Returned']; // Keep this for existing returned products (read-only)
    default:
      return ['Pending', 'Confirmed', 'Cancelled'];
  }
}

// Function to generate status options based on current status
function generateStatusOptions(currentStatus, selectedStatus = null) {
  const allowedStatuses = getAllowedStatuses(currentStatus);
  const allStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

  return allStatuses.map(status => {
    const isAllowed = allowedStatuses.includes(status);
    const isSelected = selectedStatus ? status === selectedStatus : status === currentStatus;
    const disabled = !isAllowed ? 'disabled' : '';
    const selected = isSelected ? 'selected' : '';

    return `<option value="${status}" ${selected} ${disabled}>${status}</option>`;
  }).join('');
}

function viewOrderDetails(orderId) {
  const order = JSON.parse(document.getElementById(`order-data-${orderId}`).textContent);
  console.log("this is the order", order)
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

    const currentProductStatus = product.status || 'Pending';
    const statusOptions = generateStatusOptions(currentProductStatus);

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
                      <span class="badge bg-${getProductStatusBadgeClass(currentProductStatus)}">
                          ${currentProductStatus}
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
                      ${statusOptions}
                  </select>
                  <small class="text-muted d-block mt-1">
                      ${getStatusHelpText(currentProductStatus)}
                  </small>
              </div>
          </div>
      </div>
    `;
    productsContainer.appendChild(productDiv);
  });

  const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
  orderDetailsModal.show();
}

// Function to get help text for status progression (UPDATED FOR PRODUCTS)
function getStatusHelpText(currentStatus) {
  switch (currentStatus) {
    case 'Pending':
      return 'Can move to: Confirmed, Cancelled';
    case 'Confirmed':
      return 'Can move to: Shipped, Cancelled';
    case 'Shipped':
      return 'Can move to: Delivered, Cancelled';
    case 'Delivered':
      return 'Final status for products';
    case 'Cancelled':
      return 'Final status - cannot change';
    case 'Returned':
      return 'Final status - cannot change';
    default:
      return '';
  }
}

// New function to update individual product status with validation
async function updateProductStatus(orderId, productId, newStatus) {
  try {
    const response = await axios.patch(`/admin/orders/${orderId}/products/${productId}/status`, {
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

      // Reload to reset the dropdown to previous value
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (error) {
    console.error('Error updating product status:', error);
    let errorMessage = "Error updating product status";

    // Check if it's a status progression error
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }

    Toastify({
      text: errorMessage,
      duration: 4000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();

    // Reload to reset the dropdown to previous value
    setTimeout(() => {
      location.reload();
    }, 1500);
  }
}

// Helper function to get product status badge class
function getProductStatusBadgeClass(status) {
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
      method: 'PATCH',
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
    const response = await axios.patch(`/admin/orders/updateStatus/${orderId}`, { status: newStatus });
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
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    let errorMessage = "Error updating order status";

    // Check if it's a status progression error
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }

    Toastify({
      text: errorMessage,
      duration: 4000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();

    // Reload to reset the dropdown to previous value
    setTimeout(() => {
      location.reload();
    }, 1500);
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await axios.patch(`/admin/orders/cancel/${orderId}`);
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
        duration: 4000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
    }
  } catch (error) {
    console.error('Error canceling order:', error);
    let errorMessage = "Error canceling order";

    // Check if it's a status progression error
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }

    Toastify({
      text: errorMessage,
      duration: 4000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();
  }
}

async function deleteOrder(orderId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "This action will permanently delete the order.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await axios.delete(`/admin/orders/delete/${orderId}`);
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
        text: response.data.message || "Failed to delete order",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF5733",
      }).showToast();
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    Toastify({
      text: "Error deleting order",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF5733",
    }).showToast();
  }
}