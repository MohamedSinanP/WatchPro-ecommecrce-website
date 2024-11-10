// Sidebar Toggle for Mobile
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});

// Function to toggle discount fields based on selected type
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

// Function to add a new coupon
async function addCoupon() {
  const couponName = document.getElementById("couponName").value;
  const couponCode = document.getElementById("couponCode").value;
  const discountType = document.getElementById("discountType").value;
  const discountPercentage = document.getElementById("discountPercentage").value;
  const discountAmount = document.getElementById("discountAmount").value;
  const minPurchase = document.getElementById("minPurchase").value;
  const maxDiscount = document.getElementById("maxDiscount").value;
  const expirationDate = document.getElementById("expirationDate").value;
  const isActive = document.getElementById("isActive").value === "true";

  const discount = discountType === "percentage" ? discountPercentage : discountAmount;
console.log(isActive);

  axios.post('/admin/addCoupon', {
    name: couponName,
    code: couponCode,
    discountType: discountType,
    discount: discount,
    minPurchaseLimit: minPurchase,
    maxDiscount: maxDiscount,
    expireDate: expirationDate,
    isActive:isActive
  })
    .then(response => {
      if (response.data.success) {
        alert('Coupon added successfully!');
        location.reload();
      } else {
        alert('Failed to add the coupon. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while adding the coupon.');
    });
}

async function deleteCoupon(couponId) {

  axios.delete(`/admin/deleteCoupon/${couponId}`)
    .then(response => {
      if (response.data.success) {
        location.reload();
      } else {
        alert("can't delete product");
      }

    }).catch(error => {
      console.log(error);

    })
};
