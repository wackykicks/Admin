// Admin Categories Management
class AdminCategoryManager {
    constructor() {
        this.categories = [];
        this.products = [];
        this.selectedProduct = null;
        this.init();
    }

    async init() {
        console.log('=== ADMIN CATEGORY MANAGER INIT ===');
        
        try {
            console.log('Firebase db available:', typeof db !== 'undefined');
            console.log('CategoryManager available:', typeof categoryManager !== 'undefined');
            
            // Test Firebase connection first
            if (typeof db !== 'undefined') {
                try {
                    console.log('Testing Firebase connection...');
                    const testQuery = await db.collection('category').limit(1).get();
                    console.log('Firebase connection successful, docs found:', testQuery.size);
                } catch (firebaseError) {
                    console.error('Firebase connection failed:', firebaseError);
                    throw new Error('Firebase connection failed: ' + firebaseError.message);
                }
            } else {
                console.warn('Firebase not available, will use fallback data');
            }
            
            console.log('Loading categories...');
            await this.loadCategories();
            console.log('Categories loaded:', this.categories.length);
            
            console.log('Loading products...');
            await this.loadProducts();
            console.log('Products loaded:', this.products.length);
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('Rendering categories table...');
            this.renderCategoriesTable();
            
            console.log('Rendering products list...');
            this.renderProductsList();
            
            console.log('Rendering category checkboxes...');
            this.renderCategoryCheckboxes();
            
            // Clear any existing error messages on successful load
            const existingMessage = document.querySelector('.message');
            if (existingMessage) {
                existingMessage.remove();
                console.log('Cleared existing error message');
            }
            
            console.log('✅ Admin Category Manager initialized successfully');
            console.log('Final state - Categories:', this.categories.length, 'Products:', this.products.length);
            
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            console.error('Error stack:', error.stack);
            this.showMessage('Error loading data: ' + error.message + '. Please refresh the page.', 'error');
        }
        
        console.log('=== END ADMIN INIT ===');
    }

    async loadCategories() {
        console.log('=== LOADING CATEGORIES ===');
        
        try {
            // Try direct Firebase first
            if (typeof db !== 'undefined') {
                console.log('Attempting to load from Firebase category collection...');
                const categoriesSnapshot = await db.collection('category').get();
                console.log('Firebase query result - size:', categoriesSnapshot.size);
                
                this.categories = categoriesSnapshot.docs.map(doc => {
                    const rawData = doc.data();
                    const data = { 
                        id: doc.id, // Firebase document ID
                        firebaseId: doc.id, // Keep reference to Firebase ID
                        categoryId: rawData.id || rawData.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || doc.id, // Category identifier for products
                        name: rawData.name || 'Unnamed Category',
                        image: rawData.image || rawData.icon || '',
                        color: rawData.color || '#667eea',
                        description: rawData.description || '',
                        ...rawData
                    };
                    console.log('Loaded category:', data.name, 'with Firebase ID:', doc.id, 'Category ID:', data.categoryId);
                    return data;
                });
                
                console.log('Successfully loaded from Firebase:', this.categories.length, 'categories');
            } else {
                console.log('Firebase not available, using default categories');
                this.categories = this.getDefaultCategories();
            }
            
            // If no categories loaded, use defaults
            if (this.categories.length === 0) {
                console.log('No categories found in Firebase, using default categories');
                this.categories = this.getDefaultCategories();
            }
            
            console.log('Final categories count:', this.categories.length);
            this.categories.forEach((cat, index) => {
                console.log(`Category ${index + 1}:`, cat.name, '| Image:', cat.image || 'none');
            });
            
        } catch (error) {
            console.error('Error loading categories from Firebase:', error);
            console.error('Error details:', error.message);
            console.log('Falling back to default categories');
            this.categories = this.getDefaultCategories();
        }
        
        console.log('=== END LOADING CATEGORIES ===');
    }

