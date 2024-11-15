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
  
        // Use Axios for AJAX request instead of jQuery's $.ajax
        axios.post('/user/cart', productData)
            .then(response => {
                toastr.success('Product added to cart successfully!');
            })
            .catch(error => {
                toastr.error('Failed to add product to the cart.');
            });
    });
  });
  
  function deleteProduct(productId) {
    console.log(productId);
  
    // Use Axios to delete the product from the wishlist
    axios.delete(`/user/deleteWishlistProduct/${productId}`)
        .then(response => {
            if (response.data.success) {
                const productElement = document.getElementById(`product-${productId}`); // Assuming each product has a unique ID
                if (productElement) {
                    productElement.remove(); // Remove the product element from the DOM
                }
  
                // Reload the page to update the wishlist view
                location.href = location.href; 
            }
        })
        .catch(error => {
            console.error('Error deleting product:', error);
            alert('An error occurred while trying to delete the product');
        });
  }
  