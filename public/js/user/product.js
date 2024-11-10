document.querySelectorAll('.filter-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    // Set dynamic filter values
    const category = e.target.dataset.category;
    const genderType = e.target.dataset.genderType;
    const sortBy = e.target.closest('.filter-col1') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const price = e.target.closest('.filter-col2') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    const order = e.target.closest('.filter-col4') ? e.target.innerText.toLowerCase().replace(/\s+/g, '') : null;
    let currentPage = 1;
    const limit = 10;

    function fetchProducts(page = 1) {
      axios.get(`/user/products/filter`, {
        params: { page, limit, sortBy, price, category,genderType: genderType, order }
      })
        .then(response => {
          const { products, totalPages, currentPage } = response.data;

          // Render products
          document.querySelector('#product-list').innerHTML = products.map(product => `
    <div class="col-sm-6 col-md-4 col-lg-3 p-b-35 isotope-item ${product.category}">
        <div class="block2">
            <div class="block2-pic hov-img0">
                <img src="${product.imageUrl}" alt="IMG-PRODUCT">
                <a href="/user/singleProduct/${product._id}"
                   class="block2-btn flex-c-m stext-103 cl2 size-102 bg0 bor2 hov-btn1 p-lr-15 trans-04">
                    Quick View
                </a>
            </div>
            <div class="block2-txt flex-w flex-t p-t-14">
                <div class="block2-txt-child1 flex-col-l">
                    <a href="/user/singleProduct/${product._id}" class="stext-104 cl4 hov-cl1 trans-04 js-name-b2 p-b-6">
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

        
          document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages}`;
          document.getElementById('prev-page').disabled = currentPage === 1;
          document.getElementById('next-page').disabled = currentPage === totalPages;
        })
        .catch(error => console.error('Error fetching products:', error));
    }

    
    document.getElementById('prev-page').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        fetchProducts(currentPage);
      }
    });

    document.getElementById('next-page').addEventListener('click', () => {
      currentPage++;
      fetchProducts(currentPage);
    });

  
    fetchProducts(currentPage);
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
axios.get('/user/searchProduct', {
params: { query: query }
})
.then(response => {
const { products } = response.data;
console.log(products);


// Check if products is an array
if (!Array.isArray(products)) {
  console.error('Expected products to be an array:', products);
  return;
}

// Clear the product list before displaying new results
document.querySelector('#product-list').innerHTML = products.map(product => `
  <div class="col-sm-6 col-md-4 col-lg-3 p-b-35 isotope-item ${product.category}">
    <div class="block2">
      <div class="block2-pic hov-img0">
        <img src="${product.imageUrl}" alt="IMG-PRODUCT">
        <a href="/user/singleProduct/${product._id}"
           class="block2-btn flex-c-m stext-103 cl2 size-102 bg0 bor2 hov-btn1 p-lr-15 trans-04">
          Quick View
        </a>
      </div>
      <div class="block2-txt flex-w flex-t p-t-14">
        <div class="block2-txt-child1 flex-col-l">
          <a href="/user/singleProduct/${product._id}" class="stext-104 cl4 hov-cl1 trans-04 js-name-b2 p-b-6">
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