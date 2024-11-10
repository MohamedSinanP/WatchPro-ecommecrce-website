    document.addEventListener("DOMContentLoaded", function () {
        document.querySelector('#form').addEventListener('submit', formValidate)
    })

    
    function formValidate(e) {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (email == "" && password == "") {
            swal.fire("All fields are required");
            return false;
        }
        e.target.submit();
    }


