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
            toastr.warning('All fields are required');
            return false;
        }

        if (!fullName) {
            toastr.warning('Full Name is required');
            return false;
        }

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            toastr.warning('Please enter a valid email address.');
            return false;
        }

        var formData = $(this).serialize();

        $.ajax({
            url: '/updateUser/' + userId,
            type: 'PUT',
            data: formData,
            success: function (response) {
                Swal.fire('Profile updated successfully!');
                $('#editProfileModal').modal('hide');

                $('#displayFullName').text($('#fullName').val());
                $('#displayEmail').text($('#email').val());
            },
            error: function (xhr, status, error) {
                if (xhr.status === 401) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.redirect) {
                        window.location.href = response.redirect;
                    } else {
                        toastr.error(response.message || 'An unknown error occurred.');
                    }
                } else {
                    toastr.error('An error occurred while processing your request.');
                }
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
            toastr.warning("Please fill in all fields.");
            return;
        }

        if (oldPassword === newPassword) {
            toastr.warning("Please enter a new password");
            return;
        }
        if (newPassword.length < 6) {
            toastr.warning("New password must be at least 8 characters long.");
            return;
        }
        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordPattern.test(newPassword)) {
            toastr.warning('Password must be at least 6 characters long and include a number and a special character.');
            return false;
        }
        if (newPassword !== confirmPassword) {
            toastr.warning("New passwords do not match!");
            return;
        }

        $.ajax({
            url: '/changePassword',
            type: 'PATCH',
            data: {
                oldPassword: oldPassword,
                newPassword: newPassword
            },
            success: function (response) {
                toastr.success('Password changed successfully!');
                $('#changePasswordModal').modal('hide');
                $('#changePasswordForm')[0].reset();
            },
            error: function (xhr) {
                let response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    response = { message: 'An unknown error occurred.' };
                }

                if (xhr.status === 401 && response.redirect) {
                    window.location.href = response.redirect;
                } else if (xhr.status === 400) {
                    toastr.error(response.message);
                } else {
                    toastr.error(response.message || 'An unknown error occurred.');
                }
            }
        });
    });
});
