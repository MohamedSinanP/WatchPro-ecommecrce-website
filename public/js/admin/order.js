function loadPage(pageNumber) {
      window.location.href = `/admin/orders?page=${pageNumber}`;
    }
    function viewOrderDetails(orderId) {
      // Retrieve the order data from a data attribute
      const order = JSON.parse(document.getElementById(`order-data-${orderId}`).textContent);

      let productsHtml = '';
      order.products.forEach(product => {
        productsHtml += `<li>${product.name} - Quantity: ${product.quantity}</li>`;
      });

      document.getElementById('orderDetailsBody').innerHTML = `
      <p><strong>Username:</strong> ${order.userId.fullName}</p>
      <p><strong>Total Price:</strong> &#8377 ${order.total}</p>
      <p><strong>Shipping Address:</strong> ${order.address.firstName} ${order.address.lastName}<br>
         ${order.address.address}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}<br>
         Phone: ${order.address.phoneNumber}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Products:</strong></p>
      <ul>${productsHtml}</ul>
    `;

      const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
      orderDetailsModal.show();
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
          alert('Order status updated successfully!');
          location.reload();
        } else {
          alert('Failed to update the order status.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating the order status.');
      }
    }


    async function updateOrderStatus(orderId, newStatus) {
      try {
        const response = await axios.put(`/admin/orders/updateStatus/${orderId}`, { status: newStatus });
        if (response.data.success) location.reload();
        else {
          const message = response.data.message
          console.log(message);
          Toastify({
            text:message,
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
      try {
        const response = await axios.delete(`/admin/orders/cancelOrder/${orderId}`);
        if (response.status === 200) location.reload();
      } catch (error) {
        console.error('Error canceling order:', error);
      }
    }
