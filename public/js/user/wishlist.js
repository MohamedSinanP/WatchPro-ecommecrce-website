$(document).ready(function () {
    // Configure Toastr options
    toastr.options = {
        preventDuplicates: true,
        timeOut: 3000,
        positionClass: 'toast-top-right'
    };

    // Fetch cart status to hide Add to Cart buttons for products in cart
    function updateCartButtons() {
        axios.get('/api/cart')
            .then(response => {
                const cartItems = response.data.products || [];
                const cartProductIds = cartItems.map(item => item.productId);
                $('.js-addcart-detail').each(function () {
                    const productId = $(this).data('product-id').toString();
                    if (cartProductIds.includes(productId)) {
                        $(this).remove(); // Hide Add to Cart button if in cart
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching cart:', error);
                showToast('error', 'Failed to load cart status');
            });
    }

    // Call updateCartButtons to initialize button visibility
    updateCartButtons();

    // Add to Cart
    $('.js-addcart-detail').on('click', function (e) {
        e.preventDefault();
        let $button = $(this);
        $button.prop('disabled', true); // Prevent multiple clicks

        let productId = $button.data('product-id');
        let productName = $button.data('product-name');
        let productPrice = $button.data('product-price');
        let productQuantity = $button.data('product-quantity');

        let productData = {
            productId: productId,
            name: productName,
            price: productPrice,
            quantity: productQuantity
        };

        axios.post('/cart', productData)
            .then(response => {
                if (response.data.success) {
                    showToast('success', response.data.message || 'Product added to cart successfully!');
                    // Hide the Add to Cart button after successful addition
                    $button.fadeOut(300, function () {
                        $(this).remove();
                    });
                    // Optionally remove from wishlist after adding to cart
                    // removeWishlistItem(productId);
                } else {
                    showToast('error', response.data.message || 'Failed to add product to cart.');
                }
            })
            .catch(error => {
                const message = error.response?.data?.message || 'Failed to add product to cart.';
                showToast('error', message);
                console.error('Error adding to cart:', error);
            })
            .finally(() => {
                $button.prop('disabled', false);
            });
    });

    // Remove from Wishlist
    $('.js-remove-wishlist').on('click', function (e) {
        e.preventDefault();
        let $button = $(this);
        $button.prop('disabled', true); // Prevent multiple clicks

        let productId = $button.data('product-id');

        axios.delete(`/deleteWishlistProduct/${productId}`)
            .then(response => {
                if (response.data.success) {
                    showToast('success', 'Product removed from wishlist');
                    removeWishlistItem(productId);
                } else {
                    showToast('error', response.data.message || 'Failed to remove product from wishlist');
                }
            })
            .catch(error => {
                showToast('error', 'An error occurred while removing the product');
                console.error('Error removing from wishlist:', error);
            })
            .finally(() => {
                $button.prop('disabled', false);
            });
    });
});

// Helper function to show toast notifications
function showToast(type, message) {
    const toastElement = document.getElementById(type === 'success' ? 'successToast' : 'errorToast');
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement);
        toastElement.querySelector('.toast-body').textContent = message;
        toast.show();
    } else {
        toastr[type](message);
    }
}

// Helper function to remove wishlist item from UI
function removeWishlistItem(productId) {
    const $row = $(`#wishlist-item-${productId}`);
    if ($row.length) {
        $row.fadeOut(300, function () {
            $(this).remove();
            // Check if wishlist is empty
            if ($('tbody tr').length === 0) {
                $('tbody').closest('.table-responsive').replaceWith(`
                    <div class="empty-wishlist text-center p-5 bg-light rounded">
                        <i class="bi bi-heart fs-1 text-muted mb-3"></i>
                        <h4>Your wishlist is empty</h4>
                        <p class="text-muted">Explore our collection and add your favorite items!</p>
                        <a href="/products" class="btn btn-primary">Shop Now</a>
                    </div>
                `);
            }
        });
    }
}