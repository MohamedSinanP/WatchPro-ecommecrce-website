// Store initial values for discount management
let offerDiscount = 0;
let couponDiscount = 0;
let isCouponApplied = false;
let appliedCouponId = null; // Store the applied coupon ID

// Initialize discount values from page load
document.addEventListener('DOMContentLoaded', () => {
  // Get initial offer discount from the page
  const offerDiscountElement = document.getElementById('offerDiscount');
  if (offerDiscountElement) {
    const offerDiscountText = offerDiscountElement.textContent;
    offerDiscount = parseFloat(offerDiscountText.replace(/[^0-9.]+/g, "")) || 0;
  }

  // Initialize carousel if it exists
  initializeCarousel();

  // Initialize discount display
  updateDiscountDisplay();
  updateCartTotal();
  updateCheckoutButton(); // Initialize checkout button
});

function initializeCarousel() {
  const carousel = document.querySelector('.carousel');
  const items = document.querySelectorAll('.carousel-item');
  const prevButton = document.querySelector('.carousel-control.prev');
  const nextButton = document.querySelector('.carousel-control.next');

  if (!carousel || !items.length || !prevButton || !nextButton) return;

  let currentIndex = 0;

  function showItem(index) {
    const offset = -index * 100;
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

  showItem(currentIndex);
}

function updateQuantity(cartId, productId, change) {
  const input = document.querySelector(`input[name='num-product${productId}']`);

  let quantity = parseInt(input.value, 10);
  if (isNaN(quantity)) {
    quantity = 1;
  }

  quantity += change;
  if (quantity < 1) {
    quantity = 1;
  } else if (quantity > 8) {
    quantity = 8;
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Limit Exceeded',
        text: 'You cannot exceed the maximum quantity of 8.',
        confirmButtonText: 'OK'
      });
    } else {
      toastr.warning('You cannot exceed the maximum quantity of 8.', 'Limit Exceeded');
    }
    return;
  }

  input.value = quantity;
  sendQuantityUpdate(cartId, productId, quantity);
}

function sendQuantityUpdate(cartId, productId, quantity) {
  axios.put('/updateQuantity', {
    cartId: cartId,
    id: productId,
    quantity: quantity
  })
    .then(response => {
      if (response.data.success) {
        const product = response.data.product;
        const subtotal = response.data.subtotal;
        const newOfferDiscount = response.data.totalDiscount || 0;

        // Update individual product total
        const totalPriceElement = document.querySelector(`#total-price-${productId}`);
        const priceToUse = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
        const qty = parseInt(product.quantity);

        totalPriceElement.textContent = `₹ ${(priceToUse * qty).toFixed(2)}`;

        // Update subtotal
        const subtotalElement = document.querySelector('#subtotal');
        subtotalElement.textContent = `₹ ${subtotal}`;

        // Update offer discount
        offerDiscount = newOfferDiscount;
        updateDiscountDisplay();

        // Recalculate total and update checkout button
        updateCartTotal();
        updateCheckoutButton();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      if (error.response && error.response.status === 400) {
        toastr.error(error.response.data.message, 'Error', {
          closeButton: true,
          progressBar: true,
          timeOut: 1000,
          onHidden: function () {
            location.reload();
          }
        });
      }
    });
}

function deleteProduct(productId) {
  axios.delete(`/deleteProduct/${productId}`)
    .then(response => {
      if (response.data.success) {
        // Use closest('tr') to match HTML structure
        const productRow = document.querySelector(`#total-price-${productId}`).closest('tr');
        if (productRow) {
          productRow.remove();
        }

        // Fetch updated cart totals
        axios.get('/getCartTotals')
          .then(cartResponse => {
            if (cartResponse.data.success) {
              document.querySelector('#subtotal').textContent = `₹ ${cartResponse.data.subtotal}`;
              offerDiscount = parseFloat(cartResponse.data.totalDiscount) || 0;
              updateDiscountDisplay();
              updateCartTotal();
              updateCheckoutButton();
              toastr.success('Product removed from cart', 'Success');

              // Check if cart is empty
              if (!document.querySelectorAll('.table_row').length) {
                document.querySelector('.wrap-table-shopping-cart').innerHTML = '<p>No cart items found for user</p>';
              }
            } else {
              toastr.error(cartResponse.data.message || 'Failed to update cart totals', 'Error');
            }
          })
          .catch(cartError => {
            console.error('Error fetching cart totals:', cartError);
            toastr.error('An error occurred while updating cart totals', 'Error');
          });
      }
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      toastr.error('An error occurred while trying to delete the product');
    });
}

function updateDiscountDisplay() {
  // Update offer discount display
  const offerDiscountRow = document.getElementById('offer-discount-row');
  const offerDiscountElement = document.getElementById('offerDiscount');

  if (offerDiscount > 0) {
    if (offerDiscountRow) {
      offerDiscountRow.style.display = 'flex';
      offerDiscountElement.textContent = `- ₹ ${offerDiscount}`;
    }
  } else {
    if (offerDiscountRow) {
      offerDiscountRow.style.display = 'none';
    }
  }

  // Update coupon discount display
  const couponDiscountRow = document.getElementById('coupon-discount-row');
  const couponDiscountElement = document.getElementById('couponDiscount');

  if (couponDiscount > 0) {
    couponDiscountRow.style.display = 'flex';
    couponDiscountElement.textContent = `- ₹ ${couponDiscount.toFixed(2)}`;
  } else {
    couponDiscountRow.style.display = 'none';
  }
}

function updateCartTotal() {
  const subtotalText = document.getElementById('subtotal').textContent;
  const subtotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, ""));
  const finalTotal = Math.max(0, subtotal - couponDiscount);
  document.getElementById('cartTotal').textContent = `₹ ${finalTotal.toFixed(2)}`;
}

