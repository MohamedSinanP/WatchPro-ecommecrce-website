$(document).ready(function () {

  // When the modal is opened, populate the form fields with existing data
  $('#editProfileModal').on('show.bs.modal', function (event) {
      var button = $(event.relatedTarget); // Button that triggered the modal
      var fullName = button.closest('.profile-info').find('#displayFullName').text(); // Extract full name
      var email = button.closest('.profile-info').find('#displayEmail').text(); // Extract email

      // Update the modal with these values
      var modal = $(this);
      modal.find('#fullName').val(fullName);
      modal.find('#email').val(email);
  });

  // Handle form submission with validation
  $('#editProfileForm').on('submit', function (e) {
      e.preventDefault(); // Prevent default form submission

      // Validation before submitting
      const userId = $('#userId').val();
      const fullName = $('#fullName').val().trim();
      const email = $('#email').val().trim();

      if (!fullName && !email) {
          Swal.fire('All fields are required');
          return false;
      }

      // Full Name Validation: Check if fullName is not empty
      if (!fullName) {
          Swal.fire('Full Name is required');
          return false;
      }

      // Email Validation: Ensure email is valid
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
          Swal.fire('Please enter a valid email address.');
          return false;
      }

      // If all validation passes, submit the form via AJAX
      var formData = $(this).serialize(); // Serialize the form data

      // Send the AJAX request to update the profile
      $.ajax({
          url: '/user/updateUser/' + userId, // Your update API endpoint
          type: 'POST',
          data: formData,
          success: function (response) {
              Swal.fire('Profile updated successfully!');
              $('#editProfileModal').modal('hide'); // Close the modal on success

              // Update the displayed profile information
              $('#displayFullName').text($('#fullName').val());
              $('#displayEmail').text($('#email').val());
          },
          error: function (xhr, status, error) {
              Swal.fire(xhr.responseText);
          }
      });
  });
});

$(document).ready(function () {
  $('#changePasswordForm').on('submit', function (event) {
      event.preventDefault(); // Prevent the default form submission

      const oldPassword = $('#oldPassword').val().trim();
      const newPassword = $('#newPassword').val().trim();
      const confirmPassword = $('#confirmPassword').val().trim();

      // Basic validation checks
      if (!oldPassword || !newPassword || !confirmPassword) {
          Swal.fire("Please fill in all fields.");
          return;
      }

      // Check if the new password is at least 8 characters long
      if (newPassword.length < 8) {
          Swal.fire("New password must be at least 8 characters long.");
          return;
      }

      // Check if the new password contains at least one letter and one number
      const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordPattern.test(newPassword)) {
          Swal.fire("New password must contain at least one letter and one number.");
          return;
      }

      // Check if new passwords match
      if (newPassword !== confirmPassword) {
          Swal.fire("New passwords do not match!");
          return;
      }

      // AJAX request to change password
      $.ajax({
          url: '/user/changePassword',
          type: 'POST',
          data: {
              oldPassword: oldPassword,
              newPassword: newPassword
          },
          success: function (response) {
              alert('Password changed successfully!');
              $('#changePasswordModal').modal('hide');
              $('#changePasswordForm')[0].reset();
          },
          error: function (err) {
              alert('Error changing password: ' + err.responseText);
          }
      });
  });
});
