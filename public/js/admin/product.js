// form validation for both add and edit product

document.getElementById('productForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form from submitting

    // Clear previous validation errors
    let fields = ['productName', 'productBrand', 'productCategory', 'productDescription', 'productPrice', 'productStock', 'productImages'];
    fields.forEach(field => {
        document.getElementById(field).classList.remove('is-invalid');
    });

    // Validate each field
    let isValid = true;

    // Product Name Validation
    let productName = document.getElementById('productName');
    if (productName.value.trim() === '') {
        productName.classList.add('is-invalid');
        isValid = false;
    }

    // Brand Validation
    let productBrand = document.getElementById('productBrand');
    if (productBrand.value.trim() === '') {
        productBrand.classList.add('is-invalid');
        isValid = false;
    }

    // Category Validation
    let productCategory = document.getElementById('productCategory');
    if (productCategory.value === '') {
        productCategory.classList.add('is-invalid');
        isValid = false;
    }

    // Description Validation
    let productDescription = document.getElementById('productDescription');
    if (productDescription.value.trim() === '') {
        productDescription.classList.add('is-invalid');
        isValid = false;
    }

    // Price Validation
    let productPrice = document.getElementById('productPrice');
    if (productPrice.value <= 0) {
        productPrice.classList.add('is-invalid');
        isValid = false;
    }

    // Stock Validation
    let productStock = document.getElementById('productStock');
    if (productStock.value < 0) {
        productStock.classList.add('is-invalid');
        isValid = false;
    }

    // Images Validation
    let productImages = document.getElementById('productImages');
    if (productImages.files.length === 0) {
        productImages.classList.add('is-invalid');
        isValid = false;
    }

    // If form is valid, proceed with form submission
    if (isValid) {
        // Optionally, you could submit the form data here with AJAX if needed.
        console.log("Form is valid and ready for submission!");
        // this.submit(); // Uncomment to submit the form if needed
    }
});
// validation end

async function toggleListing(productId, isCurrentlyListed) {
    try {

        const newStatus = isCurrentlyListed === 'true' ? false : true;


        const response = await fetch('/admin/productListing', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                isListed: newStatus,
            }),
        });


        const data = await response.json();


        if (data.success) {
            alert(`Category ${newStatus ? 'listed' : 'unlisted'} successfully!`);
            location.reload();
        } else {
            alert('Failed to update the category status. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating the category status.');
    }
}



$(document).ready(function () {
    $('#addProductButton').click(function () {
        $('#addProductModal').modal('show');
        $('#imagePreview').html('');
        $('#productForm')[0].reset();
    });

    let croppers = [];


    $('#productImages').change(function (e) {
        handleImageUpload(e.target.files, document.getElementById('imagePreview'));
    });

    $('#productForm').submit(async function (event) {
        event.preventDefault();
        const formData = new FormData();

        // Append other fields to formData
        formData.append('name', $('#productName').val());
        formData.append('brand', $('#productBrand').val());
        formData.append('category', $('#productCategory').val());
        formData.append('description', $('#productDescription').val());
        formData.append('price', $('#productPrice').val());
        formData.append('stock', $('#productStock').val());

        // Prepare image data and append to formData
        await prepareImageData(formData);
        await uploadProduct(formData);
    });
});

