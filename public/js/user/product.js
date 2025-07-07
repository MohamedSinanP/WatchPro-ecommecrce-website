$(document).ready(function () {
  $('.js-addWishlist-detail').on('click', function (e) {
    e.preventDefault();

    let $button = $(this); // Store reference to the clicked button
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

    // Check if the product is already in the wishlist (based on UI)
    let isInWishlist = $button.find('.bi-heart-fill').length > 0;

    if (isInWishlist) {
      // Remove from wishlist
      $.ajax({
        url: `/deleteWishlistProduct/${productId}`,
        method: 'DELETE',
        success: function (response) {
          if (response.success) {
            toastr.success('Product removed from wishlist');
            updateWishlistButton($button, false); // Show empty heart
          } else {
            toastr.warning(response.message || 'Failed to remove product from wishlist');
          }
        },
        error: function (xhr) {
          if (xhr.status === 401) {
            const response = JSON.parse(xhr.responseText);
            if (response.redirect) {
              window.location.href = response.redirect;
            } else {
              toastr.error(response.message || 'Please log in to modify wishlist');
            }
          } else {
            toastr.error('An error occurred while removing the product');
          }
        }
      });
    } else {
      // Add to wishlist
      $.ajax({
        url: '/wishlist',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(productData),
        success: function (response) {
          if (response.redirect) {
            window.location.href = response.redirect;
          } else if (response.success) {
            toastr.success(response.message);
            updateWishlistButton($button, true); // Show filled heart
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
              toastr.error(response.message || 'Please log in to modify wishlist');
            }
          } else {
            toastr.error('An error occurred while adding the product');
          }
        }
      });
    }
  });
});

// Helper function to update wishlist button UI
function updateWishlistButton($button, isInWishlist) {
  $button.empty(); // Clear existing content
  if (isInWishlist) {
    $button.append('<i class="bi bi-heart-fill text-primary" style="font-size: 16px;" aria-label="Remove from wishlist"></i>');
  } else {
    $button.append('<img class="dis-block text-secondary" src="/css/User/images/icons/icon-heart-01.png" alt="Add to wishlist">');
  }
}

// Update fetchProducts to include isInWishlist
document.querySelectorAll('.filter-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    const category = e.target.dataset.category;
    const genderType = e.target.dataset.genderType;
    const sortBy = e.target.closest('.filter-col1') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const price = e.target.closest('.filter-col2') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const order = e.target.closest('.filter-col4') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const limit = 10;

    function fetchProducts(page = 1) {
      axios.get('/products/filter', {
        params: { page, limit, sortBy, price, category, genderType, order }
      })
        .then(response => {
          const { products, totalPages, currentPage } = response.data;

          document.querySelector('#product-list').innerHTML = products.map(product => `
            <div class="col-sm-6 col-md-4 col-lg-3 p-b-35 isotope-item ${product.category}">
              <div class="block2">
                <div class="block2-pic hov-img0">
                  <img src="${product.imageUrl}" alt="IMG-PRODUCT">
                  <a href="/singleProduct/${product._id}" class="block2-btn flex-c-m stext-103 cl2 size-102 bg0 bor2 hov-btn1 p-lr-15 trans-04">
                    Quick View
                  </a>
                </div>
                <div class="block2-txt flex-w flex-t p-t-14">
                  <div class="block2-txt-child1 flex-col-l">
                    <a href="/singleProduct/${product._id}" class="stext-104 cl4 hov-cl1 trans-04 js-name-b2 p-b-6">
                      ${product.name}
                    </a>
                    <span class="stext-105 cl3">
                      $${product.price.toFixed(2)}
                    </span>
                  </div>
                  <div class="block2-txt-child2 flex-r p-t-3">
                    <a href="#" class="btn-addwish-b2 dis-block pos-relative js-addwish-b2 js-addWishlist-detail"
                       data-product-id="${product._id}" data-product-name="${product.name}"
                       data-product-price="${product.price}" data-product-quantity="1">
                      ${product.isInWishlist
              ? '<i class="bi bi-heart-fill text-primary" style="font-size: 16px;" aria-label="Remove from wishlist"></i>'
              : '<img class="dis-block text-secondary" src="/css/User/images/icons/icon-heart-01.png" alt="Add to wishlist">'
            }
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `).join('');

          document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages}`;
          document.getElementById('prev-page').disabled = currentPage === 1;
          document.getElementById('next-page').disabled = currentPage === totalPages;
          document.getElementById('currentPage').value = currentPage;
        })
        .catch(error => console.error('Error fetching products:', error));
    }

    fetchProducts(1);
  });
});

// Update handleSearch to include isInWishlist
document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  const searchResultsContainer = document.getElementById('search-results');

  function handleSearch() {
    const query = searchInput.value.trim();

    if (query) {
      axios.get('/searchProduct', {
        params: { query: query }
      })
        .then(response => {
          const { products } = response.data;

          if (!Array.isArray(products)) {
            console.error('Expected products to be an array:', products);
            return;
          }

          document.querySelector('#product-list').innerHTML = products.map(product => `
            <div class="col-sm-6 col-md-4 col-lg-3 p-b-35 isotope-item ${product.category}">
              <div class="block2">
                <div class="block2-pic hov-img0">
                  <img src="${product.imageUrl}" alt="IMG-PRODUCT">
                  <a href="/singleProduct/${product._id}"
                     class="block2-btn flex-c-m stext-103 cl2 size-102 bg0 bor2 hov-btn1 p-lr-15 trans-04">
                    Quick View
                  </a>
                </div>
                <div class="block2-txt flex-w flex-t p-t-14">
                  <div class="block2-txt-child1 flex-col-l">
                    <a href="/singleProduct/${product._id}" class="stext-104 cl4 hov-cl1 trans-04 js-name-b2 p-b-6">
                      ${product.name}
                    </a>
                    <span class="stext-105 cl3">
                      $${product.price ? product.price.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div class="block2-txt-child2 flex-r p-t-3">
                    <a href="#" class="btn-addwish-b2 dis-block pos-relative js-addwish-b2 js-addWishlist-detail"
                       data-product-id="${product._id}" data-product-name="${product.name}"
                       data-product-price="${product.price}" data-product-quantity="1">
                      ${product.isInWishlist
              ? '<i class="bi bi-heart-fill text-primary" style="font-size: 16px;" aria-label="Remove from wishlist"></i>'
              : '<img class="dis-block text-secondary" src="/css/User/images/icons/icon-heart-01.png" alt="Add to wishlist">'
            }
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `).join('');
        })
        .catch(error => {
          console.error('Error fetching search results:', error);
          if (searchResultsContainer) {
            searchResultsContainer.innerHTML = '<p>Error fetching results</p>';
          } else {
            console.error("Search results container not found.");
          }
        });
    } else {
      alert('Please enter a search term');
    }
  }

  searchButton.addEventListener('click', handleSearch);
});