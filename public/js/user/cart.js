// Store initial values for discount management
let couponDiscount = 0;
let isCouponApplied = false;
let appliedCouponId = null;

// Initialize discount values from page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize carousel if it exists
  initializeCarousel();

  updateDiscountDisplay();
  updateCartTotal();
  updateCheckoutButton();
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

// Function to calculate offer discount from cart items
function calculateOfferDiscount() {
  let offerDiscount = 0;
  const productRows = document.querySelectorAll('.table_row');

  productRows.forEach(row => {
    const priceCell = row.querySelector('.column-3');
    const quantityInput = row.querySelector('input[name*="num-product"]');

    if (priceCell && quantityInput) {
      const priceSpans = priceCell.querySelectorAll('span');
      const quantity = parseInt(quantityInput.value);

      // If there are two price spans, it means there's an offer
      if (priceSpans.length === 2) {
        const originalPriceText = priceSpans[0].textContent;
        const offerPriceText = priceSpans[1].textContent;

        const originalPrice = parseFloat(originalPriceText.replace(/[^0-9.-]+/g, ""));
        const offerPrice = parseFloat(offerPriceText.replace(/[^0-9.-]+/g, ""));

        if (originalPrice > offerPrice) {
          offerDiscount += (originalPrice - offerPrice) * quantity;
        }
      }
    }
  });

  return offerDiscount;
}

// Function to calculate total discount
function calculateTotalDiscount() {
  const offerDiscount = calculateOfferDiscount();
  const totalDiscount = couponDiscount + offerDiscount;
  return { offerDiscount, totalDiscount };
}

// Function to fetch and update cart totals (subtotal, discounts, coupon status)
function fetchAndUpdateCartTotals() {
  axios.get('/getCartTotals')
    .then(response => {
      if (response.data.success) {
        // Update subtotal
        const subtotalElement = document.querySelector('#subtotal');
        subtotalElement.textContent = `₹ ${response.data.subtotal}`;

        // Update coupon discount and status
        couponDiscount = parseFloat(response.data.couponDiscount) || 0;
        isCouponApplied = !!response.data.appliedCoupon;
        appliedCouponId = response.data.appliedCoupon ? response.data.appliedCoupon.id : null;

        // Show toast if coupon was removed
        if (response.data.couponRemoved) {
          toastr.warning('Coupon removed due to cart total below minimum purchase limit', 'Coupon Invalid');
        }

        // Update UI elements
        updateDiscountDisplay();
        updateCartTotal();
        updateCheckoutButton();

        // Update coupon button states
        const applyButton = document.querySelector('.apply-coupon-btn');
        const removeButton = document.querySelector('.remove-coupon-btn');
        if (isCouponApplied) {
          applyButton.style.pointerEvents = 'none';
          applyButton.classList.add('disabled');
          removeButton.style.display = 'inline-flex';
        } else {
          applyButton.style.pointerEvents = 'auto';
          applyButton.classList.remove('disabled');
          removeButton.style.display = 'none';
        }
      } else {
        toastr.error(response.data.message || 'Failed to fetch cart totals', 'Error');
      }
    })
    .catch(error => {
      console.error('Error fetching cart totals:', error);
      toastr.error('An error occurred while fetching cart totals', 'Error');
    });
}

function updateQuantity(cartId, productId, change) {
  const input = document.querySelector(`input[name='num-product${productId}']`);
  const variantSize = input.closest('tr').querySelector('.column-2 span').textContent.replace('Size: ', '').trim();
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
  sendQuantityUpdate(cartId, productId, quantity, variantSize);
}

