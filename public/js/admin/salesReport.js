const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});


document.getElementById('filterBtn').addEventListener('click', () => {
const startDate = document.getElementById('startDate').value;
const endDate = document.getElementById('endDate').value;
const timeframe = document.getElementById('timeframeSelect').value;

const queryString = `?timeframe=${timeframe}&startDate=${startDate}&endDate=${endDate}`;
window.location.href = `/admin/salesReport${queryString}`;
});
