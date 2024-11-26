function loadPage(pageNumber) {
    window.location.href = `/admin/products?page=${pageNumber}`;
}
document.getElementById('productForm').addEventListener('submit', function (event) {
    event.preventDefault();
    let fields = ['productName', 'productBrand', 'productCategory', 'productDescription', 'productPrice', 'productStock', 'productImages'];
    fields.forEach(field => {
        document.getElementById(field).classList.remove('is-invalid');
    });

    let isValid = true;
    let productName = document.getElementById('productName');
    if (productName.value.trim() === '') {
        productName.classList.add('is-invalid');
        isValid = false;
    }

    let productBrand = document.getElementById('productBrand');
    if (productBrand.value.trim() === '') {
        productBrand.classList.add('is-invalid');
        isValid = false;
    }

    let productCategory = document.getElementById('productCategory');
    if (productCategory.value === '') {
        productCategory.classList.add('is-invalid');
        isValid = false;
    }

    let productDescription = document.getElementById('productDescription');
    if (productDescription.value.trim() === '') {
        productDescription.classList.add('is-invalid');
        isValid = false;
    }

    let productPrice = document.getElementById('productPrice');
    if (productPrice.value === '' || productPrice.value <= 0) {
        productPrice.classList.add('is-invalid');
        isValid = false;
    }

    let productStock = document.getElementById('productStock');
    let stockValue = productStock.value.trim();
    console.log(stockValue);

    if (stockValue === '' || Number(stockValue) < 0) {
        productStock.classList.add('is-invalid');
        isValid = false;
    }
    let productImages = document.getElementById('productImages');
    if (productImages.files.length === 0) {
        productImages.classList.add('is-invalid');
        isValid = false;
    }


    if (isValid) {
    }
});

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
            location.reload();
        } else {
        }
    } catch (error) {
        console.error('Error:', error);
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
        }
    });
}


// Handle Edit Button Click
function handleEditClick(button) {
    const id = button.dataset.id;
    const name = button.dataset.name;
    const brand = button.dataset.brand;
    const category = button.dataset.category;
    const description = JSON.parse(button.dataset.description);
    const price = button.dataset.price;
    const stock = button.dataset.stock;
    const images = JSON.parse(button.dataset.images);
    openEditModal(id, name, brand, category, description, price, stock, images);
}

// Open Edit Modal and Populate Data
let croppers = [];
let imageUpdates = [];

async function openEditModal(id, name, brand, categoryid, description, price, stock, images) {
    console.log('Opening Edit Modal');

    // Populate form fields
    $('#editProductId').val(id);
    $('#editProductName').val(name);
    $('#editProductBrand').val(brand);
    $('#editProductDescription').val(description);
    $('#editProductPrice').val(price);
    $('#editProductStock').val(stock);
    $('#editProductCategory').val(categoryid);

    // Clear previous image previews and reset croppers
    $('#editImagePreview').html('');
    croppers = [];
    imageUpdates = []; // Reset image updates on modal open

    // Load existing images into the preview
    const imageArray = Array.isArray(images) ? images : JSON.parse(images || "[]");

    imageArray.forEach((imageSrc, index) => {
        if (imageSrc) {
            const imgContainer = document.createElement('div');
            imgContainer.style.position = 'relative';

            const img = document.createElement('img');
            img.src = imageSrc;
            img.className = 'img-fluid';
            img.style.width = '100%';
            img.style.maxHeight = '500px';
            imgContainer.appendChild(img);

            // Change Image Button
            const changeButton = document.createElement('button');
            changeButton.textContent = 'Change Image';
            changeButton.className = 'btn btn-secondary btn-sm mt-2';
            changeButton.style.position = 'absolute';
            changeButton.style.bottom = '10px';
            changeButton.style.right = '10px';

            // Handle image change
            changeButton.onclick = (e) => {
                e.stopPropagation();
                handleImageChange(index, img);
            };
            imgContainer.appendChild(changeButton);

            // Add to preview container
            $('#editImagePreview').append(imgContainer);

            // Initialize Cropper
            const cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 2,
                autoCropArea: 1,
                background: false,
                scalable: true,
                zoomable: true,
                cropBoxResizable: true,
                cropBoxMovable: true,
            });
            croppers.push(cropper);
        }
    });

    // Show the modal
    $('#editProductModal').modal('show');
}

// Handle Image Change
function handleImageChange(index, imgElement) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Replace the old image with the new one
                imgElement.src = event.target.result;

                // Destroy the previous cropper instance
                if (croppers[index]) {
                    croppers[index].destroy();
                }

                // Initialize cropper for the new image
                const cropper = new Cropper(imgElement, {
                    aspectRatio: NaN,
                    viewMode: 2,
                    autoCropArea: 1,
                    background: false,
                    scalable: true,
                    zoomable: true,
                    cropBoxResizable: true,
                    cropBoxMovable: true,
                });
                croppers[index] = cropper;
            };
            reader.readAsDataURL(file);
        }
    };
    fileInput.click();
}

// Prepare Cropped Image Data for Submission
async function prepareImageData(formData) {
    for (let i = 0; i < croppers.length; i++) {
        const cropper = croppers[i];

        // Check if cropper exists and has valid canvas
        if (cropper && cropper.getCroppedCanvas()) {
            const cropperCanvas = cropper.getCroppedCanvas();

            // Add a white background to the canvas
            const canvas = document.createElement('canvas');
            canvas.width = cropperCanvas.width;
            canvas.height = cropperCanvas.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(cropperCanvas, 0, 0);

            // Convert to Blob and append to FormData
            await new Promise((resolve) => {
                canvas.toBlob(
                    (blob) => {
                        formData.append('productImages', blob, `image-${i}.jpg`);
                        resolve();
                    },
                    'image/jpeg',
                    0.95 // High-quality JPEG compression
                );
            });
        }
    }

    // Add image updates (if any) from imageChanges
    imageUpdates.forEach((imageData, index) => {
        if (imageData) {
            formData.append('updatedImages', imageData, `updated-image-${index}.jpg`);
        }
    });
}

// Handle Edit Form Submission (API triggers only when form is submitted)
$(document).ready(function () {
    // Prevent form submission when clicking on other buttons
    $('#editProductForm').on('submit', function (event) {
        event.preventDefault(); // Prevent form from submitting immediately
    });

    // Add explicit handler for "Save Changes" button click
    $('#saveChangesButton').on('click', async function () {
        // Prepare form data
        const formData = new FormData();
        formData.append('name', $('#editProductName').val());
        formData.append('brand', $('#editProductBrand').val());
        formData.append('category', $('#editProductCategory').val());
        formData.append('description', $('#editProductDescription').val());
        formData.append('price', $('#editProductPrice').val());
        formData.append('stock', $('#editProductStock').val());

        // Add cropped images (this runs only after images are handled)
        await prepareImageData(formData);

        // Trigger API request after ensuring everything is ready
        const productId = $('#editProductId').val();
        $.ajax({
            url: `/admin/editProduct/${productId}`,
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                $('#editProductModal').modal('hide');
                location.reload();
            },
            error: function (error) {
                console.error('Error updating product:', error);
            }
        });
    });
});