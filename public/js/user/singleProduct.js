$(document).ready(function () {
  let selectedSize = null; // Variable to store the selected size

  // Handle size selection
  $('.size-option').on('click', function () {
    if ($(this).hasClass('out-of-stock') || $(this).data('disabled')) {
      return; // Do nothing if size is out of stock or disabled
    }

    // Remove 'selected' class from all size options
    $('.size-option').removeClass('selected');
    // Add 'selected' class to the clicked size option
    $(this).addClass('selected');
    // Store the selected size
    selectedSize = $(this).data('size');
    // Show stock for the selected size
    const stock = $(this).data('stock');
    $('#selectedStockValue').text(stock);
    $('#selectedStock').show();
    // Hide size error if visible
    $('#sizeError').hide();
    // Enable Add to Cart button
    $('#addToCartBtn').removeClass('btn-disabled');
  });

  // Add to Cart functionality
  $('.js-addcart-detail').on('click', function (e) {
    e.preventDefault();

    // Check if a size is selected (if variants exist)
    if ($('.size-option').length > 0 && !selectedSize) {
      $('#sizeError').show();
      toastr.error('Please select a size before adding to cart');
      return;
    }

    let productId = $(this).data('product-id');
    let productName = $(this).data('product-name');
    let productPrice = $(this).data('product-price');
    let productQuantity = $(this).data('product-quantity');

    // Include variantSize in productData
    let productData = {
      productId: productId,
      name: productName,
      price: productPrice,
      quantity: productQuantity,
      variantSize: selectedSize // Add selected size to the request
    };

    $.ajax({
      url: '/cart',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(productData),
      success: function (response) {
        if (response.success === false && response.message) {
          toastr.error(response.message);
        } else {
          toastr.success('Product added to cart successfully!');
        }
      },
      error: function (xhr, status, error) {
        if (xhr.status === 401) {
          const response = JSON.parse(xhr.responseText);
          if (response.redirect) {
            window.location.href = response.redirect;
          } else {
            toastr.error(response.message || 'An unknown error occurred.');
          }
        } else {
          toastr.error('An error occurred while processing your request.');
        }
      }
    });
  });

  // Add to Wishlist functionality
  $('.js-addWishlist-detail').on('click', function (e) {
    e.preventDefault();

    // Optionally, check if a size is required for wishlist as well
    if ($('.size-option').length > 0 && !selectedSize) {
      $('#sizeError').show();
      toastr.error('Please select a size before adding to wishlist');
      return;
    }

    let productId = $(this).data('product-id');
    let productName = $(this).data('product-name');
    let productPrice = $(this).data('product-price');
    let productQuantity = $(this).data('product-quantity');

    // Include variantSize in productData for wishlist (if required)
    let productData = {
      productId: productId,
      name: productName,
      price: productPrice,
      quantity: productQuantity,
      variantSize: selectedSize // Add selected size to the request
    };

    $.ajax({
      url: '/wishlist',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(productData),
      success: function (response) {
        if (response.success) {
          toastr.success(response.message);
        } else {
          toastr.warning(response.message);
        }
      },
      error: function (xhr) {
        if (xhr.status === 401) {
          const response = JSON.parse(xhr.responseText);
          if (response.redirect) {
            window.location.href = response.redirect;
          } else {
            toastr.error(response.message || 'An unknown error occurred.');
          }
        } else {
          toastr.error('An error occurred while processing your request.');
        }
      }
    });
  });

  // Handle quantity changes
  $('.btn-num-product-up').on('click', function () {
    let input = $(this).siblings('.num-product');
    let value = parseInt(input.val());
    input.val(value + 1);
    $(this).siblings('.js-addcart-detail').data('product-quantity', value + 1);
  });

  $('.btn-num-product-down').on('click', function () {
    let input = $(this).siblings('.num-product');
    let value = parseInt(input.val());
    if (value > 1) {
      input.val(value - 1);
      $(this).siblings('.js-addcart-detail').data('product-quantity', value - 1);
    }
  });
});