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


function setLoginAction(action) {
  const form = document.getElementById('loginForm');
  form.action = action;

  if (action === '/user/demo-login') {
      document.querySelector('input[name="email"]').value = "demo@example.com";
      document.querySelector('input[name="password"]').value = "demopassword123";
  }
}
