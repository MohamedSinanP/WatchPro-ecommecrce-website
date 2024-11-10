document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.carousel');
  const items = document.querySelectorAll('.carousel-item');
  const prevButton = document.querySelector('.carousel-control.prev');
  const nextButton = document.querySelector('.carousel-control.next');

  let currentIndex = 0;

  function showItem(index) {
    const offset = -index * 100; // Assuming each item is 100% width
    carousel.style.transform = `translateX(${offset}%)`;
  }

  prevButton.addEventListener('click', () => {
    currentIndex = (currentIndex > 0) ? currentIndex - 1 : items.length - 1;
    showItem(currentIndex);
  });

  nextButton.addEventListener('click', () => {
    currentIndex = (currentIndex < items.length - 1) ? currentIndex + 1 : 0;
    showItem(currentIndex);
  });

  // Automatically show the first item
  showItem(currentIndex);
});

function updateQuantity(cartId, productId, change) {
  const input = document.querySelector(`input[name='num-product${productId}']`);

  // Convert the current quantity to an integer and set to 1 if invalid
  let quantity = parseInt(input.value, 10);
  if (isNaN(quantity)) {
    quantity = 1;
  }

  // Apply the change and ensure it’s within the min and max limits
  quantity += change;
  if (quantity < 1) {
    quantity = 1;
  } else if (quantity > 8) {
    quantity = 8;
    Swal.fire({
      icon: 'warning',
      title: 'Limit Exceeded',
      text: 'You cannot exceed the maximum quantity of 8.',
      confirmButtonText: 'OK'
    });
  }


  input.value = quantity;


  sendQuantityUpdate(cartId, productId, quantity);
}


function sendQuantityUpdate(cartId, productId, quantity) {
  axios.put('/user/updateQuantity', {
    cartId: cartId,
    id: productId,
    quantity: quantity
  })
    .then(response => {
      if (response.data.success) {
        const product = response.data.product;
        const subtotal = response.data.subtotal;
        const totalDiscount = response.data.totalDiscount;
console.log(product.quantity);

        const totalPriceElement = document.querySelector(`#total-price-${productId}`);


        const priceToUse = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);

        const quantity = parseInt(product.quantity);

        console.log(priceToUse, quantity);

        totalPriceElement.textContent = `₹ ${(priceToUse * quantity).toFixed(2)}`;


        const subtotalElement = document.querySelector('#subtotal');
        subtotalElement.textContent = `₹ ${subtotal}`;

const cartTotal = document.querySelector('#cartTotal');
        cartTotal.textContent = `₹ ${subtotal}`;				
const discount = document.querySelector('#totalDiscount');
        discount.textContent = `₹ - ${totalDiscount}`;				
      }
    })
    .catch(error => {
      console.error('Error:', error);
      if (error.response.status === 400) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response.data.message,
          confirmButtonText: 'OK'
        });
      }

    });
}
function deleteProduct(productId) {
  console.log(productId);

  axios.delete(`/user/deleteProduct/${productId}`)
    .then(response => {
      if (response.data.success) {
        alert('Product deleted successfully');

        const productElement = document.getElementById(`product-${productId}`); // Assuming each product has a unique ID
        if (productElement) {
          productElement.remove();
        }

        // Force page reload to reflect changes
        location.href = location.href; // Bypasses the cache
      }
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      alert('An error occurred while trying to delete the product');
    });
}

document.querySelector('.apply-coupon-btn').addEventListener('click', async () => {
  const couponCode = document.querySelector('input[name="coupon"]').value;
  const cartTotalText = document.getElementById('cartTotal').textContent;
  const cartTotal = parseFloat(cartTotalText.replace(/[^0-9.-]+/g, ""));
  console.log(couponCode, cartTotal);

  try {
    const response = await axios.post('/user/applyCoupon', {
      code: couponCode,
      cartTotal: cartTotal
    });

    document.querySelector('input[name="coupon"]').value = '';

    if (response.data.success) {
      console.log('Coupon applied successfully');
      const newTotal = response.data.newTotal;
      document.getElementById('cartTotal').textContent = `₹ ${newTotal}`;

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Coupon Applied!',
        text: 'Your coupon was applied successfully.',
      });

      // Disable the Apply Coupon button and add the disabled styles
      const applyButton = document.querySelector('.apply-coupon-btn');
      applyButton.style.pointerEvents = 'none';
      applyButton.classList.add('disabled');
      document.querySelector('.remove-coupon-btn').style.display = 'inline-flex';
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: response.data.message,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

document.querySelector('.remove-coupon-btn').addEventListener('click', async () => {
  const cartTotalText = document.getElementById('cartTotal').textContent;
  const cartTotal = parseFloat(cartTotalText.replace(/[^0-9.-]+/g, ""));
  console.log(cartTotal);

  try {
    const response = await axios.post('/user/removeCoupon', {
      cartTotal: cartTotal
    });

    if (response.data.success) {
      console.log('Coupon removed successfully');
      const oldCartTotal = response.data.oldCartTotal;
      document.getElementById('cartTotal').textContent = `₹ ${oldCartTotal}`;

      // Re-enable the Apply Coupon button and remove the disabled styles
      const applyButton = document.querySelector('.apply-coupon-btn');
      applyButton.style.pointerEvents = 'auto';
      applyButton.classList.remove('disabled');
      document.querySelector('.remove-coupon-btn').style.display = 'none';
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: response.data.message,
      });
    }
  } catch (error) {
    console.log(error);
  }
});