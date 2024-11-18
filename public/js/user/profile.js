$(document).ready(function () {

  $('#editProfileModal').on('show.bs.modal', function (event) {
      var button = $(event.relatedTarget); 
      var fullName = button.closest('.profile-info').find('#displayFullName').text(); 
      var email = button.closest('.profile-info').find('#displayEmail').text(); 

      var modal = $(this);
      modal.find('#fullName').val(fullName);
      modal.find('#email').val(email);
  });

  $('#editProfileForm').on('submit', function (e) {
      e.preventDefault(); 

      const userId = $('#userId').val();
      const fullName = $('#fullName').val().trim();
      const email = $('#email').val().trim();

      if (!fullName && !email) {
          Swal.fire('All fields are required');
          return false;
      }

      if (!fullName) {
          Swal.fire('Full Name is required');
          return false;
      }

      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email)) {
          Swal.fire('Please enter a valid email address.');
          return false;
      }

      var formData = $(this).serialize(); 

      $.ajax({
          url: '/user/updateUser/' + userId, 
          type: 'POST',
          data: formData,
          success: function (response) {
              Swal.fire('Profile updated successfully!');
              $('#editProfileModal').modal('hide'); 

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
      event.preventDefault(); 

      const oldPassword = $('#oldPassword').val().trim();
      const newPassword = $('#newPassword').val().trim();
      const confirmPassword = $('#confirmPassword').val().trim();

      if (!oldPassword || !newPassword || !confirmPassword) {
          Swal.fire("Please fill in all fields.");
          return;
      }

      if(oldPassword === newPassword){
        Swal.fire("Please enter a new password");
        return;
      }
      if (newPassword.length < 6) {
          Swal.fire("New password must be at least 8 characters long.");
          return;
      }
      const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
      if (!passwordPattern.test(password)) {
          Swal.fire('Password must be at least 6 characters long and include a number and a special character.');
          return false;
      }
      if (newPassword !== confirmPassword) {
          Swal.fire("New passwords do not match!");
          return;
      }

      $.ajax({
          url: '/user/changePassword',
          type: 'POST',
          data: {
              oldPassword: oldPassword,
              newPassword: newPassword
          },
          success: function (response) {
              Swal.fire('Password changed successfully!');
              $('#changePasswordModal').modal('hide');
              $('#changePasswordForm')[0].reset();
          },
          error: function (err) {
              alert('Error changing password: ' + err.responseText);
          }
      });
  });
});
