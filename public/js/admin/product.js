function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Load a specific page with optional search query
function loadPage(pageNumber, search = '') {
    const url = search ? `/admin/products?page=${pageNumber}&search=${encodeURIComponent(search)}` : `/admin/products?page=${pageNumber}`;
    window.location.href = url;
}

// Handle search form submission
document.getElementById('searchForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const searchButton = event.target.querySelector('.btn-primary');
    searchButton.classList.add('loading');
    searchButton.disabled = true;
    const searchInput = document.getElementById('searchInput').value.trim();
    loadPage(1, searchInput);
    searchButton.classList.remove('loading');
    searchButton.disabled = false;
});

// Handle real-time search
document.getElementById('searchInput')?.addEventListener('input', debounce((event) => {
    const searchInput = event.target.value.trim();
    const clearButton = document.querySelector('.btn-clear-search');
    clearButton.classList.toggle('d-none', !searchInput);
    loadPage(1, searchInput);
}, 500));

// Handle reset button
function resetSearch() {
    document.getElementById('searchInput').value = '';
    const clearButton = document.querySelector('.btn-clear-search');
    clearButton.classList.add('d-none');
    loadPage(1);
}

// Global variables
let croppers = [];
let editCroppers = [];

// Show toast notification
function showToast(message) {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast top-right-toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">Message</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Toggle product listing
async function toggleListing(productId, isCurrentlyListed) {
    try {
        const newStatus = isCurrentlyListed === 'true' ? false : true;
        const response = await fetch('/admin/productListing', {
            method: 'PATCH',
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
            showToast('Failed to update product listing status. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('An error occurred while updating the product status.');
    }
}

// Function to handle image uploads and initialize croppers
function handleImageUpload(files, previewElement, croppersArray) {
    previewElement.innerHTML = '';
    croppersArray.length = 0;

    for (let i = 0; i < Math.min(files.length, 3); i++) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.style.position = 'relative';
            imgContainer.style.margin = '10px';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'img-fluid';
            img.style.width = '100%';
            img.style.maxHeight = '500px';
            img.style.border = 'none';
            img.style.padding = '0';
            img.style.margin = '0';
            imgContainer.appendChild(img);

            const changeButton = document.createElement('button');
            changeButton.textContent = 'Change Image';
            changeButton.className = 'btn btn-secondary btn-sm mt-2';
            changeButton.style.position = 'absolute';
            changeButton.style.bottom = '10px';
            changeButton.style.right = '10px';
            changeButton.onclick = (event) => {
                event.preventDefault();
                changeImage(img, i, croppersArray);
            };

            imgContainer.appendChild(changeButton);
            previewElement.appendChild(imgContainer);

            const cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 2,
                autoCropArea: 1,
                background: false,
                scalable: true,
                zoomable: true,
                cropBoxResizable: true,
                cropBoxMovable: true,
                ready: function () {
                    cropper.setCropBoxData({
                        width: cropper.getImageData().naturalWidth,
                        height: cropper.getImageData().naturalHeight,
                    });
                },
            });
            croppersArray.push(cropper);
        };
        reader.readAsDataURL(files[i]);
    }
}

// Change image function
function changeImage(imgElement, index, croppersArray) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgElement.src = event.target.result;

                if (croppersArray[index]) {
                    croppersArray[index].destroy();
                }

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
                croppersArray[index] = cropper;
            };
            reader.readAsDataURL(file);
        }
    };
    fileInput.click();
}

// Prepare image data for submission
async function prepareImageData(formData, croppersArray) {
    for (let i = 0; i < croppersArray.length; i++) {
        const cropper = croppersArray[i];

        if (cropper && cropper.getCroppedCanvas()) {
            const cropperCanvas = cropper.getCroppedCanvas();

            const canvas = document.createElement('canvas');
            canvas.width = cropperCanvas.width;
            canvas.height = cropperCanvas.height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(cropperCanvas, 0, 0);

            await new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    formData.append('productImages', blob, `image-${i}.jpg`);
                    resolve();
                }, 'image/jpeg', 0.95);
            });
        }
    }
}

// Upload product function
async function uploadProduct(formData) {
    try {
        const response = await fetch('/admin/addProduct', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            $('#addProductModal').modal('hide');
            location.reload();
        } else {
            const errorData = await response.json();
            console.error('Upload failed:', errorData.message);
            showToast(`Failed to add product: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error in uploadProduct:', error);
        showToast('An error occurred while adding the product.');
    }
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
    const variants = JSON.parse(button.dataset.variants || '[]');
    openEditModal(id, name, brand, category, description, price, stock, images, variants);
}

// Open Edit Modal and Populate Data
async function openEditModal(id, name, brand, categoryid, description, price, stock, images, variants) {
    $('#editProductId').val(id);
    $('#editProductName').val(name);
    $('#editProductBrand').val(brand);
    $('#editProductDescription').val(description);
    $('#editProductPrice').val(price);
    $('#editProductCategory').val(categoryid);

    // Populate variant fields
    const sizes = ['Small', 'Medium', 'Large', 'ExtraLarge'];
    sizes.forEach(size => {
        const variant = variants.find(v => v.size === size);
        $(`#editProductStock${size.replace(' ', '')}`).val(variant ? variant.stock : 0);
    });

    // Clear previous image previews and reset croppers
    $('#editImagePreview').html('');
    editCroppers.length = 0;

    // Load existing images into the preview
    const imageArray = Array.isArray(images) ? images : JSON.parse(images || '[]');

    imageArray.forEach((imageSrc, index) => {
        if (imageSrc) {
            const imgContainer = document.createElement('div');
            imgContainer.style.position = 'relative';
            imgContainer.style.margin = '10px';

            const img = document.createElement('img');
            img.src = imageSrc;
            img.className = 'img-fluid';
            img.style.width = '100%';
            img.style.maxHeight = '500px';
            imgContainer.appendChild(img);

            const changeButton = document.createElement('button');
            changeButton.textContent = 'Change Image';
            changeButton.className = 'btn btn-secondary btn-sm mt-2';
            changeButton.style.position = 'absolute';
            changeButton.style.bottom = '10px';
            changeButton.style.right = '10px';

            changeButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                changeImage(img, index, editCroppers);
            };
            imgContainer.appendChild(changeButton);

            $('#editImagePreview').append(imgContainer);

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
            editCroppers.push(cropper);
        }
    });

    $('#editProductModal').modal('show');
}

