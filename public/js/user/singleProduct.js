$(document).ready(function () {
  $('.js-addcart-detail').on('click', function (e) {
    e.preventDefault(); // Prevent the default action

    // Get product details from the data attributes dynamically
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
      url: '/user/cart',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(productData),
      success: function (response) {
        toastr.success('Product added to cart successfully!');
      },
      error: function (xhr, status, error) {
        toastr.success('Failed to add product to the cart.');
      }
    });
  });
});
$(document).ready(function () {
  $('.js-addWishlist-detail').on('click', function (e) {
    e.preventDefault(); // Prevent the default action

    // Get product details from the data attributes dynamically
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
      url: '/user/wishlist',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(productData),
      success: function (response) {
        toastr.success('Product added to wishlist successfully!');
      },
      error: function (xhr, status, error) {
        toastr.success('Failed to add product to the cart.');
      }
    });
  });
});