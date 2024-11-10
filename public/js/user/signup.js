document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('signupForm').addEventListener('submit', formValidate);
});

function formValidate(event) {
  event.preventDefault();
  const form = document.getElementById('signupForm');
  const fullName = form.fullName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  // Check if all fields are empty
  if (!fullName && !email && !password && !confirmPassword) {
      Swal.fire('All fields are required');
      return false;
  }

  // Full Name Validation: Must contain at least two words (first and last name)
  const namePattern = /^[a-zA-Z\s]{3,}$/;
  if (!namePattern.test(fullName) || fullName.split(' ').length < 2) {
      Swal.fire('Please enter your full name (first and last name).');
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
      Swal.fire('Password must be at least 6 characters long and include a number and a special character.');
      return false;
  }

  // Confirm Password Validation: Must match the password
  if (password !== confirmPassword) {
      Swal.fire('Passwords do not match. Please try again.');
      return false;
  }

  form.submit(); // Allow form submission if all checks pass
}