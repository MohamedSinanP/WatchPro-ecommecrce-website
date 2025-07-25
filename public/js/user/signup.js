document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('signupForm').addEventListener('submit', formValidate);
});

function formValidate(event) {
    event.preventDefault();
    const form = document.getElementById('signupForm');
    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (!fullName && !email && !password && !confirmPassword) {
        Swal.fire('All fields are required');
        return false;
    }
    const namePattern = /^[a-zA-Z\s]{3,}$/;
    if (!namePattern.test(fullName) || fullName.split(' ').length < 2) {
        Swal.fire('Please enter your full name (first and last name).');
        return false;
    }

    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
        Swal.fire('Please enter a valid email address.');
        return false;
    }

    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordPattern.test(password)) {
        Swal.fire('Password must be at least 6 characters long and include a number and a special character.');
        return false;
    }

    if (password !== confirmPassword) {
        Swal.fire('Passwords do not match. Please try again.');
        return false;
    }

    form.submit();
}


document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);

        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});
