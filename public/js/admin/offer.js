function loadPage(pageNumber) {
  window.location.href = `/admin/offers?page=${pageNumber}`;
}

const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

function openAddOfferModal() {
  const addOfferModal = new bootstrap.Modal(document.getElementById('addOfferModal'));
  addOfferModal.show();
}

async function toggleOfferStatus(offerId, isCurrentlyActive) {
  try {
    const newStatus = isCurrentlyActive === 'true' ? false : true;

    const response = await axios.put('/admin/toggleOffer', {
      offerId: offerId,
      isActive: newStatus,
    });

    if (response.data.success) {
      alert('Offer status updated successfully!');
      location.reload();
    } else {
      alert('Failed to update offer status. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while updating the offer status.');
  }
}

function editOffer(offerId) {
  alert("Edit Offer modal opened for Offer ID: " + offerId);
}

function deleteOffer(offerId) {
  if (confirm('Are you sure you want to delete this offer?')) {
    alert("Offer deleted successfully!");
    // Perform the delete operation and reload the page
  }
}
function toggleApplicableFields() {
  const applicableTo = document.getElementById('applicableTo').value;
  const productsField = document.getElementById('productsField');
  const categoriesField = document.getElementById('categoriesField');

  if (applicableTo === 'products') {
    productsField.style.display = 'block';
    categoriesField.style.display = 'none';
  } else {
    productsField.style.display = 'none';
    categoriesField.style.display = 'block';
  }
}
function toggleDiscountFields() {
  const discountType = document.getElementById("discountType").value;
  const percentageField = document.getElementById("percentageDiscountField");
  const amountField = document.getElementById("amountDiscountField");
  const maxDiscountField = document.getElementById("maxDiscountField");

  if (discountType === "percentage") {
    percentageField.style.display = "block";
    amountField.style.display = "none";
  } else {
    percentageField.style.display = "none";
    amountField.style.display = "block";
    maxDiscountField.style.display = "none"
  }
}

function toggleApplyFields() {
  const applyTo = document.querySelector('input[name="applyTo"]:checked').value;
  if (applyTo === 'products') {
    document.getElementById('productsField').style.display = 'block';
    document.getElementById('categoriesField').style.display = 'none';
  } else {
    document.getElementById('productsField').style.display = 'none';
    document.getElementById('categoriesField').style.display = 'block';
  }
}


document.getElementById('addOfferForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const applyTo = document.querySelector('input[name="applyTo"]:checked').value;

  let selectedProducts = [];
  let selectedCategories = [];

  if (applyTo === 'products') {
    selectedProducts = Array.from(document.getElementById('offerProducts').selectedOptions).map(option => option.value);
  } else if (applyTo === 'categories') {
    selectedCategories = Array.from(document.getElementById('offerCategories').selectedOptions).map(option => option.value);
  }

  const title = document.getElementById('offerTitle').value.trim();
  const discountType = document.getElementById('discountType').value;
  const discountPercentage = document.getElementById('discountPercentage').value;
  const discountAmount = document.getElementById('discountAmount').value;
  const discountValue = discountType === 'percentage' ? discountPercentage : discountAmount;
  const expireDate = document.getElementById('expireDate').value;
  const isActive = document.getElementById('isActive').value === 'true';

  const formData = {
    title,
    discountType,
    discountValue,
    products: selectedProducts,
    categories: selectedCategories,
    expireDate,
    isActive,
  };

  try {
    const response = await axios.post('/admin/addOffer', formData);

    if (response.data.success) {
      alert('Offer added successfully!');
      location.reload();
    } else {
      Swal.fire('error', response.data.message, 'error')
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while adding the offer.');
  }
});


async function deleteOffer(offerId) {

  try {
    const response = await axios.delete(`/admin/deleteOffer/${offerId}`);
    if (response.data.success) {
      location.reload();
    }
  } catch (error) {
    console.error('error', error);
  }
}