// Function to handle image uploads and initialize croppers
function handleImageUpload(files, previewElement) {
    previewElement.innerHTML = ''; // Clear previous previews
    croppers = []; // Reset cropper instances

    for (let i = 0; i < Math.min(files.length, 3); i++) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.position = 'relative';
            imgContainer.style.margin = '10px'; // Add some space between previews if needed

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'img-fluid';
            img.style.width = '100%';
            img.style.maxHeight = '500px';
            img.style.border = 'none'; // Ensure no border
            img.style.padding = '0'; // Ensure no padding
            img.style.margin = '0'; // Ensure no margin
            imgContainer.appendChild(img);

            const changeButton = document.createElement('button');
            changeButton.textContent = 'Change Image';
            changeButton.className = 'btn btn-secondary btn-sm mt-2';
            changeButton.style.position = 'absolute';
            changeButton.style.bottom = '10px';
            changeButton.style.right = '10px';
            changeButton.onclick = (event) => {
                event.preventDefault();
                changeImage(img, i);
            };

            imgContainer.appendChild(changeButton);
            previewElement.appendChild(imgContainer);

            // Initialize cropper for each image
            const cropper = new Cropper(img, {
                aspectRatio: NaN, // No specific aspect ratio
                viewMode: 2,      // View the entire image in the crop box
                autoCropArea: 1,  // Full image selection by default
                background: false,
                scalable: true,
                zoomable: true,
                cropBoxResizable: true,
                cropBoxMovable: true,
                ready: function () {
                    // Ensure crop box covers entire image
                    cropper.setCropBoxData({
                        width: cropper.getImageData().naturalWidth,
                        height: cropper.getImageData().naturalHeight
                    });
                }
            });
            croppers.push(cropper); // Add cropper instance to array
        };
        reader.readAsDataURL(files[i]);
    }
}
async function prepareImageData(formData) {
    for (let i = 0; i < croppers.length; i++) {
        // Get cropped canvas using the original dimensions of the image
        const cropperCanvas = croppers[i].getCroppedCanvas();

        // Create a new canvas to add a white background, matching cropped image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = cropperCanvas.width;
        canvas.height = cropperCanvas.height;
        const ctx = canvas.getContext('2d');

        // Fill the new canvas with a white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the cropped image on top of the white background without resizing
        ctx.drawImage(cropperCanvas, 0, 0);

        // Convert the canvas to a Blob in high quality and add it to FormData
        await new Promise((resolve) => {
            canvas.toBlob((blob) => {
                formData.append('productImages', blob, `image-${i}.jpg`);
                resolve();
            }, 'image/jpeg', 0.95);  // Set compression quality close to 1.0 for maximum clarity
        });
    }
}
// Upload product function
async function uploadProduct(formData) {
    $.ajax({
        url: '/admin/addProduct',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            alert('Product added successfully!');
            $('#addProductModal').modal('hide');
            location.reload();
        },
        error: function (xhr, status, error) {
            console.error("Error in uploadProduct:", error);
            alert('Error adding product: ' + xhr.responseText);
        }
    });
}

async function openEditModal(id, name, brand, categoryid, description, price, stock, images) {
    $('#editProductId').val(id);
    $('#editProductName').val(name);
    $('#editProductBrand').val(brand);
    $('#editProductDescription').val(description);
    $('#editProductPrice').val(price);
    $('#editProductStock').val(stock);
    $('#editProductCategory').val(categoryid);
    $('#editImagePreview').html(''); // Clear previous image previews
    croppers = []; // Reset croppers

    // Parse and display images in the edit modal
    const imageArray = Array.isArray(images) ? images : JSON.parse(images || "[]");
    imageArray.forEach((imageSrc) => {
        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';

        const img = document.createElement('img');
        img.src = imageSrc;
        img.className = 'img-fluid';
        img.style.width = '100%';
        img.style.maxHeight = '500px';
        imgContainer.appendChild(img);
        $('#editImagePreview').append(imgContainer);

        const cropper = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            scalable: true,
            zoomable: true,
            cropBoxResizable: true,
            cropBoxMovable: true,
        });
        croppers.push(cropper);
    });

    $('#editProductModal').modal('show');
}

// Function to open the edit modal
$(document).ready(function () {
    $('#editProductForm').on('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData();
        formData.append('name', $('#editProductName').val()); // Corrected from 'editProdcutName' to 'editProductName'
        formData.append('brand', $('#editProductBrand').val()); // Corrected from 'editProdcutBrand' to 'editProductBrand'
        formData.append('category', $('#editProductCategory').val());
        formData.append('description', $('#editProductDescription').val());
        formData.append('price', $('#editProductPrice').val());
        formData.append('stock', $('#editProductStock').val());
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        // Create FormData from the form
        updateProduct(formData); // Call the updateProduct function
    });
});


// Update product function
async function updateProduct(formData) {
    const productId = $('#editProductId').val(); // Get the product ID

    $.ajax({
        url: `/admin/editProduct/${productId}`,
        type: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            alert('Product updated successfully!');
            $('#editProductModal').modal('hide');
            location.reload();
        },
        error: function (xhr, status, error) {
            console.error("Error in updateProduct:", error);
            alert('Error updating product: ' + xhr.responseText);
        }
    });
}