// Function to update the checkout button URL with coupon ID
function updateCheckoutButton() {
  const checkoutButton = document.querySelector('button a[href*="/checkout"]');
  if (checkoutButton) {
    const subtotalText = document.getElementById('cartTotal').textContent;
    const subtotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, ""));
    const totalDiscount = offerDiscount + couponDiscount;

    let checkoutUrl = `/checkout?cartTotal=${subtotal}&totalDiscount=${totalDiscount}`;

    // Add coupon ID if a coupon is applied
    if (appliedCouponId) {
      checkoutUrl += `&couponId=${appliedCouponId}`;
    }

    checkoutButton.href = checkoutUrl;
  }
}

// Apply coupon functionality
document.addEventListener('DOMContentLoaded', () => {
  const applyCouponBtn = document.querySelector('.apply-coupon-btn');
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', async () => {
      const couponCode = document.querySelector('input[name="coupon"]').value.trim();

      if (!couponCode) {
        toastr.error('Please enter a coupon code');
        return;
      }

      const subtotalText = document.getElementById('subtotal').textContent;
      const cartTotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, ""));

      try {
        const response = await axios.post('/applyCoupon', {
          code: couponCode,
          cartTotal: cartTotal
        });

        // Clear coupon input
        document.querySelector('input[name="coupon"]').value = '';

        if (response.data.success) {
          // Get coupon discount and ID from response
          couponDiscount = response.data.discount || 0;
          appliedCouponId = response.data.couponId; // Store the coupon ID
          isCouponApplied = true;

          // Update displays
          updateDiscountDisplay();
          updateCartTotal();
          updateCheckoutButton(); // Update checkout button with coupon ID

          // Toggle buttons
          const applyButton = document.querySelector('.apply-coupon-btn');
          applyButton.style.pointerEvents = 'none';
          applyButton.classList.add('disabled');
          document.querySelector('.remove-coupon-btn').style.display = 'inline-flex';

          // Show success message
          toastr.success("Your coupon was applied successfully.", "Coupon Applied!", {
            duration: 2000,
            closeButton: true,
            gravity: "top",
            positionClass: "toast-right",
            backgroundColor: "green",
            stopOnFocus: true,
          });
        } else {
          toastr.error(response.data.message || 'Failed to apply coupon', {
            duration: 2000,
            closeButton: true,
            gravity: "top",
            positionClass: "toast-right",
            backgroundColor: "red",
            stopOnFocus: true,
          });
        }
      } catch (error) {
        console.error('Error applying coupon:', error);
        toastr.error('An error occurred while applying the coupon');
      }
    });
  }

  // Remove coupon functionality
  const removeCouponBtn = document.querySelector('.remove-coupon-btn');
  if (removeCouponBtn) {
    removeCouponBtn.addEventListener('click', async () => {
      try {
        const response = await axios.post('/removeCoupon');

        if (response.data.success) {
          // Reset coupon discount and ID
          couponDiscount = 0;
          appliedCouponId = null; // Clear the coupon ID
          isCouponApplied = false;

          // Update displays
          updateDiscountDisplay();
          updateCartTotal();
          updateCheckoutButton(); // Update checkout button without coupon ID

          // Toggle buttons
          const applyButton = document.querySelector('.apply-coupon-btn');
          applyButton.style.pointerEvents = 'auto';
          applyButton.classList.remove('disabled');
          document.querySelector('.remove-coupon-btn').style.display = 'none';

          toastr.success('Coupon removed successfully');
        } else {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: response.data.message || 'Failed to remove coupon',
            });
          } else {
            toastr.error(response.data.message || 'Failed to remove coupon');
          }
        }
      } catch (error) {
        console.error('Error removing coupon:', error);
        toastr.error('An error occurred while removing the coupon');
      }
    });
  }

  // Handle coupon card buttons
  const couponCardButtons = document.querySelectorAll('.apply-coupon-btn[data-coupon-code]');
  couponCardButtons.forEach(button => {
    button.addEventListener('click', () => {
      const couponCode = button.getAttribute('data-coupon-code');
      const couponInput = document.querySelector('input[name="coupon"]');
      if (couponInput) {
        couponInput.value = couponCode;
      }
    });
  });
});