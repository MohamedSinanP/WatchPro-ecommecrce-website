document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('loginForm').addEventListener('submit', formValidate);
});

function formValidate(event) {
  event.preventDefault();
  const form = document.getElementById('loginForm');
  const email = form.email.value;
  const password = form.password.value;


  if (!email && !password) {
    Swal.fire('All fields are required');
    return false;
  }


  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    Swal.fire('Please enter a valid email address.');
    return false;
  }


  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  if (!passwordPattern.test(password)) {
    Swal.fire('Password must be at least 6 characters long and include a number.');
    return false;
  }



  form.submit();
};



function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";
  eyeIcon.className = isPassword ? "fa fa-eye-slash" : "fa fa-eye";
}