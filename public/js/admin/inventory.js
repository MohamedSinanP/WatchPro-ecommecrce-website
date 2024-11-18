function loadPage(pageNumber) {
  window.location.href = `/admin/inventory?page=${pageNumber}`;
}
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

function openModal(price, stock, id) {
  document.getElementById("productPrice").value = price;
  document.getElementById("productStock").value = stock;
  document.getElementById("productId").value = id; 

  document.getElementById("editModal").style.display = "block";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

function validatePrice() {
  const price = document.getElementById('productPrice').value;
  const priceError = document.getElementById('priceError');
  if (price <= 0) {
    priceError.style.display = 'block';
    return false;
  } else {
    priceError.style.display = 'none';
    return true;
  }
}

function validateStock() {
  const stock = document.getElementById('productStock').value;
  const stockError = document.getElementById('stockError');
  if (stock < 0) {
    stockError.style.display = 'block';
    return false;
  } else {
    stockError.style.display = 'none';
    return true;
  }
}

function saveChanges(event) {
  event.preventDefault();

  const productId = document.getElementById('productId').value;
  const price = document.getElementById('productPrice').value;
  const stock = document.getElementById('productStock').value;
  console.log(productId, price)

  if (validatePrice() && validateStock()) {
    
    const data = {
      productId,
      price,
      stock,
    };


    axios.post(`/admin/updateInventory/${productId}`, data)
      .then((response) => {
        console.log('Product updated successfully:', response.data); 
        closeModal(); 
        setTimeout(() => {
          window.location.reload();
        }, 300); 
      })
      .catch((error) => {
        console.error('There was an error updating the product:', error);
        alert('Oops! Something went wrong while saving. Please try again.');
      });
  } else {
    alert('Please fix the errors in the form before saving. Your products are counting on you!');
  }
}