function sendQuantityUpdate(cartId, productId, quantity, variantSize) {
  axios.patch('/updateQuantity', {
    cartId,
    id: productId,
    quantity,
    variantSize
  })
    .then(response => {
      if (response.data.success) {
        const product = response.data.product;
        const subtotal = response.data.subtotal;
        const wasCouponApplied = isCouponApplied;
        couponDiscount = parseFloat(response.data.couponDiscount) || 0;
        isCouponApplied = !!response.data.appliedCoupon;
        appliedCouponId = response.data.appliedCoupon ? response.data.appliedCoupon.id : null;

        // Update individual product total
        const totalPriceElement = document.querySelector(`#total-price-${productId}`);
        const priceToUse = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
        const qty = parseInt(product.quantity);
        totalPriceElement.textContent = `₹ ${(priceToUse * qty).toFixed(2)}`;

        // Update subtotal
        const subtotalElement = document.querySelector('#subtotal');
        subtotalElement.textContent = `₹ ${subtotal}`;

        // Show toast only if coupon was just removed
        if (response.data.couponRemoved) {
          toastr.warning('Coupon removed due to cart total below minimum purchase limit', 'Coupon Invalid', {
            closeButton: true,
            progressBar: true,
            timeOut: 2000
          });
        }

        updateDiscountDisplay();
        updateCartTotal();
        updateCheckoutButton();

        const applyButton = document.querySelector('.apply-coupon-btn');
        const removeButton = document.querySelector('.remove-coupon-btn');
        if (isCouponApplied) {
          applyButton.style.pointerEvents = 'none';
          applyButton.classList.add('disabled');
          removeButton.style.display = 'inline-flex';
        } else {
          applyButton.style.pointerEvents = 'auto';
          applyButton.classList.remove('disabled');
          removeButton.style.display = 'none';
        }
      } else {
        toastr.error(response.data.message || 'Failed to update quantity', 'Error', {
          closeButton: true,
          progressBar: true,
          timeOut: 1000,
          onHidden: function () {
            location.reload();
          }
        });
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
  const row = document.querySelector(`#total-price-${productId}`).closest('tr');
  const variantSize = row.querySelector('.column-2 span').textContent.replace('Size: ', '').trim();
  axios.delete(`/deleteProduct/${productId}/${variantSize}`)
    .then(response => {
      if (response.data.success) {
        row.remove();
        toastr.success('Product removed from cart', 'Success');

        // Update cart totals
        const subtotalElement = document.querySelector('#subtotal');
        subtotalElement.textContent = `₹ ${response.data.subtotal}`;
        couponDiscount = parseFloat(response.data.couponDiscount) || 0;
        isCouponApplied = !!response.data.appliedCoupon;
        appliedCouponId = response.data.appliedCoupon ? response.data.appliedCoupon.id : null;

        if (response.data.couponRemoved) {
          toastr.warning('Coupon removed due to cart total below minimum purchase limit', 'Coupon Invalid');
        }

        updateDiscountDisplay();
        updateCartTotal();
        updateCheckoutButton();

        // Update coupon button states
        const applyButton = document.querySelector('.apply-coupon-btn');
        const removeButton = document.querySelector('.remove-coupon-btn');
        if (isCouponApplied) {
          applyButton.style.pointerEvents = 'none';
          applyButton.classList.add('disabled');
          removeButton.style.display = 'inline-flex';
        } else {
          applyButton.style.pointerEvents = 'auto';
          applyButton.classList.remove('disabled');
          removeButton.style.display = 'none';
        }

        // Check if cart is empty
        if (!document.querySelectorAll('.table_row').length) {
          document.querySelector('.wrap-table-shopping-cart').innerHTML = '<p>No cart items found for user</p>';
          couponDiscount = 0;
          isCouponApplied = false;
          appliedCouponId = null;
          updateDiscountDisplay();
          updateCartTotal();
          updateCheckoutButton();
        }
      }
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      toastr.error('An error occurred while trying to delete the product');
    });
}
function updateDiscountDisplay() {
  const couponDiscountRow = document.getElementById('coupon-discount-row');
  const couponDiscountElement = document.getElementById('couponDiscount');

  if (couponDiscountRow && couponDiscountElement) {
    if (couponDiscount > 0 && isCouponApplied) {
      couponDiscountRow.style.display = 'flex';
      couponDiscountElement.textContent = `- ₹ ${couponDiscount.toFixed(2)}`;
    } else {
      couponDiscountRow.style.display = 'none';
    }
  }

  // Hide offer discount row (since it's already applied in subtotal)
  const offerDiscountRow = document.getElementById('offer-discount-row');
  if (offerDiscountRow) {
    offerDiscountRow.style.display = 'none';
  }

  // Hide total discount row
  const totalDiscountRow = document.getElementById('total-discount-row');
  if (totalDiscountRow) {
    totalDiscountRow.style.display = 'none';
  }
}

function updateCartTotal() {
  const subtotalText = document.getElementById('subtotal').textContent;
  const subtotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, ""));
  const finalTotal = Math.max(0, subtotal - couponDiscount);
  document.getElementById('cartTotal').textContent = `₹ ${finalTotal.toFixed(2)}`;
}

function updateCheckoutButton() {
  const checkoutButton = document.querySelector('button a[href*="/checkout"]');
  if (checkoutButton) {
    const subtotalText = document.getElementById('cartTotal').textContent;
    const subtotal = parseFloat(subtotalText.replace(/[^0-9.-]+/g, ""));
    const { offerDiscount, totalDiscount } = calculateTotalDiscount();

    let checkoutUrl = `/checkout?cartTotal=${subtotal}`;

    // Add total discount to URL
    if (totalDiscount > 0) {
      checkoutUrl += `&totalDiscount=${totalDiscount}`;
    }

    // Add coupon details if a coupon is applied
    if (appliedCouponId && isCouponApplied) {
      checkoutUrl += `&couponId=${appliedCouponId}`;
      checkoutUrl += `&couponDiscount=${couponDiscount}`;
    }

    // Add offer discount if present
    if (offerDiscount > 0) {
      checkoutUrl += `&offerDiscount=${offerDiscount.toFixed(2)}`;
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

        document.querySelector('input[name="coupon"]').value = '';

        if (response.data.success) {
          couponDiscount = response.data.discount || 0;
          appliedCouponId = response.data.couponId;
          isCouponApplied = true;

          updateDiscountDisplay();
          updateCartTotal();
          updateCheckoutButton();

          const applyButton = document.querySelector('.apply-coupon-btn');
          applyButton.style.pointerEvents = 'none';
          applyButton.classList.add('disabled');
          document.querySelector('.remove-coupon-btn').style.display = 'inline-flex';

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
          couponDiscount = 0;
          appliedCouponId = null;
          isCouponApplied = false;

          updateDiscountDisplay();
          updateCartTotal();
          updateCheckoutButton();

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

  const checkoutAnchor = document.querySelector('button a[href*="/checkout"]');
  if (checkoutAnchor) {
    checkoutAnchor.addEventListener('click', (e) => {
      const cartItems = document.querySelectorAll('.table_row');
      if (cartItems.length === 0) {
        e.preventDefault();
        toastr.warning('Please add items to the cart before proceeding to checkout.', 'Cart is empty');
      }
    });
  }
});