// Document ready
$(document).ready(function () {
    // Add Product Modal
    $('#addProductButton').click(function () {
        $('#addProductModal').modal('show');
        $('#imagePreview').html('');
        $('#productForm')[0].reset();
        croppers.length = 0;
        // Reset variant fields
        ['Small', 'Medium', 'Large', 'ExtraLarge'].forEach(size => {
            $(`#productStock${size}`).val('');
        });
    });

    // Handle image upload for ADD modal
    $('#productImages').change(function (e) {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files, document.getElementById('imagePreview'), croppers);
        }
    });

    // Product form validation and submission
    $('#productForm').on('submit', function (event) {
        event.preventDefault();

        // Validation
        let fields = ['productName', 'productBrand', 'productCategory', 'productDescription', 'productPrice', 'productImages'];
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

        // Validate variants
        const sizes = ['Small', 'Medium', 'Large', 'ExtraLarge'];
        const variants = sizes.map(size => ({
            size,
            stock: parseInt($(`#productStock${size}`).val()) || 0,
        }));

        let hasValidVariant = variants.some(variant => variant.stock > 0);
        if (!hasValidVariant) {
            sizes.forEach(size => {
                $(`#productStock${size}`).addClass('is-invalid');
            });
            isValid = false;
            showToast('At least one size must have stock greater than 0.');
        } else {
            sizes.forEach(size => {
                $(`#productStock${size}`).removeClass('is-invalid');
            });
        }

        let productImages = document.getElementById('productImages');
        if (productImages.files.length === 0 && croppers.length === 0) {
            productImages.classList.add('is-invalid');
            isValid = false;
        }

        if (isValid) {
            const formData = new FormData();
            formData.append('name', $('#productName').val());
            formData.append('brand', $('#productBrand').val());
            formData.append('category', $('#productCategory').val());
            formData.append('description', $('#productDescription').val());
            formData.append('price', $('#productPrice').val());
            formData.append('variants', JSON.stringify(variants));

            prepareImageData(formData, croppers).then(() => {
                uploadProduct(formData);
            });
        }
    });

    // Edit Product Form Submission
    $('#saveChangesButton').on('click', async function (e) {
        e.preventDefault();

        // Validation
        let isValid = true;

        let editProductName = $('#editProductName');
        if (editProductName.val().trim() === '') {
            editProductName.addClass('is-invalid');
            isValid = false;
        } else {
            editProductName.removeClass('is-invalid');
        }

        let editProductBrand = $('#editProductBrand');
        if (editProductBrand.val().trim() === '') {
            editProductBrand.addClass('is-invalid');
            isValid = false;
        } else {
            editProductBrand.removeClass('is-invalid');
        }

        let editProductCategory = $('#editProductCategory');
        if (editProductCategory.val() === '') {
            editProductCategory.addClass('is-invalid');
            isValid = false;
        } else {
            editProductCategory.removeClass('is-invalid');
        }

        let editProductDescription = $('#editProductDescription');
        if (editProductDescription.val().trim() === '') {
            editProductDescription.addClass('is-invalid');
            isValid = false;
        } else {
            editProductDescription.removeClass('is-invalid');
        }

        let editProductPrice = $('#editProductPrice');
        if (editProductPrice.val() === '' || editProductPrice.val() <= 0) {
            editProductPrice.addClass('is-invalid');
            isValid = false;
        } else {
            editProductPrice.removeClass('is-invalid');
        }

        // Validate variants
        const sizes = ['Small', 'Medium', 'Large', 'ExtraLarge'];
        const variants = sizes.map(size => ({
            size,
            stock: parseInt($(`#editProductStock${size}`).val()) || 0,
        }));

        let hasValidVariant = variants.some(variant => variant.stock > 0);
        if (!hasValidVariant) {
            sizes.forEach(size => {
                $(`#editProductStock${size}`).addClass('is-invalid');
            });
            isValid = false;
            showToast('At least one size must have stock greater than 0.');
        } else {
            sizes.forEach(size => {
                $(`#editProductStock${size}`).removeClass('is-invalid');
            });
        }

        if (isValid) {
            const formData = new FormData();
            formData.append('name', $('#editProductName').val());
            formData.append('brand', $('#editProductBrand').val());
            formData.append('category', $('#editProductCategory').val());
            formData.append('description', $('#editProductDescription').val());
            formData.append('price', $('#editProductPrice').val());
            formData.append('variants', JSON.stringify(variants));

            await prepareImageData(formData, editCroppers);

            const productId = $('#editProductId').val();

            try {
                const response = await fetch(`/admin/editProduct/${productId}`, {
                    method: 'PUT',
                    body: formData,
                });

                if (response.ok) {
                    $('#editProductModal').modal('hide');
                    location.reload();
                } else {
                    const errorData = await response.json();
                    console.error('Update failed:', errorData.message);
                    showToast(`Failed to update product: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Error updating product:', error);
                showToast('An error occurred while updating the product.');
            }
        }
    });
});