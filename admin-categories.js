// Admin Categories Management
class AdminCategoryManager {
    constructor() {
        this.categories = [];
        this.products = [];
        this.selectedProduct = null;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Admin Category Manager...');
            console.log('Firebase db available:', typeof db !== 'undefined');
            console.log('CategoryManager available:', typeof categoryManager !== 'undefined');
            
            // Test Firebase connection
            if (typeof db !== 'undefined') {
                try {
                    const testQuery = await db.collection('categories').limit(1).get();
                    console.log('Firebase connection test successful');
                } catch (firebaseError) {
                    console.error('Firebase connection test failed:', firebaseError);
                }
            }
            
            await this.loadCategories();
            await this.loadProducts();
            this.setupEventListeners();
            this.renderCategoriesTable();
            this.renderProductsList();
            this.renderCategoryCheckboxes();
            
            console.log('Admin Category Manager initialized successfully');
            console.log('Loaded categories:', this.categories.length);
            console.log('Loaded products:', this.products.length);
        } catch (error) {
            console.error('Error initializing admin:', error);
            this.showMessage('Error loading data. Please refresh the page.', 'error');
        }
    }

    async loadCategories() {
        try {
            console.log('Loading categories...');
            
            // Method 1: Wait for categoryManager to be available and load categories
            if (typeof categoryManager !== 'undefined') {
                console.log('Using categoryManager to load categories');
                await categoryManager.loadCategories();
                this.categories = categoryManager.getCategories();
            } 
            // Method 2: Fallback - directly load from Firebase if categoryManager is not available
            else if (typeof db !== 'undefined') {
                console.log('Using direct Firebase to load categories');
                const categoriesSnapshot = await db.collection('categories').get();
                this.categories = categoriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } 
            // Method 3: Local storage fallback
            else {
                console.log('Using local storage for categories');
                const localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
                if (localCategories.length > 0) {
                    this.categories = localCategories;
                } else {
                    this.categories = this.getDefaultCategories();
                }
            }
            
            console.log('Loaded categories:', this.categories.length);
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = this.getDefaultCategories();
        }
    }

    // Get default categories for fallback
    getDefaultCategories() {
        return [
            { id: 'all', name: 'All Products', icon: '🏠', color: '#667eea' },
            { id: 'nike', name: 'Nike', icon: '✓', color: '#000000' },
            { id: 'adidas', name: 'Adidas', icon: '⚡', color: '#0066cc' },
            { id: 'shoes', name: 'Shoes', icon: '👟', color: '#ff6b35' },
            { id: 'watches', name: 'Watches', icon: '⌚', color: '#28a745' },
            { id: 'accessories', name: 'Accessories', icon: '🎒', color: '#6f42c1' }
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
    }

    async handleAddCategory(e) {
        e.preventDefault();
        console.log('=== ADD CATEGORY DEBUG ===');
        console.log('Form submitted:', e.target);
        
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name').trim(),
            icon: formData.get('icon').trim(),
            color: formData.get('color'),
            description: formData.get('description').trim() || '',
            createdAt: new Date().toISOString(),
            id: Date.now().toString() // Generate ID immediately
        };
        
        console.log('Category data to add:', categoryData);

        // Validation
        if (!categoryData.name || !categoryData.icon) {
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
                const docRef = await db.collection('categories').add({
                    name: categoryData.name,
                    icon: categoryData.icon,
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
            icon: formData.get('icon').trim(),
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
                await db.collection('categories').doc(categoryId).update(updateData);
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
                        <div class="category-preview-icon" style="background-color: ${category.color}">
                            ${category.icon}
                        </div>
                        <span class="category-preview-name">${category.name}</span>
                    </div>
                </td>
                <td><strong>${category.name}</strong></td>
                <td style="font-size: 1.2rem;">${category.icon}</td>
                <td>
                    <div class="color-preview" style="background-color: ${category.color}"></div>
                    <small style="display: block; margin-top: 4px;">${category.color}</small>
                </td>
                <td>
                    <span class="badge">${this.getProductCountForCategory(category.id)} products</span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn btn-warning" onclick="adminCategoryManager.editCategory('${category.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn btn-danger" onclick="adminCategoryManager.deleteCategory('${category.id}', '${category.name}')">
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

        container.innerHTML = this.categories.map(category => `
            <div class="category-checkbox">
                <input type="checkbox" id="cat_${category.id}" value="${category.id}">
                <span class="category-checkbox-icon" style="color: ${category.color}">${category.icon}</span>
                <label for="cat_${category.id}" class="category-checkbox-name">${category.name}</label>
            </div>
        `).join('');
    }

    getProductCountForCategory(categoryId) {
        return this.products.filter(product => 
            product.categories && product.categories.includes(categoryId)
        ).length;
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
        document.getElementById('editCategoryIcon').value = category.icon;
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
                await db.collection('categories').doc(categoryId).delete();
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
            const checkbox = document.getElementById(`cat_${category.id}`);
            if (checkbox) {
                checkbox.checked = productCategories.includes(category.id);
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
            const checkbox = document.getElementById(`cat_${category.id}`);
            if (checkbox && checkbox.checked) {
                selectedCategories.push(category.id);
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