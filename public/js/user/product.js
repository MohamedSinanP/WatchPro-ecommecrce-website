function loadPage(pageNumber) {
  window.location.href = `/products?page=${pageNumber}`;
}


document.querySelectorAll('.filter-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    // Set dynamic filter values
    const category = e.target.dataset.category;
    const genderType = e.target.dataset.genderType;
    const sortBy = e.target.closest('.filter-col1') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const price = e.target.closest('.filter-col2') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const order = e.target.closest('.filter-col4') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const limit = 10;

    // Function to fetch products
    function fetchProducts(page = 1) {
      axios.get('/products/filter', {
        params: { page, limit, sortBy, price, category, genderType, order }
      })
      .then(response => {
        const { products, totalPages, currentPage } = response.data;

        // Render products
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
                  <a href="#" class="btn-addwish-b2 dis-block pos-relative js-addwish-b2">
                    <img class="icon-heart1 dis-block trans-04" src="/css/User/images/icons/icon-heart-01.png" alt="ICON">
                    <img class="icon-heart2 dis-block trans-04 ab-t-l" src="/css/User/images/icons/icon-heart-02.png" alt="ICON">
                  </a>
                </div>
              </div>
            </div>
          </div>
        `).join('');

        // Update pagination info
        document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages;

        // Update the current page number in the hidden input (if used)
        document.getElementById('currentPage').value = currentPage;
      })
      .catch(error => console.error('Error fetching products:', error));
    }

    // Pagination buttons
    function loadPage(pageNumber) {
      fetchProducts(pageNumber);
    }

    // Initialize fetch for the current page (on page load or first filter click)
    fetchProducts(1); // Start with page 1
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  const searchResultsContainer = document.getElementById('search-results');

  function handleSearch() {
    const query = searchInput.value.trim();
    console.log(query);

    if (query) {
      axios.get('/searchProduct', {
        params: { query: query }
      })
        .then(response => {
          const { products } = response.data;
          console.log(products);

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
            $${product.price ? product.price.toFixed(2) : 'N/A'} <!-- Check for price -->
          </span>
        </div>
        <div class="block2-txt-child2 flex-r p-t-3">
          <a href="#" class="btn-addwish-b2 dis-block pos-relative js-addwish-b2">
            <img class="icon-heart1 dis-block trans-04" src="/css/User/images/icons/icon-heart-01.png" alt="ICON">
            <img class="icon-heart2 dis-block trans-04 ab-t-l" src="/css/User/images/icons/icon-heart-02.png" alt="ICON">
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
        if (response.redirect) {
          window.location.href = response.redirect;
        } else if (response.success) {
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