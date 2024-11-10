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
      const response = await axios.post(`/user/returnOrder/${orderId}`);

      if (response.data.success) {
          location.reload();
      }
  } catch (error) {
      console.error('Error cancelling product:', error);
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

