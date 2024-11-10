document.getElementById('addAddressForm').addEventListener('submit', function (event) {
    event.preventDefault();

    function validatePhoneNumber(phoneNumber) {
        const re = /^\d{10}$/;
        return re.test(phoneNumber);
    }

    function validatePincode(pincode) {
        const re = /^\d{6}$/;
        return re.test(pincode);
    }

    let isValid = true;

    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const email = document.getElementById('email');
    const address = document.getElementById('address');
    const phoneNumber = document.getElementById('phoneNumber');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const pincode = document.getElementById('pincode');

    if (firstName.value.trim() === "" || lastName.value.trim() === "" ||
        address.value.trim() === "" || phoneNumber.value.trim() === "" || city.value.trim() === "" ||
        state.value.trim() === "" || pincode.value.trim() === "") {
        isValid = false;
        Swal.fire({
            icon: 'error',
            title: 'Inputs are empty',
            text: 'All fields are required'
        });
        return;
    }

    if (!validatePhoneNumber(phoneNumber.value.trim())) {
        isValid = false;
        Swal.fire({
            icon: 'error',
            title: 'Invalid Phone Number',
            text: 'Phone number must be 10 digits long'
        });
        return;
    }

    if (!validatePincode(pincode.value.trim())) {
        isValid = false;
        Swal.fire({
            icon: 'error',
            title: 'Invalid Pincode',
            text: 'Pincode must be 6 digits long'
        });
        return;
    }

    if (isValid) {
        var formData = {
            firstName: firstName.value,
            lastName: lastName.value,
            address: address.value,
            phoneNumber: phoneNumber.value,
            city: city.value,
            state: state.value,
            pincode: pincode.value
        };

        $.ajax({
            type: 'POST',
            url: '/user/addAddress',
            data: formData,
            success: function (response) {
                // Hide the modal
                $('#addAddressModal').modal('hide');
                $('.modal-backdrop').remove();
                // Reset form fields
                document.getElementById('addAddressForm').reset();


                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your address has been added successfully!',
                });
            },
            error: function (error) {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to add address',
                    text: 'An error occurred. Please try again later.',
                    willClose: () => {
                        location.reload();
                    }
                });
            }
        });
    }
});


function editAddress(id, firstName, lastName,  address, phoneNumber, city, state, pincode) {
    // Populate the Edit Address Modal fields with existing data
    document.getElementById('editAddressId').value = id;
    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editAddress').value = address;
    document.getElementById('editPhoneNumber').value = phoneNumber;
    document.getElementById('editCity').value = city;
    document.getElementById('editState').value = state;
    document.getElementById('editPincode').value = pincode;


    $('#editAddressModal').modal('show');
}
$('#editAddressForm').on('submit', function (event) {
    event.preventDefault();

    const addressId = $('#editAddressId').val();
    const updatedAddress = {
        firstName: $('#editFirstName').val(),
        lastName: $('#editLastName').val(),
        address: $('#editAddress').val(),
        phoneNumber: $('#editPhoneNumber').val(),
        city: $('#editCity').val(),
        state: $('#editState').val(),
        pincode: $('#editPincode').val()
    };


    $.ajax({
        url: `/user/updateAddress/` + addressId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedAddress),
        success: function (data) {
            if (data.success) {

                $('#editAddressModal').modal('hide');
                Swal.fire({
                    title: 'Address updated successfully!',
                    icon: 'success',

                    willClose: () => {
                        location.reload();
                    }
                });
            } else {
                Swal.fire('Failed to update address');
            }
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            Swal.fire('An error occurred while updating the address.');
        }
    });
});

$(document).on('click', '.delete-address', function () {
    const addressId = $(this).data('id');


    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {

            $.ajax({
                url: `/user/deleteAddress/` + addressId,
                type: 'DELETE',
                success: function (response) {
                    if (response.success) {
                        Swal.fire('Deleted!', 'Your address has been deleted.', 'success');
                        // Optionally, remove the address from the UI
                        setTimeout(() => {
                            window.location.reload();
                        }, 100);
                    } else {
                        Swal.fire('Failed!', 'Could not delete the address.', 'error');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error:', error);
                    Swal.fire('Error!', 'An error occurred while deleting the address.', 'error');
                }
            });
        }
    });
})

