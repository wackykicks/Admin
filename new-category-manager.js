class CategoryManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.selectedProducts = new Set();
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🚀 Initializing Category Manager...');
        await this.loadProducts();
        await this.loadCategories();
        this.renderUI();
        this.isInitialized = true;
        console.log('✅ Category Manager initialized');
    }

    async loadProducts() {
        try {
            if (typeof window.db === 'undefined') {
                console.error('❌ Firebase not available');
                return;
            }

            const snapshot = await window.db.collection('products').get();
            this.products = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.products.push({
                    id: doc.id,
                    name: data.name || 'Unnamed Product',
                    image: data.image || '',
                    categories: data.categories || []
                });
            });

            console.log(`📦 Loaded ${this.products.length} products`);
        } catch (error) {
            console.error('❌ Error loading products:', error);
        }
    }

    async loadCategories() {
        try {
            if (typeof window.db === 'undefined') {
                console.error('❌ Firebase not available');
                return;
            }

            const snapshot = await window.db.collection('categories').get();
            this.categories = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.categories.push({
                    id: doc.id,
                    name: data.name || 'Unnamed Category',
                    color: data.color || '#007bff'
                });
            });

            console.log(`🗂️ Loaded ${this.categories.length} categories`);
        } catch (error) {
            console.error('❌ Error loading categories:', error);
        }
    }

    renderUI() {
        this.renderProductGrid();
        this.renderCategoryList();
        this.renderControls();
    }

    renderProductGrid() {
        const container = document.getElementById('productsGrid');
        if (!container) {
            console.error('❌ Products grid container not found');
            return;
        }

        let html = '';
        
        this.products.forEach(product => {
            const isSelected = this.selectedProducts.has(product.id);
            const categoryCount = product.categories ? product.categories.length : 0;
            
            html += `
                <div class="product-card ${isSelected ? 'selected' : ''}" 
                     data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" 
                             onerror="this.src='../assets/placeholder.jpg'">
                    </div>
                    <div class="product-selection-badge">✓</div>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="category-count">${categoryCount} categories</p>
                        <button class="btn btn-primary btn-sm" 
                                onclick="categoryManager.selectProduct('${product.id}')">
                            ${isSelected ? 'Deselect' : 'Select'}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderCategoryList() {
        const container = document.getElementById('categoryList');
        if (!container) {
            console.error('❌ Category list container not found');
            return;
        }

        let html = '';
        
        this.categories.forEach(category => {
            html += `
                <div class="category-item" data-category-id="${category.id}">
                    <label class="category-label">
                        <input type="checkbox" 
                               class="category-checkbox" 
                               value="${category.id}" 
                               data-category-name="${category.name}">
                        <span class="category-name" style="color: ${category.color}">
                            ${category.name}
                        </span>
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderControls() {
        const container = document.getElementById('categoryControls');
        if (!container) {
            console.error('❌ Category controls container not found');
            return;
        }

        const selectedCount = this.selectedProducts.size;
        
        container.innerHTML = `
            <div class="selection-info">
                <h3>${selectedCount} Product${selectedCount !== 1 ? 's' : ''} Selected</h3>
            </div>
            
            <div class="category-actions">
                <button class="btn btn-success" 
                        onclick="categoryManager.assignCategories()" 
                        ${selectedCount === 0 ? 'disabled' : ''}>
                    Assign Selected Categories
                </button>
                <button class="btn btn-warning" 
                        onclick="categoryManager.removeCategories()" 
                        ${selectedCount === 0 ? 'disabled' : ''}>
                    Remove Selected Categories
                </button>
                <button class="btn btn-danger" 
                        onclick="categoryManager.clearAllCategories()" 
                        ${selectedCount === 0 ? 'disabled' : ''}>
                    Clear All Categories
                </button>
            </div>
            
            <div class="bulk-actions">
                <button class="btn btn-secondary" onclick="categoryManager.selectAllProducts()">
                    Select All Products
                </button>
                <button class="btn btn-secondary" onclick="categoryManager.clearSelection()">
                    Clear Selection
                </button>
            </div>
        `;
    }

    // ===== PRODUCT SELECTION METHODS =====
    
    selectProduct(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
            console.log(`➖ Deselected product: ${productId}`);
        } else {
            this.selectedProducts.add(productId);
            console.log(`➕ Selected product: ${productId}`);
        }
        
        this.updateUI();
        this.loadProductCategories();
    }

    selectAllProducts() {
        this.selectedProducts.clear();
        this.products.forEach(product => {
            this.selectedProducts.add(product.id);
        });
        console.log(`✅ Selected all ${this.products.length} products`);
        this.updateUI();
        this.loadProductCategories();
    }

    clearSelection() {
        this.selectedProducts.clear();
        console.log('🧹 Cleared all selections');
        this.updateUI();
        this.clearCategoryCheckboxes();
    }

    // ===== CATEGORY LOADING METHODS =====
    
    loadProductCategories() {
        if (this.selectedProducts.size === 0) {
            this.clearCategoryCheckboxes();
            return;
        }

        if (this.selectedProducts.size === 1) {
            this.loadSingleProductCategories();
        } else {
            this.loadMultipleProductCategories();
        }
    }

    loadSingleProductCategories() {
        const productId = Array.from(this.selectedProducts)[0];
        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            console.error('❌ Product not found:', productId);
            return;
        }

        console.log(`🔍 Loading categories for: ${product.name}`);
        console.log(`🏷️ Product categories:`, product.categories);

        // Hide legend for single product
        const legend = document.getElementById('selectionLegend');
        if (legend) {
            legend.style.display = 'none';
        }

        // Clear all checkboxes first
        this.clearCategoryCheckboxes();

        // Check categories that match the product
        const productCategories = product.categories || [];
        
        this.categories.forEach(category => {
            const checkbox = document.querySelector(`input[value="${category.id}"]`);
            if (checkbox) {
                const isProductInCategory = this.isProductInCategory(product, category);
                checkbox.checked = isProductInCategory;
                
                if (isProductInCategory) {
                    console.log(`✅ ${category.name} - checked`);
                } else {
                    console.log(`❌ ${category.name} - unchecked`);
                }
            }
        });
    }

    loadMultipleProductCategories() {
        console.log(`🔍 Loading categories for ${this.selectedProducts.size} products`);
        
        // Show legend for multiple products
        const legend = document.getElementById('selectionLegend');
        if (legend) {
            legend.style.display = 'block';
        }
        
        // Clear all checkboxes first
        this.clearCategoryCheckboxes();

        // For multiple products, we'll show categories that ALL selected products have
        const selectedProductObjects = Array.from(this.selectedProducts)
            .map(id => this.products.find(p => p.id === id))
            .filter(p => p);

        this.categories.forEach(category => {
            const checkbox = document.querySelector(`input[value="${category.id}"]`);
            if (checkbox) {
                // Check if ALL selected products are in this category
                const allProductsInCategory = selectedProductObjects.every(product => 
                    this.isProductInCategory(product, category)
                );
                
                checkbox.checked = allProductsInCategory;
                
                // Add visual indication for partial matches
                const someProductsInCategory = selectedProductObjects.some(product => 
                    this.isProductInCategory(product, category)
                );
                
                const label = checkbox.closest('.category-item');
                if (label) {
                    if (allProductsInCategory) {
                        label.classList.add('all-selected');
                        label.classList.remove('partial-selected');
                    } else if (someProductsInCategory) {
                        label.classList.add('partial-selected');
                        label.classList.remove('all-selected');
                    } else {
                        label.classList.remove('all-selected', 'partial-selected');
                    }
                }
            }
        });
    }

    isProductInCategory(product, category) {
        if (!product.categories || !Array.isArray(product.categories)) {
            return false;
        }

        // Check for exact matches
        return product.categories.includes(category.id) || 
               product.categories.includes(category.name) ||
               product.categories.some(cat => 
                   String(cat).toLowerCase() === category.name.toLowerCase()
               );
    }

    clearCategoryCheckboxes() {
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('all-selected', 'partial-selected');
        });
        
        // Hide legend when no selection
        const legend = document.getElementById('selectionLegend');
        if (legend) {
            legend.style.display = 'none';
        }
    }

    // ===== CATEGORY ASSIGNMENT METHODS =====
    
    async assignCategories() {
        const selectedCategoryIds = this.getSelectedCategories();
        const selectedProductIds = Array.from(this.selectedProducts);
        
        if (selectedCategoryIds.length === 0) {
            alert('Please select at least one category to assign.');
            return;
        }
        
        if (selectedProductIds.length === 0) {
            alert('Please select at least one product.');
            return;
        }

        console.log(`📝 Assigning ${selectedCategoryIds.length} categories to ${selectedProductIds.length} products`);
        
        try {
            for (const productId of selectedProductIds) {
                const product = this.products.find(p => p.id === productId);
                if (!product) continue;

                // Add new categories to existing ones (no duplicates)
                const currentCategories = product.categories || [];
                const newCategories = [...new Set([...currentCategories, ...selectedCategoryIds])];
                
                // Update in database
                await window.db.collection('products').doc(productId).update({
                    categories: newCategories,
                    lastModified: new Date()
                });
                
                // Update local data
                product.categories = newCategories;
                console.log(`✅ Updated ${product.name}: ${newCategories.length} categories`);
            }
            
            alert(`Successfully assigned categories to ${selectedProductIds.length} products!`);
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Error assigning categories:', error);
            alert('Error assigning categories. Please try again.');
        }
    }

    async removeCategories() {
        const selectedCategoryIds = this.getSelectedCategories();
        const selectedProductIds = Array.from(this.selectedProducts);
        
        if (selectedCategoryIds.length === 0) {
            alert('Please select at least one category to remove.');
            return;
        }
        
        if (selectedProductIds.length === 0) {
            alert('Please select at least one product.');
            return;
        }

        console.log(`🗑️ Removing ${selectedCategoryIds.length} categories from ${selectedProductIds.length} products`);
        
        try {
            for (const productId of selectedProductIds) {
                const product = this.products.find(p => p.id === productId);
                if (!product) continue;

                // Remove selected categories from product
                const currentCategories = product.categories || [];
                const newCategories = currentCategories.filter(cat => 
                    !selectedCategoryIds.includes(cat) && 
                    !selectedCategoryIds.includes(String(cat))
                );
                
                // Update in database
                await window.db.collection('products').doc(productId).update({
                    categories: newCategories,
                    lastModified: new Date()
                });
                
                // Update local data
                product.categories = newCategories;
                console.log(`✅ Updated ${product.name}: ${newCategories.length} categories remaining`);
            }
            
            alert(`Successfully removed categories from ${selectedProductIds.length} products!`);
            this.updateUI();
            this.loadProductCategories(); // Refresh the category display
            
        } catch (error) {
            console.error('❌ Error removing categories:', error);
            alert('Error removing categories. Please try again.');
        }
    }

    async clearAllCategories() {
        const selectedProductIds = Array.from(this.selectedProducts);
        
        if (selectedProductIds.length === 0) {
            alert('Please select at least one product.');
            return;
        }

        if (!confirm(`Are you sure you want to clear ALL categories from ${selectedProductIds.length} products?`)) {
            return;
        }

        console.log(`🧹 Clearing all categories from ${selectedProductIds.length} products`);
        
        try {
            for (const productId of selectedProductIds) {
                const product = this.products.find(p => p.id === productId);
                if (!product) continue;

                // Clear all categories
                await window.db.collection('products').doc(productId).update({
                    categories: [],
                    lastModified: new Date()
                });
                
                // Update local data
                product.categories = [];
                console.log(`✅ Cleared categories for ${product.name}`);
            }
            
            alert(`Successfully cleared all categories from ${selectedProductIds.length} products!`);
            this.updateUI();
            this.loadProductCategories(); // Refresh the category display
            
        } catch (error) {
            console.error('❌ Error clearing categories:', error);
            alert('Error clearing categories. Please try again.');
        }
    }

    // ===== UTILITY METHODS =====
    
    getSelectedCategories() {
        return Array.from(document.querySelectorAll('.category-checkbox:checked'))
            .map(checkbox => checkbox.value);
    }

    updateUI() {
        this.renderProductGrid();
        this.renderControls();
    }

    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        // You can enhance this to show UI notifications
        if (type === 'error') {
            alert('Error: ' + message);
        }
    }
}

// Global instance
let categoryManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be available
    let attempts = 0;
    while (typeof window.db === 'undefined' && attempts < 10) {
        console.log('⏳ Waiting for Firebase...');
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    if (typeof window.db === 'undefined') {
        console.error('❌ Firebase not available after 5 seconds');
        return;
    }
    
    categoryManager = new CategoryManager();
    await categoryManager.initialize();
});