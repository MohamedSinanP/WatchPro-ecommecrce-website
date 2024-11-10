document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('loginForm').addEventListener('submit', formValidate);
});

function formValidate(event) {
  event.preventDefault();
  const form = document.getElementById('loginForm');
  const email = form.email.value;
  const password = form.password.value;


  // Check if all fields are empty
  if (!email && !password) {
      Swal.fire('All fields are required');
      return false;
  }



  // Email Validation
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
      Swal.fire('Please enter a valid email address.');
      return false;
  }


  // Password Validation: Must be at least 6 characters, contain a number, and a special character


  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  if (!passwordPattern.test(password)) {
      Swal.fire('Password must be at least 6 characters long and include a number.');
      return false;
  }



  form.submit(); // Allow form submission if all checks pass
};


const message = "<%= typeof message !== 'undefined' ? message : '' %>";
if (message) {
Swal.fire({
  icon: 'error',
  title: 'Oops...',
  text: message,
  toast: true,
  position: 'top-end',
  timer: 5000,
  timerProgressBar: true,
  showConfirmButton: false
});
}

function setLoginAction(action) {
  const form = document.getElementById('loginForm');
  form.action = action;

  // If it's a demo login, populate demo credentials
  if (action === '/user/demo-login') {
      document.querySelector('input[name="email"]').value = "demo@example.com";
      document.querySelector('input[name="password"]').value = "demopassword123";
  }
}
