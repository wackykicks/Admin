// Admin Categories Management
class AdminCategoryManager {
    constructor() {
        this.categories = [];
        this.products = [];
        this.selectedProducts = new Set(); // Changed to Set for multiple selection
        this.filteredProducts = [];
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

            console.log('Rendering category checkboxes...');
            this.renderCategoryCheckboxes();

            console.log('Rendering products list...');
            this.renderProductsList();

            console.log('Rendering category checkboxes...');
            this.renderCategoryCheckboxes();

            console.log('Rendering reorder list...');
            this.renderReorderList();

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

    renderReorderList() {
        const list = document.getElementById('reorderList');
        if (!list) return;

        // Fetch display order logic
        this.fetchCurrentDisplayOrder().then(order => {
            let sortedCats = [...this.categories];

            // Sort locally based on order array
            if (order && order.length > 0) {
                sortedCats.sort((a, b) => {
                    const idA = (a.categoryId || a.id).toLowerCase();
                    const idB = (b.categoryId || b.id).toLowerCase();
                    let indexA = order.indexOf(idA);
                    let indexB = order.indexOf(idB);
                    if (indexA === -1) indexA = 9999;
                    if (indexB === -1) indexB = 9999;
                    return indexA - indexB;
                });
            }

            // Check if we need to add the sort button in the header
            const sectionHeader = document.querySelector('.reorder-categories-section .btn-primary').parentElement;
            if (sectionHeader && !document.getElementById('reorderSortBtn')) {
                const sortBtn = document.createElement('button');
                sortBtn.id = 'reorderSortBtn';
                sortBtn.className = 'btn btn-secondary';
                sortBtn.style.marginRight = '10px';
                sortBtn.innerHTML = '<i class="fas fa-sort-numeric-down"></i> Sort by Numbers';
                sortBtn.onclick = () => adminCategoryManager.reorderByNumbers();
                sectionHeader.insertBefore(sortBtn, sectionHeader.lastElementChild);
            }

            list.innerHTML = sortedCats.map((cat, index) => `
                <div class="reorder-item" draggable="true" data-id="${cat.categoryId || cat.id}" style="background: white; border: 1px solid #ddd; padding: 10px 15px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; cursor: move; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        <i class="fas fa-grip-lines" style="color: #ccc; cursor: grab;"></i>
                        <div style="display: flex; flex-direction: column; align-items: center; width: 50px;">
                            <input type="number" class="form-control form-control-sm reorder-input" value="${index + 1}" min="1" 
                                   onchange="adminCategoryManager.handleNumberChange(this)"
                                   style="width: 50px; text-align: center; padding: 2px 5px;"
                                   data-original-index="${index}">
                        </div>
                        <img src="${cat.image || cat.icon || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid #eee;">
                        <div style="flex: 1;">
                            <span style="font-weight: 600; font-size: 1rem; color: #333;">${cat.name}</span>
                            <div style="font-size: 0.8rem; color: #777;">ID: ${cat.categoryId || cat.id}</div>
                        </div>
                    </div>
                    <div class="reorder-actions" style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-light border" onclick="adminCategoryManager.moveCategory('${cat.categoryId || cat.id}', -1)" title="Move Up">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn btn-sm btn-light border" onclick="adminCategoryManager.moveCategory('${cat.categoryId || cat.id}', 1)" title="Move Down">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                </div>
             `).join('');

            this.setupDragAndDrop();
        });
    }

    async fetchCurrentDisplayOrder() {
        if (typeof db !== 'undefined') {
            try {
                const settingsDoc = await db.collection('category').doc('CONFIG_display_order').get();
                if (settingsDoc.exists) {
                    return settingsDoc.data().order || [];
                }
            } catch (e) { console.warn('Error fetching order', e); }
        }
        // Fallback default order
        return ['all', 'today offer', 'smartwatch', 'gadgets', 'shoes', 'watches', 'wallet', 'belt', 'sunglasses', 'accessories'];
    }

    setupDragAndDrop() {
        const list = document.getElementById('reorderList');
        let draggedItem = null;

        list.querySelectorAll('.reorder-item').forEach(item => {
            item.addEventListener('dragstart', e => {
                draggedItem = item;
                e.dataTransfer.effectAllowed = 'move';
                item.style.opacity = '0.5';
            });

            item.addEventListener('dragend', () => {
                draggedItem = null;
                item.style.opacity = '1';
                // Update numbers
                this.updateReorderNumbers();
            });

            item.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const afterElement = this.getDragAfterElement(list, e.clientY);
                if (afterElement == null) {
                    list.appendChild(draggedItem);
                } else {
                    list.insertBefore(draggedItem, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.reorder-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    handleNumberChange(input) {
        // Just visual feedback or simple validation?
        // We defer the actual sorting to the "Sort by Numbers" button or manual trigger
        // Optionally, we could auto-sort after a delay.
        input.style.borderColor = '#ffc107'; // Highlight changed inputs
        input.style.backgroundColor = '#fff3cd';
    }

    reorderByNumbers() {
        const list = document.getElementById('reorderList');
        const items = [...list.querySelectorAll('.reorder-item')];

        // Sort items array based on the input values
        items.sort((a, b) => {
            const inputA = a.querySelector('input.reorder-input');
            const inputB = b.querySelector('input.reorder-input');
            const valA = parseInt(inputA.value) || 9999;
            const valB = parseInt(inputB.value) || 9999;
            return valA - valB;
        });

        // Re-append items in new order
        items.forEach(item => list.appendChild(item));

        // Normalize numbers (1, 2, 3...) after sort
        this.updateReorderNumbers();

        this.showMessage('List reordered based on numbers. Click "Save New Order" to apply.', 'info');
    }

    moveCategory(id, direction) {
        const list = document.getElementById('reorderList');
        const items = [...list.querySelectorAll('.reorder-item')];
        const index = items.findIndex(item => item.dataset.id === id);

        if (index === -1) return;

        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= items.length) return; // Out of bounds

        const itemToMove = items[index];
        if (direction === -1) {
            list.insertBefore(itemToMove, items[newIndex]);
        } else {
            if (newIndex + 1 < items.length) {
                list.insertBefore(itemToMove, items[newIndex + 1]);
            } else {
                list.appendChild(itemToMove);
            }
        }
        this.updateReorderNumbers();
    }

    updateReorderNumbers() {
        const list = document.getElementById('reorderList');
        [...list.querySelectorAll('.reorder-item')].forEach((item, index) => {
            const input = item.querySelector('input.reorder-input');
            if (input) {
                input.value = index + 1;
                input.style.borderColor = ''; // Reset style
                input.style.backgroundColor = '';
            }
        });
    }

    async saveCategoryOrder() {
        const list = document.getElementById('reorderList');
        const items = [...list.querySelectorAll('.reorder-item')];
        const newOrder = items.map(item => item.dataset.id.toLowerCase()); // Normalize IDs to lowercase

        console.log('💾 Saving new order:', newOrder);

        const saveBtn = document.querySelector('.reorder-categories-section .btn-primary');
        const originalText = saveBtn ? saveBtn.innerHTML : 'Save New Order';

        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }

        try {
            if (typeof db !== 'undefined') {
                await db.collection('category').doc('CONFIG_display_order').set({
                    order: newOrder,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Show success feedback
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                    saveBtn.classList.remove('btn-primary');
                    saveBtn.classList.add('btn-success');
                }

                this.showMessage('Order saved successfully!', 'success');
                // Use alert to be absolutely sure user sees it for now
                alert('Category order saved successfully!');

                setTimeout(() => {
                    if (saveBtn) {
                        saveBtn.innerHTML = originalText;
                        saveBtn.classList.remove('btn-success');
                        saveBtn.classList.add('btn-primary');
                        saveBtn.disabled = false;
                    }
                }, 2000);

            } else {
                this.showMessage('Cannot save: Firebase not available.', 'error');
                if (saveBtn) saveBtn.innerHTML = 'Error';
            }
        } catch (error) {
            console.error('Error saving order:', error);
            this.showMessage('Failed to save order: ' + error.message, 'error');
            alert('Error: ' + error.message); // Show error to user
            if (saveBtn) {
                saveBtn.innerHTML = 'Error';
                saveBtn.disabled = false;
            }
        }
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

            this.filteredProducts = [...this.products];
            this.updateProductCount();
            this.setupProductSearch();
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
                        <button class="action-btn btn-info" onclick="adminCategoryManager.viewCategoryProducts('${category.id}', '${category.name || 'Unnamed Category'}')">
                            <i class="fas fa-eye"></i> View Products
                        </button>
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

        container.innerHTML = this.filteredProducts.map(product => {
            const isSelected = this.selectedProducts.has(product.id);
            return `
                <div class="product-item ${isSelected ? 'selected' : ''}" 
                     data-product-id="${product.id}" 
                     onclick="adminCategoryManager.selectProduct('${product.id}')">
                    <img src="${product.img || product.imgUrl?.[0] || 'Logo/1000163691.jpg'}" 
                         alt="${product.name}" 
                         onerror="this.src='../Logo/1000163691.jpg'">
                    <div class="product-item-name">${product.name}</div>
                </div>
            `;
        }).join('');
    }

    renderCategoryCheckboxes() {
        const container = document.getElementById('categoriesCheckboxes');
        if (!container) {
            console.error('categoriesCheckboxes container not found!');
            return;
        }

        if (this.categories.length === 0) {
            container.innerHTML = '<p class="no-categories">No categories available</p>';
            return;
        }

        const checkboxesHTML = this.categories.map(category => {
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

        container.innerHTML = checkboxesHTML;
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

    viewCategoryProducts(categoryId, categoryName) {
        console.log('=== VIEW CATEGORY PRODUCTS ===');
        console.log('Category ID:', categoryId);
        console.log('Category Name:', categoryName);

        // Get products for this category
        const categoryProducts = this.getProductsForCategory(categoryId);

        console.log('Found products:', categoryProducts.length);
        categoryProducts.forEach(product => console.log('- ', product.name));

        // Create and show modal
        this.showCategoryProductsModal(categoryId, categoryName, categoryProducts);
    }

    getProductsForCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        const categoryName = category ? category.name : categoryId;

        return this.products.filter(product => {
            if (!product.categories || !Array.isArray(product.categories)) return false;

            // Check for exact ID match, name match, or common category identifiers
            return product.categories.includes(categoryId) ||
                product.categories.includes(categoryName) ||
                product.categories.includes(categoryName.toLowerCase()) ||
                (categoryName === "Today's Offers" && product.categories.includes("today offer"));
        });
    }

    showCategoryProductsModal(categoryId, categoryName, products) {
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('categoryProductsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'categoryProductsModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        // Generate products HTML
        let productsHTML = '';
        if (products.length === 0) {
            productsHTML = `
                <div class="no-products-message" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #333;">No Products Found</h3>
                    <p style="margin: 0; font-size: 0.9rem;">No products are currently assigned to this category.</p>
                    <button class="btn btn-primary" style="margin-top: 20px;" onclick="document.getElementById('categoryProductsModal').style.display='none'">
                        <i class="fas fa-arrow-left"></i> Go Back
                    </button>
                </div>
            `;
        } else {
            productsHTML = `
                <div class="category-products-grid">
                    ${products.map(product => {
                const firstImage = (product.imgUrl && product.imgUrl[0]) || product.img || '../Logo/1000163691.jpg';
                const price = product.newPrice || product.price || 'N/A';
                const oldPrice = product.oldPrice;

                // Check if product is out of stock
                const isOutOfStock = product.categories && product.categories.includes('out-of-stock');

                return `
                            <div class="category-product-card">
                                <div class="category-product-image">
                                    <img src="${firstImage}" alt="${product.name}" onerror="this.src='../Logo/1000163691.jpg'">
                                    ${isOutOfStock ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
                                </div>
                                <div class="category-product-info">
                                    <h4 class="category-product-name">${product.name}</h4>
                                    <div class="category-product-price">
                                        ${oldPrice ? `<span class="old-price">₹${oldPrice}</span>` : ''}
                                        <span class="new-price">₹${price}</span>
                                    </div>
                                    <div class="category-product-categories">
                                        ${(product.categories || []).map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                                    </div>
                                    <div class="category-product-actions">
                                        <a href="../product.html?id=${product.id}" target="_blank" class="btn btn-sm btn-primary">
                                            <i class="fas fa-eye"></i> View
                                        </a>
                                        <button class="btn btn-sm btn-warning" onclick="adminCategoryManager.editProductCategories('${product.id}')">
                                            <i class="fas fa-edit"></i> Edit Categories
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="adminCategoryManager.removeProductFromCategory('${product.id}', '${categoryId}', '${categoryName}')">
                                            <i class="fas fa-minus-circle"></i> Remove from Category
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-boxes"></i> Products in "${categoryName}" Category</h3>
                    <span class="close" onclick="document.getElementById('categoryProductsModal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="category-products-summary" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                        <strong>${products.length}</strong> product${products.length !== 1 ? 's' : ''} found in this category
                        ${products.length > 0 ? `
                            <div style="margin-top: 8px; font-size: 0.9rem; color: #666;">
                                <i class="fas fa-info-circle"></i> Click "View" to see product details or "Edit Categories" to modify category assignments
                            </div>
                        ` : ''}
                    </div>
                    ${productsHTML}
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    editProductCategories(productId) {
        // Find the product and select it for category editing
        this.selectedProduct = this.products.find(product => product.id === productId);

        if (this.selectedProduct) {
            // Close the category products modal
            document.getElementById('categoryProductsModal').style.display = 'none';

            // Select the product in the assignment section
            this.selectProduct(productId);

            // Scroll to the assignment section
            const assignmentSection = document.querySelector('.product-assignment-section');
            if (assignmentSection) {
                assignmentSection.scrollIntoView({ behavior: 'smooth' });
            }

            this.showMessage(`Selected "${this.selectedProduct.name}" for category editing`, 'info');
        }
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

    // Individual product selection (click on product card)
    selectProduct(productId) {
        console.log('🔄 Selecting/deselecting product:', productId);

        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
            console.log('❌ Removed product from selection');
        } else {
            this.selectedProducts.add(productId);
            console.log('✅ Added product to selection');
        }

        // Update selectedProduct for single product operations
        if (this.selectedProducts.size === 1) {
            const selectedProductId = Array.from(this.selectedProducts)[0];
            this.selectedProduct = this.products.find(p => p.id === selectedProductId);
            console.log('📦 Set single selected product:', this.selectedProduct?.name);
        } else {
            this.selectedProduct = null;
            console.log('📦 Cleared single selected product (multiple or none selected)');
        }

        console.log('📊 Total selected products:', this.selectedProducts.size);

        this.renderProductsList();
        this.renderSelectedProducts();
        this.updateSelectionCount();
        this.updateAssignmentForm();
    }

    selectAllProducts() {
        this.filteredProducts.forEach(product => {
            this.selectedProducts.add(product.id);
        });
        this.renderProductsList();
        this.renderSelectedProducts();
        this.updateSelectionCount();
        this.updateAssignmentForm();
    }

    clearAllProducts() {
        this.selectedProducts.clear();
        this.renderProductsList();
        this.renderSelectedProducts();
        this.updateSelectionCount();
        this.updateAssignmentForm();
    }

    // Removed toggleProductSelectionAll - use selectAllProducts() or clearAllProducts() directly

    updateSelectionCount() {
        const countElement = document.getElementById('selectionCount');
        if (countElement) {
            const count = this.selectedProducts.size;
            countElement.textContent = `${count} product${count !== 1 ? 's' : ''} selected`;
        }
    }

    updateProductCount() {
        const countElement = document.getElementById('totalProductCount');
        if (countElement) {
            countElement.textContent = `(${this.filteredProducts.length})`;
        }
    }

    setupProductSearch() {
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }
    }

    filterProducts(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                product.name?.toLowerCase().includes(term) ||
                product.categories?.some(cat =>
                    (typeof cat === 'string' ? cat : cat.name || cat).toLowerCase().includes(term)
                )
            );
        }

        this.renderProductsList();
        this.updateProductCount();
    }

    renderSelectedProducts() {
        const container = document.getElementById('selectedProducts');
        if (!container) return;

        if (this.selectedProducts.size === 0) {
            container.innerHTML = '<p>No products selected</p>';
            document.getElementById('categoryAssignmentForm').style.display = 'none';
            return;
        }

        // Get full product objects from selected IDs
        const selectedProductObjects = Array.from(this.selectedProducts)
            .map(productId => this.products.find(p => p.id === productId))
            .filter(product => product !== undefined);

        if (this.selectedProducts.size === 1) {
            // Single product display with consistent styling
            const product = selectedProductObjects[0];
            if (product) {
                container.innerHTML = `
                    <div class="single-product-selected">
                        <h4>1 Product Selected</h4>
                        <div class="selected-products-list">
                            <div class="selected-product-item">
                                <img src="${product.img || product.imgUrl?.[0] || '../Logo/1000163691.jpg'}" 
                                     alt="${product.name}"
                                     onerror="this.src='../Logo/1000163691.jpg'">
                                <span>${product.name}</span>
                            </div>
                        </div>
                        <p>Select categories to assign to this product:</p>
                    </div>
                `;
            }
        } else {
            // Multiple products display
            const productsList = selectedProductObjects
                .slice(0, 5) // Show max 5 products
                .map(product => `
                    <div class="selected-product-item">
                        <img src="${product.img || product.imgUrl?.[0] || '../Logo/1000163691.jpg'}" 
                             alt="${product.name}"
                             onerror="this.src='../Logo/1000163691.jpg'">
                        <span>${product.name}</span>
                    </div>
                `).join('');

            const additionalCount = this.selectedProducts.size > 5 ? ` and ${this.selectedProducts.size - 5} more` : '';

            container.innerHTML = `
                <div class="multiple-products-selected">
                    <h4>${this.selectedProducts.size} Products Selected</h4>
                    <div class="selected-products-list">${productsList}</div>
                    ${additionalCount ? `<p class="additional-count">${additionalCount}</p>` : ''}
                    <p>Select categories to assign to all selected products:</p>
                </div>
            `;
        }

        document.getElementById('categoryAssignmentForm').style.display = 'block';
        this.updateAssignmentForm();
    }

    updateAssignmentForm() {
        console.log('🔄 Updating assignment form...');
        console.log('📊 Selected products count:', this.selectedProducts.size);

        const assignmentModeSection = document.getElementById('assignmentModeSection');
        const bulkControls = document.getElementById('bulkAssignmentControls');

        // Always render category checkboxes when form is updated
        console.log('📋 Rendering category checkboxes...');
        this.renderCategoryCheckboxes();

        // Use setTimeout to ensure DOM has time to update after rendering
        setTimeout(() => {
            console.log('⏰ DOM update timeout reached, proceeding with form setup...');
            const checkboxContainer = document.getElementById('categoriesCheckboxes');
            console.log('📦 Checkboxes container found:', !!checkboxContainer);
            if (checkboxContainer) {
                const checkboxCount = checkboxContainer.querySelectorAll('input[type="checkbox"]').length;
                console.log('✅ Checkboxes in container:', checkboxCount);

                if (checkboxCount === 0) {
                    console.error('❌ No checkboxes found! Re-rendering...');
                    this.renderCategoryCheckboxes();
                }
            }

            if (this.selectedProducts.size > 1) {
                console.log('👥 Multiple products selected - setting up bulk mode');
                // Show bulk assignment controls for multiple products
                if (assignmentModeSection) assignmentModeSection.style.display = 'block';
                if (bulkControls) bulkControls.style.display = 'block';

                // Update form heading
                const formHeading = document.querySelector('#categoryAssignmentForm h3');
                if (formHeading) {
                    formHeading.textContent = `Assign Categories to ${this.selectedProducts.size} Products`;
                }

                // Show common categories for multiple products
                console.log('🔄 Loading common categories...');
                this.loadCommonCategories();

            } else if (this.selectedProducts.size === 1) {
                console.log('👤 Single product selected - setting up single mode');
                // Hide bulk controls for single product
                if (assignmentModeSection) assignmentModeSection.style.display = 'none';
                if (bulkControls) bulkControls.style.display = 'none';

                // Update form heading
                const formHeading = document.querySelector('#categoryAssignmentForm h3');
                if (formHeading) {
                    formHeading.textContent = 'Assign Categories';
                }

                // Ensure selectedProduct is set correctly
                if (!this.selectedProduct) {
                    const selectedProductId = Array.from(this.selectedProducts)[0];
                    this.selectedProduct = this.products.find(p => p.id === selectedProductId);
                    console.log('🔧 Fixed selectedProduct:', this.selectedProduct?.name);
                }

                // Load categories for single product
                console.log('🔄 Loading single product categories...');
                this.loadSingleProductCategories();

            } else {
                console.log('🚫 No products selected - clearing form');
                // No products selected - clear all checkboxes
                this.clearCategoryCheckboxes();
            }
        }, 150); // Increased delay to ensure DOM is ready
    }

    clearCategoryCheckboxes() {
        // Clear all category checkboxes
        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);
            if (checkbox) {
                checkbox.checked = false;
            }

            // Reset visual styling
            const categoryDiv = checkbox.closest('.category-checkbox');
            if (categoryDiv) {
                categoryDiv.style.background = 'white';
                categoryDiv.style.borderColor = '#e9ecef';
                categoryDiv.title = '';
            }
        });

        // Hide common categories info
        const infoContainer = document.getElementById('commonCategoriesInfo');
        if (infoContainer) {
            infoContainer.style.display = 'none';
        }
    }

    // Load categories for single product selection
    loadSingleProductCategories() {
        if (this.selectedProducts.size !== 1) return;

        const productId = Array.from(this.selectedProducts)[0];
        const product = this.products.find(p => p.id === productId);

        if (!product) return;

        // Clear all checkboxes first
        this.clearCategoryCheckboxes();

        // Check categories that match the product
        const productCategories = product.categories || [];

        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);

            if (checkbox) {
                const hasCategory = this.isProductInCategory(productCategories, category);
                checkbox.checked = hasCategory;
            }
        });



    }

    forceCheckboxUpdate(productCategories) {
        console.log('=== ENHANCED FORCE CHECKBOX UPDATE ===');
        const container = document.getElementById('categoriesCheckboxes');
        if (!container) return;

        // Get all checkboxes and force update them
        const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
        console.log(`🔄 Force updating ${allCheckboxes.length} checkboxes with enhanced matching`);
        console.log(`🏷️ Product categories to match:`, productCategories);

        allCheckboxes.forEach(checkbox => {
            const categoryName = checkbox.getAttribute('data-category-name');
            const categoryId = checkbox.value;

            if (categoryName && categoryId) {
                console.log(`\n🔍 Force checking category: "${categoryName}" (ID: ${categoryId})`);

                // Enhanced matching logic (same as in loadSingleProductCategories)
                const hasCategory = productCategories.includes(categoryId) ||
                    productCategories.includes(categoryName) ||
                    productCategories.includes(categoryName.toLowerCase()) ||
                    productCategories.includes(categoryName.toUpperCase()) ||
                    (categoryName === "Today's Offers" && productCategories.includes("today offer")) ||
                    (categoryName.toLowerCase().includes("today") && productCategories.includes("today offer")) ||
                    productCategories.some(prodCat => {
                        if (typeof prodCat === 'string' && typeof categoryName === 'string') {
                            return prodCat.toLowerCase().trim() === categoryName.toLowerCase().trim();
                        }
                        return false;
                    }) ||
                    productCategories.some(prodCat => {
                        if (typeof prodCat === 'string' && typeof categoryName === 'string') {
                            return prodCat.toLowerCase().includes(categoryName.toLowerCase()) ||
                                categoryName.toLowerCase().includes(prodCat.toLowerCase());
                        }
                        return false;
                    });

                console.log(`   Match result: ${hasCategory}`);

                if (hasCategory) {
                    console.log(`   ✅ FORCE MATCH: ${categoryName} - applying checked state and styling`);
                    checkbox.checked = true;
                    checkbox.setAttribute('checked', 'checked');

                    // Force visual styling with more aggressive CSS
                    const categoryDiv = checkbox.closest('.category-checkbox');
                    if (categoryDiv) {
                        categoryDiv.style.setProperty('background', 'rgba(34, 197, 94, 0.2)', 'important');
                        categoryDiv.style.setProperty('border-color', '#22c55e', 'important');
                        categoryDiv.style.setProperty('border-width', '2px', 'important');
                        categoryDiv.style.setProperty('border-style', 'solid', 'important');
                        categoryDiv.style.setProperty('box-shadow', '0 2px 8px rgba(34, 197, 94, 0.4)', 'important');
                        categoryDiv.classList.add('force-highlighted');
                        console.log(`   🎨 Applied enhanced styling to ${categoryName}`);
                    }
                } else {
                    console.log(`   ❌ No match for ${categoryName}`);
                    checkbox.checked = false;
                    checkbox.removeAttribute('checked');
                }
            }
        });

        console.log('=== END ENHANCED FORCE UPDATE ===');
    }

    forceCommonCategoriesUpdate(commonCategories) {
        console.log('=== FORCE COMMON CATEGORIES UPDATE ===');
        const container = document.getElementById('categoriesCheckboxes');
        if (!container) return;

        console.log('Common categories to force:', commonCategories.map(c => c.name));

        // Get all checkboxes and force update them
        const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
        console.log(`Force updating ${allCheckboxes.length} checkboxes for common categories`);

        allCheckboxes.forEach(checkbox => {
            const categoryName = checkbox.getAttribute('data-category-name');
            const categoryId = checkbox.value;

            if (categoryName && categoryId) {
                const isCommon = commonCategories.some(common =>
                    common.identifier === categoryId ||
                    common.name === categoryName
                );

                if (isCommon) {
                    console.log(`🔄 Force checking common category: ${categoryName}`);
                    checkbox.checked = true;
                    checkbox.setAttribute('checked', 'checked');

                    // Force visual styling
                    const categoryDiv = checkbox.closest('.category-checkbox');
                    if (categoryDiv) {
                        categoryDiv.style.setProperty('background', 'rgba(34, 197, 94, 0.15)', 'important');
                        categoryDiv.style.setProperty('border-color', '#22c55e', 'important');
                        categoryDiv.style.setProperty('border-width', '2px', 'important');
                        categoryDiv.style.setProperty('box-shadow', '0 2px 8px rgba(34, 197, 94, 0.3)', 'important');
                    }
                } else {
                    // Ensure non-common categories are unchecked
                    checkbox.checked = false;
                    checkbox.removeAttribute('checked');

                    const categoryDiv = checkbox.closest('.category-checkbox');
                    if (categoryDiv) {
                        categoryDiv.style.removeProperty('background');
                        categoryDiv.style.removeProperty('border-color');
                        categoryDiv.style.removeProperty('border-width');
                        categoryDiv.style.removeProperty('box-shadow');
                        categoryDiv.style.background = 'white';
                        categoryDiv.style.borderColor = '#e9ecef';
                        categoryDiv.style.borderWidth = '1px';
                    }
                }
            }
        });

        console.log('=== END FORCE COMMON CATEGORIES UPDATE ===');
    }

    loadCommonCategories() {
        if (this.selectedProducts.size < 2) return;

        // Get all selected products
        const selectedProductObjects = Array.from(this.selectedProducts)
            .map(productId => this.products.find(p => p.id === productId))
            .filter(product => product !== undefined);

        console.log(`Loading common categories for ${selectedProductObjects.length} products:`, selectedProductObjects.map(p => p.name));

        if (selectedProductObjects.length === 0) return;

        // Find common categories across all selected products
        const commonCategories = [];
        const allProductCategories = selectedProductObjects.map(product => product.categories || []);

        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const categoryName = category.name;

            // Check if this category is present in ALL selected products
            const isCommon = allProductCategories.every(productCats => {
                return productCats.includes(categoryIdentifier) ||
                    productCats.includes(category.id) ||
                    productCats.includes(categoryName) ||
                    productCats.includes(categoryName.toLowerCase()) ||
                    (categoryName === "Today's Offers" && productCats.includes("today offer"));
            });

            if (isCommon) {
                commonCategories.push({
                    identifier: categoryIdentifier,
                    name: categoryName
                });
            }
        });

        console.log('Common categories found:', commonCategories.map(c => c.name));

        // Clear all checkboxes first
        this.clearCategoryCheckboxes();

        // Update checkboxes to show common categories
        console.log('=== UPDATING CHECKBOXES FOR MULTIPLE PRODUCTS ===');

        // Double-check that checkboxes container exists and has content
        const container = document.getElementById('categoriesCheckboxes');
        if (!container) {
            console.error('❌ categoriesCheckboxes container not found!');
            return;
        }

        const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
        console.log(`Found ${allCheckboxes.length} checkboxes in DOM for multiple products`);

        if (allCheckboxes.length === 0) {
            console.error('❌ No checkboxes found in container - re-rendering...');
            this.renderCategoryCheckboxes();
            // Wait a bit more and try again
            setTimeout(() => this.loadCommonCategories(), 200);
            return;
        }

        let checkedCount = 0;

        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);

            console.log(`\n--- Checking category: ${category.name} ---`);
            console.log(`Category ID: ${category.id}, CategoryID: ${category.categoryId}, Identifier: ${categoryIdentifier}`);
            console.log(`Checkbox found:`, !!checkbox);

            if (checkbox) {
                const isCommon = commonCategories.some(common => common.identifier === categoryIdentifier);

                console.log(`Is common category: ${isCommon}`);

                if (isCommon) {
                    checkedCount++;
                    console.log(`✅ COMMON CATEGORY FOUND: ${category.name} - setting checkbox to checked`);
                }

                checkbox.checked = isCommon;

                // Force a visual update to ensure the checkbox state is visible
                if (isCommon) {
                    checkbox.setAttribute('checked', 'checked');
                } else {
                    checkbox.removeAttribute('checked');
                }

                // Add visual indication for common categories
                const categoryDiv = checkbox.closest('.category-checkbox');
                if (categoryDiv) {
                    if (isCommon) {
                        categoryDiv.style.background = 'rgba(34, 197, 94, 0.15)';
                        categoryDiv.style.borderColor = '#22c55e';
                        categoryDiv.style.borderWidth = '2px';
                        categoryDiv.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)';
                        categoryDiv.title = 'This category is common to all selected products';
                        categoryDiv.classList.add('common-category');
                        console.log(`Applied green styling to common category: ${category.name}`);
                    } else {
                        categoryDiv.style.background = 'white';
                        categoryDiv.style.borderColor = '#e9ecef';
                        categoryDiv.style.borderWidth = '1px';
                        categoryDiv.style.boxShadow = 'none';
                        categoryDiv.title = 'This category is not common to all selected products';
                        categoryDiv.classList.remove('common-category');
                    }
                }
            } else {
                console.error(`❌ Checkbox not found for category: ${category.name} (${categoryIdentifier})`);
            }
        });

        console.log(`\n=== MULTIPLE PRODUCTS SUMMARY ===`);
        console.log(`Expected common categories: ${commonCategories.length}`);
        console.log(`Successfully checked categories: ${checkedCount}`);
        console.log('Common category names:', commonCategories.map(c => c.name));
        console.log('=== END MULTIPLE PRODUCTS UPDATE ===');

        // Show information about common categories
        this.showCommonCategoriesInfo(commonCategories.length, selectedProductObjects.length, commonCategories.map(c => c.name));

        // Force another update after a brief delay to ensure visibility
        setTimeout(() => {
            this.forceCommonCategoriesUpdate(commonCategories);
        }, 300);
    }

    showCommonCategoriesInfo(commonCount, productCount, categoryNames = []) {
        // Find or create info container
        let infoContainer = document.getElementById('commonCategoriesInfo');
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'commonCategoriesInfo';
            infoContainer.style.cssText = `
                margin: 15px 0;
                padding: 12px 16px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                color: #1e40af;
                font-size: 14px;
                font-weight: 500;
            `;

            const categoriesCheckboxes = document.getElementById('categoriesCheckboxes');
            if (categoriesCheckboxes && categoriesCheckboxes.parentNode) {
                categoriesCheckboxes.parentNode.insertBefore(infoContainer, categoriesCheckboxes);
            }
        }

        if (commonCount > 0) {
            const categoryList = categoryNames.length > 0 ? `: <strong>${categoryNames.join(', ')}</strong>` : '';
            infoContainer.innerHTML = `
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                <strong>${commonCount}</strong> common ${commonCount === 1 ? 'category' : 'categories'} 
                found across all <strong>${productCount}</strong> selected products${categoryList} (should be highlighted in green below).
            `;
            infoContainer.style.display = 'block';
            infoContainer.style.background = 'rgba(34, 197, 94, 0.1)';
            infoContainer.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            infoContainer.style.color = '#15803d';
            infoContainer.className = 'common-categories-info';
        } else {
            infoContainer.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                No common categories found across all <strong>${productCount}</strong> selected products. 
                Categories you select will be added to all products.
            `;
            infoContainer.style.display = 'block';
            infoContainer.style.background = 'rgba(245, 158, 11, 0.1)';
            infoContainer.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            infoContainer.style.color = '#92400e';
            infoContainer.className = 'no-common-categories-info';
        }
    }

    showSingleProductCategoriesInfo(existingCount, productName, categoryNames = [], orphanedCategories = []) {
        // Find or create info container
        let infoContainer = document.getElementById('commonCategoriesInfo');
        if (!infoContainer) {
            infoContainer = document.createElement('div');
            infoContainer.id = 'commonCategoriesInfo';
            infoContainer.style.cssText = `
                margin: 15px 0;
                padding: 12px 16px;
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 8px;
                color: #15803d;
                font-size: 14px;
                font-weight: 500;
            `;

            const categoriesCheckboxes = document.getElementById('categoriesCheckboxes');
            if (categoriesCheckboxes && categoriesCheckboxes.parentNode) {
                categoriesCheckboxes.parentNode.insertBefore(infoContainer, categoriesCheckboxes);
            }
        }

        let infoHTML = '';

        if (existingCount > 0) {
            const categoryList = categoryNames.length > 0 ? `: <strong>${categoryNames.join(', ')}</strong>` : '';
            infoHTML = `
                <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
                <strong>${productName}</strong> is currently in <strong>${existingCount}</strong> 
                ${existingCount === 1 ? 'category' : 'categories'}${categoryList} (should be highlighted in green below).
            `;
            infoContainer.style.background = 'rgba(34, 197, 94, 0.1)';
            infoContainer.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            infoContainer.style.color = '#15803d';
        } else {
            infoHTML = `
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                <strong>${productName}</strong> is not currently assigned to any categories. 
                Select categories below to assign them.
            `;
            infoContainer.style.background = 'rgba(59, 130, 246, 0.1)';
            infoContainer.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            infoContainer.style.color = '#1e40af';
        }

        // Add orphaned categories warning if present
        if (orphanedCategories && orphanedCategories.length > 0) {
            infoHTML += `
                <div style="margin-top: 12px; padding: 10px; background: rgba(239, 68, 68, 0.1); 
                     border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px; color: #dc2626;"></i>
                    <strong style="color: #dc2626;">Warning:</strong> This product has <strong>${orphanedCategories.length}</strong> 
                    orphaned ${orphanedCategories.length === 1 ? 'category' : 'categories'}: 
                    <strong>${orphanedCategories.join(', ')}</strong>
                    <br>
                    <small style="color: #666; margin-top: 4px; display: block;">
                        These categories don't exist in the system and may cause issues. 
                        <a href="#" onclick="cleanProductCategories('${this.selectedProducts.size === 1 ? Array.from(this.selectedProducts)[0] : ''}', false); return false;" 
                           style="color: #dc2626; text-decoration: underline;">Click here to remove them</a>
                    </small>
                </div>
            `;
        }

        infoContainer.innerHTML = infoHTML;
        infoContainer.style.display = 'block';
    }

    loadProductCategories() {
        // Legacy method - redirect to new methods
        if (this.selectedProducts.size === 1) {
            this.loadSingleProductCategories();
        } else if (this.selectedProducts.size > 1) {
            this.loadCommonCategories();
        } else {
            this.clearCategoryCheckboxes();
        }
    }

    // Save categories for single product
    async saveProductCategories() {
        console.log('� Saving categories for single product...');

        if (this.selectedProducts.size !== 1) {
            this.showMessage('Please select exactly one product.', 'error');
            return;
        }

        const productId = Array.from(this.selectedProducts)[0];
        const product = this.products.find(p => p.id === productId);

        if (!product) {
            this.showMessage('Product not found.', 'error');
            return;
        }

        // Get selected categories from checkboxes (this replaces all categories)
        const selectedCategories = this.getSelectedCategories();

        console.log(`Updating ${product.name} with categories:`, selectedCategories);
        console.log(`Previous categories:`, product.categories || []);

        try {
            // Update in database - this completely replaces the categories array
            await db.collection('products').doc(productId).update({
                categories: selectedCategories,
                lastModified: new Date()
            });

            // Update local data
            product.categories = selectedCategories;

            this.showMessage(`Updated "${product.name}" with ${selectedCategories.length} categories.`, 'success');
            this.renderCategoriesTable();

        } catch (error) {
            console.error('Error saving categories:', error);
            this.showMessage('Error saving categories.', 'error');
        }
    }

    async saveBulkProductCategories() {
        console.log('💾 Saving categories for multiple products...');

        if (this.selectedProducts.size === 0) {
            this.showMessage('No products selected.', 'error');
            return;
        }

        // Debug: Check if categoriesCheckboxes container exists
        const container = document.getElementById('categoriesCheckboxes');
        console.log('categoriesCheckboxes container:', container);
        console.log('Container HTML:', container ? container.innerHTML.substring(0, 200) + '...' : 'NOT FOUND');

        const selectedCategories = this.getSelectedCategories();

        if (selectedCategories.length === 0) {
            this.showMessage('Please select at least one category.', 'error');
            return;
        }



        // Get full product objects from selected IDs
        const productArray = Array.from(this.selectedProducts)
            .map(productId => this.products.find(p => p.id === productId))
            .filter(product => product !== undefined);
        console.log('Products to process:', productArray.length);
        let successCount = 0;
        let errorCount = 0;

        try {
            console.log('Starting product processing...');
            this.showMessage(`Processing ${productArray.length} products...`, 'info');

            // Process each product
            for (const product of productArray) {
                try {
                    const assignmentMode = document.querySelector('input[name="assignmentMode"]:checked')?.value || 'replace';
                    let finalCategories = [];

                    if (assignmentMode === 'replace') {
                        // Replace mode: use only selected categories
                        finalCategories = [...selectedCategories];
                    } else if (assignmentMode === 'remove') {
                        // Remove mode: remove selected categories from existing ones
                        const existingCategories = product.categories || [];
                        finalCategories = existingCategories.filter(cat => !selectedCategories.includes(cat));
                    } else {
                        // Add mode: add selected categories to existing ones
                        const existingCategories = product.categories || [];
                        finalCategories = [...new Set([...existingCategories, ...selectedCategories])];
                    }

                    // Update product in database
                    if (typeof db !== 'undefined') {
                        console.log(`Updating database for product: ${product.name}`);
                        await db.collection('products').doc(product.id).update({
                            categories: finalCategories,
                            updatedAt: new Date().toISOString()
                        });
                        console.log(`Database update successful for: ${product.name}`);
                    } else {
                        console.warn('Database (db) is not defined, skipping database update');
                    }

                    // Update local product data
                    product.categories = finalCategories;
                    const productIndex = this.products.findIndex(p => p.id === product.id);
                    if (productIndex > -1) {
                        this.products[productIndex].categories = finalCategories;
                    }

                    successCount++;
                    console.log(`Successfully processed: ${product.name}`);
                } catch (error) {
                    console.error(`Error updating product ${product.name}:`, error);
                    errorCount++;
                }
            }

            // Show results
            if (errorCount === 0) {
                this.showMessage(`Successfully updated ${successCount} products!`, 'success');
            } else {
                this.showMessage(`Updated ${successCount} products, ${errorCount} failed.`, 'error');
            }

            // Clear selection and refresh
            console.log('Clearing selection and refreshing display...');
            this.clearAllProducts();
            this.renderCategoriesTable(); // Update product counts
            console.log('=== BULK CATEGORY ASSIGNMENT COMPLETE ===');

        } catch (error) {
            console.error('Error in bulk category assignment:', error);
            console.error('Error stack:', error.stack);
            this.showMessage('Error processing bulk assignment. Please try again.', 'error');
        }
    }

    // Helper function to get selected categories from checkboxes
    getSelectedCategories() {
        const selectedCategories = [];

        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);

            if (checkbox && checkbox.checked) {
                // Handle special mappings
                if (category.name === "Today's Offers") {
                    selectedCategories.push("today offer");
                } else {
                    selectedCategories.push(categoryIdentifier);
                }
            }
        });

        return selectedCategories;
    }

    // Helper function to check if product has a category
    isProductInCategory(productCategories, category) {
        if (!productCategories || !Array.isArray(productCategories)) {
            return false;
        }

        const categoryIdentifier = category.categoryId || category.id;

        // Check various matching patterns
        return productCategories.some(prodCat => {
            const pc = String(prodCat).trim();

            // Exact matches
            if (pc === categoryIdentifier || pc === category.id || pc === category.name) {
                return true;
            }

            // Case insensitive name match
            if (pc.toLowerCase() === category.name.toLowerCase()) {
                return true;
            }

            // Special case for Today's Offers
            if (category.name === "Today's Offers" && pc === "today offer") {
                return true;
            }

            return false;
        });
    }

    async removeProductCategories() {
        console.log('🗑️ Removing categories from products...');

        if (this.selectedProducts.size === 0) {
            this.showMessage('No products selected.', 'error');
            return;
        }

        const selectedCategories = this.getSelectedCategories();

        if (selectedCategories.length === 0) {
            this.showMessage('Please select at least one category to remove.', 'error');
            return;
        }

        const productArray = Array.from(this.selectedProducts)
            .map(productId => this.products.find(p => p.id === productId))
            .filter(product => product !== undefined);

        let successCount = 0;
        let errorCount = 0;

        try {
            for (const product of productArray) {
                try {
                    const existingCategories = product.categories || [];
                    const finalCategories = existingCategories.filter(cat => !selectedCategories.includes(cat));

                    // Update in database
                    if (typeof db !== 'undefined') {
                        await db.collection('products').doc(product.id).update({
                            categories: finalCategories,
                            updatedAt: new Date().toISOString()
                        });
                    }

                    // Update local data
                    product.categories = finalCategories;
                    const productIndex = this.products.findIndex(p => p.id === product.id);
                    if (productIndex > -1) {
                        this.products[productIndex].categories = finalCategories;
                    }

                    successCount++;
                } catch (error) {
                    console.error(`Error removing categories from product ${product.name}:`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                this.showMessage(`Successfully removed categories from ${successCount} products!`, 'success');
            } else {
                this.showMessage(`Removed categories from ${successCount} products, ${errorCount} failed.`, 'error');
            }

            this.clearAllProducts();
            this.renderCategoriesTable();

        } catch (error) {
            console.error('Error in removeProductCategories:', error);
            this.showMessage('Error removing categories.', 'error');
        }
    }

    async removeProductFromCategory(productId, categoryId, categoryName) {
        if (!confirm(`Remove this product from "${categoryName}" category?`)) {
            return;
        }

        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                this.showMessage('Product not found.', 'error');
                return;
            }

            const existingCategories = product.categories || [];

            // Find the category identifier to remove
            const category = this.categories.find(cat => cat.id === categoryId);
            const categoryToRemove = category ? (category.name === "Today's Offers" ? "today offer" : (category.categoryId || category.id)) : categoryId;

            const finalCategories = existingCategories.filter(cat => cat !== categoryToRemove);

            // Update in database
            if (typeof db !== 'undefined') {
                await db.collection('products').doc(productId).update({
                    categories: finalCategories,
                    updatedAt: new Date().toISOString()
                });
            }

            // Update local data
            product.categories = finalCategories;
            const productIndex = this.products.findIndex(p => p.id === productId);
            if (productIndex > -1) {
                this.products[productIndex].categories = finalCategories;
            }

            this.showMessage(`Removed product from "${categoryName}" category!`, 'success');
            this.renderCategoriesTable();

            // Close the modal and refresh the category view
            document.getElementById('categoryProductsModal').style.display = 'none';

        } catch (error) {
            console.error('Error removing product from category:', error);
            this.showMessage('Error removing product from category.', 'error');
        }
    }

    previewCategoryChanges() {
        if (this.selectedProducts.size === 0) {
            this.showMessage('No products selected for preview.', 'error');
            return;
        }

        // Get selected and deselected categories
        const selectedCategories = [];
        const deselectedCategories = [];

        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            const checkbox = document.getElementById(`cat_${categoryIdentifier}`);

            if (checkbox) {
                const categoryInfo = {
                    id: categoryIdentifier,
                    name: category.name
                };

                if (checkbox.checked) {
                    selectedCategories.push(categoryInfo);
                } else {
                    deselectedCategories.push(categoryInfo);
                }
            }
        });

        if (selectedCategories.length === 0 && deselectedCategories.length === 0) {
            this.showMessage('No category changes detected. Please select or deselect categories to preview changes.', 'error');
            return;
        }

        // Get assignment mode
        const assignmentMode = document.querySelector('input[name="assignmentMode"]:checked')?.value || 'add';

        // Create preview content
        const productArray = Array.from(this.selectedProducts)
            .map(productId => this.products.find(p => p.id === productId))
            .filter(product => product !== undefined);
        const productNames = productArray.map(p => p.name).slice(0, 5);

        let previewText = `Preview for ${this.selectedProducts.size} product(s):\n\n`;

        if (assignmentMode === 'replace') {
            const categoryNames = selectedCategories.map(c => c.name);
            previewText += `Mode: Replace all existing categories\n`;
            previewText += `New categories: ${categoryNames.length > 0 ? categoryNames.join(', ') : 'None'}\n`;
        } else {
            if (selectedCategories.length > 0) {
                const addNames = selectedCategories.map(c => c.name);
                previewText += `✅ Add categories: ${addNames.join(', ')}\n`;
            }
            if (deselectedCategories.length > 0) {
                const removeNames = deselectedCategories.map(c => c.name);
                previewText += `❌ Remove categories: ${removeNames.join(', ')}\n`;
            }
        }

        previewText += `\nAffected products: ${productNames.join(', ')}`;
        if (this.selectedProducts.size > 5) {
            previewText += ` and ${this.selectedProducts.size - 5} more`;
        }

        if (confirm(previewText + '\n\nProceed with these changes?')) {
            this.saveBulkProductCategories();
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

    // Debug function to help identify category matching issues
    debugProductCategories(productId = null) {
        console.log('\n🔧 === PRODUCT CATEGORY DEBUG MODE ===');

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                console.error(`❌ Product not found with ID: ${productId}`);
                return;
            }
            this.debugSingleProduct(product);
        } else if (this.selectedProducts.size === 1) {
            const selectedProductId = Array.from(this.selectedProducts)[0];
            const product = this.products.find(p => p.id === selectedProductId);
            if (product) {
                this.debugSingleProduct(product);
            }
        } else {
            console.log('🔍 Debugging all products...');
            this.products.forEach(product => {
                this.debugSingleProduct(product);
            });
        }

        console.log('🔧 === END DEBUG MODE ===\n');
    }

    debugSingleProduct(product) {
        console.log(`\n📦 PRODUCT: "${product.name}" (ID: ${product.id})`);
        console.log(`🏷️ Categories:`, product.categories || []);
        console.log(`📊 Categories type:`, typeof (product.categories));
        console.log(`📊 Categories array:`, Array.isArray(product.categories));

        if (product.categories && Array.isArray(product.categories)) {
            product.categories.forEach((category, index) => {
                console.log(`   [${index}] "${category}" (type: ${typeof category})`);
            });

            // Test against available system categories
            console.log(`🎯 Matching against system categories:`);
            this.categories.forEach(systemCategory => {
                const categoryIdentifier = systemCategory.categoryId || systemCategory.id;
                const matches = product.categories.some(prodCat => {
                    return prodCat === categoryIdentifier ||
                        prodCat === systemCategory.id ||
                        prodCat === systemCategory.name ||
                        (typeof prodCat === 'string' && typeof systemCategory.name === 'string' &&
                            prodCat.toLowerCase().trim() === systemCategory.name.toLowerCase().trim());
                });

                if (matches) {
                    console.log(`   ✅ "${systemCategory.name}" should be highlighted`);
                } else {
                    console.log(`   ❌ "${systemCategory.name}" should NOT be highlighted`);
                }
            });

            // Check for orphaned categories (categories in product but not in system)
            console.log(`🔍 Checking for orphaned categories:`);
            const orphanedCategories = product.categories.filter(prodCat => {
                return !this.categories.some(systemCategory => {
                    const categoryIdentifier = systemCategory.categoryId || systemCategory.id;
                    return prodCat === categoryIdentifier ||
                        prodCat === systemCategory.id ||
                        prodCat === systemCategory.name ||
                        (typeof prodCat === 'string' && typeof systemCategory.name === 'string' &&
                            prodCat.toLowerCase().trim() === systemCategory.name.toLowerCase().trim());
                });
            });

            if (orphanedCategories.length > 0) {
                console.warn(`⚠️ ORPHANED CATEGORIES FOUND: ${orphanedCategories.join(', ')}`);
                console.log(`   These categories exist in the product but not in the system category list`);
                console.log(`   This may cause display/removal issues`);
            }
        } else {
            console.warn(`⚠️ Product has no categories or categories is not an array`);
        }
    }

    // Function to clean up orphaned categories from products
    async cleanProductCategories(productId = null, dryRun = true) {
        console.log('\n🧹 === CATEGORY CLEANUP MODE ===');
        console.log(`Dry run: ${dryRun} (set to false to actually update)`);

        const productsToClean = productId ?
            [this.products.find(p => p.id === productId)].filter(p => p) :
            this.products;

        if (productsToClean.length === 0) {
            console.log('❌ No products found to clean');
            return;
        }

        const validCategoryIds = new Set();
        this.categories.forEach(category => {
            const categoryIdentifier = category.categoryId || category.id;
            validCategoryIds.add(categoryIdentifier);
            validCategoryIds.add(category.id);
            validCategoryIds.add(category.name);
            validCategoryIds.add(category.name.toLowerCase());
            if (category.name === "Today's Offers") {
                validCategoryIds.add("today offer");
            }
        });

        console.log('Valid category identifiers:', Array.from(validCategoryIds));

        let cleanedProducts = 0;
        let totalOrphanedRemoved = 0;

        for (const product of productsToClean) {
            if (!product.categories || !Array.isArray(product.categories)) continue;

            const originalCategories = [...product.categories];
            const cleanedCategories = product.categories.filter(prodCat => validCategoryIds.has(prodCat));
            const orphanedCategories = originalCategories.filter(cat => !cleanedCategories.includes(cat));

            if (orphanedCategories.length > 0) {
                console.log(`\n🧹 Product: "${product.name}"`);
                console.log(`   Original: ${originalCategories.join(', ')}`);
                console.log(`   Cleaned: ${cleanedCategories.join(', ')}`);
                console.log(`   Orphaned: ${orphanedCategories.join(', ')}`);

                if (!dryRun) {
                    try {
                        // Update in database
                        if (typeof db !== 'undefined') {
                            await db.collection('products').doc(product.id).update({
                                categories: cleanedCategories,
                                updatedAt: new Date().toISOString()
                            });
                        }

                        // Update local data
                        product.categories = cleanedCategories;
                        const productIndex = this.products.findIndex(p => p.id === product.id);
                        if (productIndex > -1) {
                            this.products[productIndex].categories = cleanedCategories;
                        }

                        console.log(`   ✅ Updated successfully`);
                    } catch (error) {
                        console.error(`   ❌ Error updating product: ${error.message}`);
                    }
                }

                cleanedProducts++;
                totalOrphanedRemoved += orphanedCategories.length;
            }
        }

        console.log(`\n📊 CLEANUP SUMMARY:`);
        console.log(`   Products processed: ${productsToClean.length}`);
        console.log(`   Products with orphaned categories: ${cleanedProducts}`);
        console.log(`   Total orphaned categories removed: ${totalOrphanedRemoved}`);

        if (dryRun) {
            console.log(`\n💡 To actually perform cleanup, run: cleanProductCategories(null, false)`);
        } else {
            console.log(`\n✅ Cleanup completed! Refreshing UI...`);
            this.renderCategoriesTable();
            if (this.selectedProducts.size === 1) {
                setTimeout(() => this.loadSingleProductCategories(), 500);
            }
        }

        console.log('🧹 === END CLEANUP MODE ===\n');
    }
}

// Debug function for browser console
function debugCurrentProduct() {
    if (!window.adminCategoryManager || !window.adminCategoryManager.selectedProduct) {
        console.log('❌ No product selected or manager not available');
        return;
    }

    const product = window.adminCategoryManager.selectedProduct;
    console.log('🐛 === DEBUGGING CURRENT PRODUCT ===');
    console.log('Product name:', product.name);
    console.log('Product categories:', product.categories);
    console.log('Categories type:', typeof product.categories);
    console.log('Categories length:', product.categories?.length);

    if (product.categories) {
        console.log('\n📋 Individual product categories:');
        product.categories.forEach((cat, i) => {
            console.log(`  [${i}]: "${cat}" (type: ${typeof cat})`);
        });
    }

    console.log('\n🗂️ System categories:');
    window.adminCategoryManager.categories.forEach((cat, i) => {
        console.log(`  [${i}]: "${cat.name}" (ID: ${cat.id}, CategoryID: ${cat.categoryId})`);
    });

    console.log('\n☑️ Checkbox states:');
    document.querySelectorAll('.category-checkbox').forEach((cb, i) => {
        console.log(`  [${i}]: id="${cb.id}", value="${cb.value}", checked=${cb.checked}`);
    });

    // Test matching logic
    console.log('\n🎯 Testing matches:');
    if (product.categories && window.adminCategoryManager.categories) {
        window.adminCategoryManager.categories.forEach(sysCat => {
            const categoryIdentifier = sysCat.categoryId || sysCat.id;
            let matched = false;
            let reason = '';

            product.categories.forEach(prodCat => {
                if (String(prodCat).trim() === categoryIdentifier) {
                    matched = true;
                    reason = 'ID match';
                } else if (String(prodCat).trim() === sysCat.id) {
                    matched = true;
                    reason = 'category.id match';
                } else if (String(prodCat).toLowerCase() === sysCat.name.toLowerCase()) {
                    matched = true;
                    reason = 'name match';
                } else if (sysCat.name === "Today's Offers" && String(prodCat).trim() === "today offer") {
                    matched = true;
                    reason = 'special mapping';
                }
            });

            console.log(`  "${sysCat.name}" (${categoryIdentifier}): ${matched ? '✅' : '❌'} ${reason}`);
        });
    }

    return product;
}

// Test function to manually reload categories
function reloadCategories() {
    if (window.adminCategoryManager && window.adminCategoryManager.selectedProduct) {
        console.log('🔄 Manually reloading categories...');
        window.adminCategoryManager.loadSingleProductCategories();
    } else {
        console.log('❌ No product selected');
    }
}

// Global functions for onclick handlers
// Global functions for bulk product selection
function selectAllProducts() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.selectAllProducts();
    }
}

function clearAllProducts() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.clearAllProducts();
    }
}

function selectProduct(productId) {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.selectProduct(productId);
    }
}

function saveBulkProductCategories() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.saveBulkProductCategories();
    }
}

function previewCategoryChanges() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.previewCategoryChanges();
    }
}

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

// Debug function for troubleshooting category issues
function debugProductCategories(productId = null) {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.debugProductCategories(productId);
    } else {
        console.error('AdminCategoryManager not available');
    }
}

// Cleanup function for removing orphaned categories
function cleanProductCategories(productId = null, dryRun = true) {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.cleanProductCategories(productId, dryRun);
    } else {
        console.error('AdminCategoryManager not available');
    }
}

// Remove categories from selected products
function removeProductCategories() {
    if (typeof adminCategoryManager !== 'undefined') {
        adminCategoryManager.removeProductCategories();
    } else {
        console.error('AdminCategoryManager not available');
    }
}

// Initialize admin when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminCategoryManager = new AdminCategoryManager();
});

// Export for global use
window.AdminCategoryManager = AdminCategoryManager;