    // Get default categories for fallback
    getDefaultCategories() {
        return [
            { id: 'all', name: 'All Products', image: 'https://via.placeholder.com/60x60?text=ALL', color: '#667eea' },
            { id: 'today offer', name: 'Today\'s Offers', image: 'https://via.placeholder.com/60x60?text=OFFER', color: '#6c757d', special: true, description: 'Limited time special offers and deals' },
            { id: 'nike', name: 'Nike', image: 'https://via.placeholder.com/60x60?text=NIKE', color: '#000000' },
            { id: 'adidas', name: 'Adidas', image: 'https://via.placeholder.com/60x60?text=ADIDAS', color: '#0066cc' },
            { id: 'shoes', name: 'Shoes', image: 'https://via.placeholder.com/60x60?text=SHOES', color: '#ff6b35' },
            { id: 'watches', name: 'Watches', image: 'https://via.placeholder.com/60x60?text=WATCH', color: '#28a745' },
            { id: 'accessories', name: 'Accessories', image: 'https://via.placeholder.com/60x60?text=ACC', color: '#6f42c1' },
            { id: 'out-of-stock', name: 'Out of Stock', image: 'https://via.placeholder.com/60x60?text=OUT', color: '#ef4444' }
        ];
    }

    async loadProducts() {
        try {
            // Load products from Firebase or fallback data
            if (typeof db !== 'undefined') {
                const productsSnapshot = await db.collection('products').get();
                this.products = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Fallback to mock data if Firebase is not available
                this.products = this.getMockProducts();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = this.getMockProducts();
        }
    }

    getMockProducts() {
        return [
            {
                id: '1',
                name: 'Nike Zoom Vomero 5 White',
                img: 'https://via.placeholder.com/200x200?text=Nike+Shoe',
                categories: ['nike', 'shoes']
            },
            {
                id: '2',
                name: 'Fossil Watch Classic',
                img: 'https://via.placeholder.com/200x200?text=Fossil+Watch',
                categories: ['fossil', 'watches']
            },
            {
                id: '3',
                name: 'Adidas Running Shoes',
                img: 'https://via.placeholder.com/200x200?text=Adidas+Shoe',
                categories: ['adidas', 'shoes']
            }
        ];
    }

    setupEventListeners() {
        // Add category form
        const addForm = document.getElementById('addCategoryForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddCategory(e));
        }

        // Edit category form
        const editForm = document.getElementById('editCategoryForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditCategory(e));
        }

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeEditModal();
            }
        });

        // Live preview functionality
        this.setupLivePreview();
        this.setupColorPicker();
    }

    // Setup live preview for category creation
    setupLivePreview() {
        const nameInput = document.getElementById('categoryName');
        const imageInput = document.getElementById('categoryImage');
        const colorInput = document.getElementById('categoryColor');
        const previewName = document.getElementById('previewName');
        const previewImg = document.getElementById('previewImg');
        const previewImage = document.getElementById('previewImage');

        if (nameInput && previewName) {
            nameInput.addEventListener('input', (e) => {
                previewName.textContent = e.target.value || 'Category Name';
            });
        }

        if (imageInput && previewImg) {
            imageInput.addEventListener('input', (e) => {
                if (e.target.value) {
                    previewImg.src = e.target.value;
                    previewImg.onerror = () => {
                        previewImg.src = 'https://via.placeholder.com/72x72?text=ERROR';
                    };
                } else {
                    previewImg.src = 'https://via.placeholder.com/72x72?text=IMG';
                }
            });
        }

        if (colorInput && previewImage) {
            colorInput.addEventListener('input', (e) => {
                // Keep the preview image background as grayscale regardless of color selection
                // Color is only used for selection indicators and borders
                document.documentElement.style.setProperty('--preview-color', e.target.value);
            });
        }
    }

    // Enhanced color picker functionality
    setupColorPicker() {
        const colorInput = document.getElementById('categoryColor');
        const colorHex = document.getElementById('colorHex');
        const colorPreview = document.getElementById('colorPreview');

        if (colorInput && colorHex && colorPreview) {
            // Update hex input when color picker changes
            colorInput.addEventListener('input', (e) => {
                colorHex.value = e.target.value;
                colorPreview.style.backgroundColor = e.target.value;
            });

            // Update color picker when hex input changes
            colorHex.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                    colorPreview.style.backgroundColor = e.target.value;
                }
            });

            // Initialize preview
            colorPreview.style.backgroundColor = colorInput.value;
            colorHex.value = colorInput.value;
        }
    }

    async handleAddCategory(e) {
        e.preventDefault();
        console.log('=== ADD CATEGORY DEBUG ===');
        console.log('Form submitted:', e.target);
        
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name').trim(),
            image: formData.get('image').trim(),
            color: formData.get('color'),
            description: formData.get('description').trim() || '',
            createdAt: new Date().toISOString(),
            id: Date.now().toString() // Generate ID immediately
        };
        
        console.log('Category data to add:', categoryData);

        // Validation
        if (!categoryData.name || !categoryData.image) {
            console.log('Validation failed - missing required fields');
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }
        
        console.log('Validation passed');
        console.log('CategoryManager available:', typeof categoryManager !== 'undefined');
        console.log('Firebase db available:', typeof db !== 'undefined');

        try {
            let success = false;
            
            // Method 1: Try using categoryManager first
            if (typeof categoryManager !== 'undefined') {
                console.log('Using categoryManager.addCategory');
                success = await categoryManager.addCategory(categoryData);
                console.log('CategoryManager result:', success);
            } 
            // Method 2: Try direct Firebase
            else if (typeof db !== 'undefined') {
                console.log('Using direct Firebase add');
                const docRef = await db.collection('category').add({
                    name: categoryData.name,
                    image: categoryData.image,
                    color: categoryData.color,
                    description: categoryData.description,
                    createdAt: categoryData.createdAt
                });
                console.log('Firebase docRef:', docRef);
                categoryData.id = docRef.id;
                success = true;
            } 
            // Method 3: Local storage fallback
            else {
                console.log('Using local storage fallback');
                let localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
                localCategories.push(categoryData);
                localStorage.setItem('categories', JSON.stringify(localCategories));
                this.categories.push(categoryData);
                success = true;
                console.log('Added to local storage');
            }
            
            if (success) {
                console.log('Category added successfully');
                this.showMessage('Category added successfully!', 'success');
                e.target.reset();
                await this.loadCategories();
                this.renderCategoriesTable();
                this.renderCategoryCheckboxes();
            } else {
                console.log('Add failed - success was false');
                this.showMessage('Failed to add category. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            console.error('Error details:', error.stack);
            this.showMessage('Error adding category: ' + error.message, 'error');
        }
        console.log('=== END ADD CATEGORY DEBUG ===');
    }

    async handleEditCategory(e) {
        e.preventDefault();
        console.log('=== EDIT CATEGORY DEBUG ===');
        console.log('Form submitted:', e.target);
        
        const formData = new FormData(e.target);
        const categoryId = document.getElementById('editCategoryId').value;
        console.log('Category ID to update:', categoryId);
        
        const updateData = {
            name: formData.get('name').trim(),
            image: formData.get('image').trim(),
            color: formData.get('color'),
            description: formData.get('description').trim() || '',
            updatedAt: new Date().toISOString()
        };
        console.log('Update data:', updateData);

        try {
            let success = false;
            
            // Try using categoryManager first
            if (typeof categoryManager !== 'undefined') {
                console.log('Using categoryManager.updateCategory');
                success = await categoryManager.updateCategory(categoryId, updateData);
                console.log('CategoryManager result:', success);
            } else if (typeof db !== 'undefined') {
                // Direct Firebase call
                console.log('Using direct Firebase update');
                await db.collection('category').doc(categoryId).update(updateData);
                success = true;
                console.log('Firebase update completed');
            } else {
                console.log('No update method available');
            }
            
            if (success) {
                this.showMessage('Category updated successfully!', 'success');
                this.closeEditModal();
                await this.loadCategories();
                this.renderCategoriesTable();
                this.renderCategoryCheckboxes();
                console.log('Update process completed successfully');
            } else {
                console.log('Update failed - success was false');
                this.showMessage('Failed to update category. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error in handleEditCategory:', error);
            this.showMessage('Error updating category: ' + error.message, 'error');
        }
        console.log('=== END EDIT CATEGORY DEBUG ===');
    }

    renderCategoriesTable() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.categories.map(category => `
            <tr data-category-id="${category.id}">
                <td>
                    <div class="category-preview">
                        <div class="category-preview-image" style="background-color: ${category.color || '#667eea'}">
                            <img src="${category.image || category.icon || 'https://via.placeholder.com/40x40?text=' + (category.name ? category.name.charAt(0) : 'C')}" 
                                 alt="${category.name || 'Category'}" 
                                 style="width: 30px; height: 30px; border-radius: 6px; object-fit: cover;"
                                 onerror="this.src='https://via.placeholder.com/40x40?text=' + '${category.name ? category.name.charAt(0) : 'C'}'">
                        </div>
                        <span class="category-preview-name">${category.name || 'Unnamed Category'}</span>
                    </div>
                </td>
                <td><strong>${category.name || 'Unnamed Category'}</strong></td>
                <td>
                    <img src="${category.image || category.icon || 'https://via.placeholder.com/40x40?text=' + (category.name ? category.name.charAt(0) : 'C')}" 
                         alt="${category.name || 'Category'}" 
                         style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/40x40?text=' + '${category.name ? category.name.charAt(0) : 'C'}'">
                </td>
                <td>
                    <div class="color-preview" style="background-color: ${category.color || '#667eea'}"></div>
                    <small style="display: block; margin-top: 4px;">${category.color || '#667eea'}</small>
                </td>
                <td>
                    <span class="badge">${this.getProductCountForCategory(category.id)} products</span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn btn-warning" onclick="adminCategoryManager.editCategory('${category.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn btn-danger" onclick="adminCategoryManager.deleteCategory('${category.id}', '${category.name || 'Unnamed Category'}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderProductsList() {
        const container = document.getElementById('productsList');
        if (!container) return;

        container.innerHTML = this.products.map(product => `
            <div class="product-item" data-product-id="${product.id}" onclick="adminCategoryManager.selectProduct('${product.id}')">
                <img src="${product.img || product.imgUrl?.[0] || 'Logo/1000163691.jpg'}" 
                     alt="${product.name}" 
                     onerror="this.src='../Logo/1000163691.jpg'">
                <div class="product-item-name">${product.name}</div>
            </div>
        `).join('');
    }

    renderCategoryCheckboxes() {
        const container = document.getElementById('categoriesCheckboxes');
        if (!container) return;

        container.innerHTML = this.categories.map(category => {
            // Use appropriate category identifier for products
            const categoryIdentifier = category.categoryId || category.id;
            return `
            <div class="category-checkbox">
                <input type="checkbox" id="cat_${categoryIdentifier}" value="${categoryIdentifier}" data-category-name="${category.name}">
                <span class="category-checkbox-icon" style="color: ${category.color || '#667eea'}">
                    <img src="${category.image || category.icon || 'https://via.placeholder.com/20x20?text=' + (category.name ? category.name.charAt(0) : 'C')}" 
                         alt="${category.name || 'Category'}" 
                         style="width: 20px; height: 20px; border-radius: 4px; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/20x20?text=' + '${category.name ? category.name.charAt(0) : 'C'}'">
                </span>
                <label for="cat_${categoryIdentifier}" class="category-checkbox-name">${category.name || 'Unnamed Category'}</label>
            </div>
        `;
        }).join('');
    }

    getProductCountForCategory(categoryId) {
        // Handle both Firebase document ID and category name matching
        const category = this.categories.find(cat => cat.id === categoryId);
        const categoryName = category ? category.name : categoryId;
        
        return this.products.filter(product => {
            if (!product.categories || !Array.isArray(product.categories)) return false;
            
            // Check for exact ID match, name match, or common category identifiers
            return product.categories.includes(categoryId) || 
                   product.categories.includes(categoryName) ||
                   product.categories.includes(categoryName.toLowerCase()) ||
                   (categoryName === "Today's Offers" && product.categories.includes("today offer"));
        }).length;
    }

    editCategory(categoryId) {
        console.log('=== EDIT CATEGORY MODAL ===');
        console.log('Opening edit for category ID:', categoryId);
        
        const category = this.categories.find(cat => cat.id === categoryId);
        console.log('Found category:', category);
        
        if (!category) {
            console.log('Category not found!');
            return;
        }

        // Populate edit form
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.name;
        document.getElementById('editCategoryImage').value = category.image || category.icon || '';
        document.getElementById('editCategoryColor').value = category.color;
        document.getElementById('editCategoryDescription').value = category.description || '';

        console.log('Form populated with values');
        console.log('- ID:', category.id);
        console.log('- Name:', category.name);
        console.log('- Icon:', category.icon);
        console.log('- Color:', category.color);

        // Show modal
        document.getElementById('editModal').style.display = 'block';
        console.log('Edit modal opened');
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    async deleteCategory(categoryId, categoryName) {
        if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            let success = false;
            
            // Try using categoryManager first
            if (typeof categoryManager !== 'undefined') {
                success = await categoryManager.deleteCategory(categoryId);
            } else if (typeof db !== 'undefined') {
                // Direct Firebase call
                await db.collection('category').doc(categoryId).delete();
                success = true;
            }
            
            if (success) {
                this.showMessage('Category deleted successfully!', 'success');
                await this.loadCategories();
                this.renderCategoriesTable();
                this.renderCategoryCheckboxes();
            } else {
                this.showMessage('Failed to delete category. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showMessage('Error deleting category. Please try again.', 'error');
        }
    }

    selectProduct(productId) {
        // Remove previous selection
        document.querySelectorAll('.product-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked product
        const productElement = document.querySelector(`[data-product-id="${productId}"]`);
        if (productElement) {
            productElement.classList.add('selected');
        }

        // Find and store selected product
        this.selectedProduct = this.products.find(product => product.id === productId);
        
        if (this.selectedProduct) {
            this.renderSelectedProduct();
            this.loadProductCategories();
        }
    }

    renderSelectedProduct() {
        const container = document.getElementById('selectedProduct');
        if (!container || !this.selectedProduct) return;

        container.innerHTML = `
            <img src="${this.selectedProduct.img || this.selectedProduct.imgUrl?.[0] || '../Logo/1000163691.jpg'}" 
                 alt="${this.selectedProduct.name}"
                 onerror="this.src='../Logo/1000163691.jpg'">
            <h4>${this.selectedProduct.name}</h4>
            <p>Select categories for this product:</p>
        `;

        document.getElementById('categoryAssignmentForm').style.display = 'block';
    }

    loadProductCategories() {
        if (!this.selectedProduct) return;

        const productCategories = this.selectedProduct.categories || [];
        
        // Update checkboxes
        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);
            if (checkbox) {
                // Check if product has this category using multiple possible identifiers
                checkbox.checked = productCategories.includes(categoryIdentifier) ||
                                 productCategories.includes(category.id) ||
                                 productCategories.includes(category.name) ||
                                 productCategories.includes(category.name.toLowerCase()) ||
                                 (category.name === "Today's Offers" && productCategories.includes("today offer"));
            }
        });
    }

    async saveProductCategories() {
        if (!this.selectedProduct) {
            this.showMessage('Please select a product first.', 'error');
            return;
        }

        // Collect selected categories
        const selectedCategories = [];
        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);
            if (checkbox && checkbox.checked) {
                // Use the appropriate identifier for products
                let categoryToAdd = categoryIdentifier;
                
                // Special handling for Today's Offers
                if (category.name === "Today's Offers") {
                    categoryToAdd = "today offer";
                }
                
                selectedCategories.push(categoryToAdd);
            }
        });

        try {
            // Update product in database
            if (typeof db !== 'undefined') {
                await db.collection('products').doc(this.selectedProduct.id).update({
                    categories: selectedCategories,
                    updatedAt: new Date().toISOString()
                });
            }

            // Update local product data
            this.selectedProduct.categories = selectedCategories;
            const productIndex = this.products.findIndex(p => p.id === this.selectedProduct.id);
            if (productIndex > -1) {
                this.products[productIndex].categories = selectedCategories;
            }

            this.showMessage('Product categories updated successfully!', 'success');
            this.renderCategoriesTable(); // Update product counts
        } catch (error) {
            console.error('Error saving product categories:', error);
            this.showMessage('Error saving categories. Please try again.', 'error');
        }
    }

    showMessage(text, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${text}
        `;

        // Insert at top of main content
        const main = document.querySelector('.admin-main');
        if (main) {
            main.insertBefore(message, main.firstChild);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
    }
}

// Global functions for onclick handlers
function closeEditModal() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.closeEditModal();
    }
}

function saveProductCategories() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.saveProductCategories();
    }
}

// Initialize admin when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminCategoryManager = new AdminCategoryManager();
});

// Export for global use
window.AdminCategoryManager = AdminCategoryManager;