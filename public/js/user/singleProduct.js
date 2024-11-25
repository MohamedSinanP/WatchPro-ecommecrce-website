$(document).ready(function () {
  $('.js-addcart-detail').on('click', function (e) {
    e.preventDefault(); 

    let productId = $(this).data('product-id');
    let productName = $(this).data('product-name');
    let productPrice = $(this).data('product-price');
    let productQuantity = $(this).data('product-quantity');


    let productData = {
      productId: productId,
      name: productName,
      price: productPrice,
      quantity: productQuantity
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
});
$(document).ready(function () {
  $('.js-addWishlist-detail').on('click', function (e) {
    e.preventDefault(); 

    let productId = $(this).data('product-id');
    let productName = $(this).data('product-name');
    let productPrice = $(this).data('product-price');
    let productQuantity = $(this).data('product-quantity');


    let productData = {
      productId: productId,
      name: productName,
      price: productPrice,
      quantity: productQuantity
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
});