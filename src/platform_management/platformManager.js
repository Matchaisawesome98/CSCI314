// platformManager.js - Manages service categories for CleanConnect

/**
 * CategoryManagementUI - Boundary class responsible for UI interactions
 * Handles all DOM interactions and UI updates for category management
 */
class CategoryManagementUI {
    constructor() {
        // Initialize instance variables
        this.categories = [];
        this.currentFilter = '';
        this.pendingDeleteCategoryCode = null; // Make sure this is initialized as null

        // Initialize controllers
        this.getCategoriesController = new GetCategoriesController();
        this.addCategoryController = new AddCategoryController();
        this.updateCategoryController = new UpdateCategoryController();
        this.deleteCategoryController = new DeleteCategoryController();
        this.searchCategoriesController = new SearchCategoriesController();

        // Initialize DOM elements and setup event listeners
        this.initDomElements();
        this.setupEventListeners();

        // Load categories
        this.loadCategories();
    }

    /**
     * Initialize DOM element references
     */
    initDomElements() {
        this.categoriesContainer = document.getElementById('categories-container');
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.errorContainer = document.getElementById('error-container');
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.addCategoryBtn = document.getElementById('add-category-btn-main');
        this.categoryModal = document.getElementById('category-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.categoryForm = document.getElementById('category-form');
        this.categoryId = document.getElementById('category-id');
        this.categoryName = document.getElementById('category-name');
        this.categoryDescription = document.getElementById('category-description');
        this.modalTitle = document.getElementById('modal-title');
        this.saveButton = document.getElementById('save-button');
        this.cancelButton = document.getElementById('cancel-button');
        this.deleteModal = document.getElementById('delete-modal');
        this.closeDeleteModalBtn = document.getElementById('close-delete-modal');
        this.cancelDeleteButton = document.getElementById('cancel-delete-button');
        this.confirmDeleteButton = document.getElementById('confirm-delete-button');
        this.logoElement = document.querySelector('.logo');

        // Create clear search button if it doesn't exist yet
        this.setupClearSearchButton();
    }

    /**
     * Setup clear search button
     */
    setupClearSearchButton() {
        // Check if the clear button already exists
        let clearBtn = document.getElementById('clear-search-btn');

        if (this.logoElement) {
            this.logoElement.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default anchor behavior
                window.location.reload(); // Reload the current page
            });
        }

        if (!clearBtn && this.searchInput) {
            // Create the clear button
            clearBtn = document.createElement('button');
            clearBtn.id = 'clear-search-btn';
            clearBtn.className = 'clear-search-btn';
            clearBtn.innerHTML = '✕';
            clearBtn.title = 'Clear search';
            clearBtn.style.position = 'absolute';
            clearBtn.style.right = '40px'; // Position it left of the search button
            clearBtn.style.top = '50%';
            clearBtn.style.transform = 'translateY(-50%)';
            clearBtn.style.background = 'none';
            clearBtn.style.border = 'none';
            clearBtn.style.color = '#757575';
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.fontSize = '16px';
            clearBtn.style.display = 'none'; // Hide it initially

            // Add the clear button to the search container
            const searchContainer = this.searchInput.parentElement;
            if (searchContainer) {
                searchContainer.appendChild(clearBtn);
            }

            // Store reference to the clear button
            this.clearSearchBtn = clearBtn;
        } else {
            this.clearSearchBtn = clearBtn;
        }
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Search functionality
        if (this.searchBtn && this.searchInput) {
            this.searchBtn.addEventListener('click', () => {
                const query = this.searchInput.value.trim();
                this.performSearch(query);
            });

            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = this.searchInput.value.trim();
                    this.performSearch(query);
                }
            });

            // Show/hide clear button based on search input
            this.searchInput.addEventListener('input', () => {
                if (this.clearSearchBtn) {
                    this.clearSearchBtn.style.display = this.searchInput.value ? 'block' : 'none';
                }
            });
        }

        // Clear search button
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Add category button
        if (this.addCategoryBtn) {
            this.addCategoryBtn.addEventListener('click', () => {
                this.showAddCategoryModal();
            });
        }

        // Modal close button
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Category form submission
        if (this.categoryForm) {
            this.categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
        }

        // Cancel button in modal
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Delete modal buttons
        if (this.closeDeleteModalBtn) {
            this.closeDeleteModalBtn.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        if (this.cancelDeleteButton) {
            this.cancelDeleteButton.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        if (this.confirmDeleteButton) {
            this.confirmDeleteButton.addEventListener('click', () => {
                this.confirmDeleteCategory();
            });
        }

        // Document-level event delegation for category actions
        document.addEventListener('click', (event) => {
            // Edit category button
            if (event.target.classList.contains('edit-btn')) {
                const categoryCode = event.target.getAttribute('data-id');
                this.showEditCategoryModal(categoryCode);
            }
            // Delete category button
            else if (event.target.classList.contains('delete-btn')) {
                const categoryCode = event.target.getAttribute('data-id');
                this.showDeleteConfirmation(categoryCode);
            }
        });
    }

    /**
     * Clear the search input and reset to show all categories
     */
    clearSearch() {
        // Clear the search input
        if (this.searchInput) {
            this.searchInput.value = '';

            // Hide the clear button
            if (this.clearSearchBtn) {
                this.clearSearchBtn.style.display = 'none';
            }
        }

        // Reset the current filter
        this.currentFilter = '';

        // Load all categories
        this.loadCategories();

        // Focus back on the search input
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Load all categories
     */
    async loadCategories() {
        try {
            // Show loading indicator
            this.showLoadingState();

            // Get categories from controller
            const result = await this.getCategoriesController.getCategories();

            if (result.success) {
                this.categories = result.data;
                console.log(`Loaded ${this.categories.length} categories`);
                this.displayCategories();
            } else {
                throw new Error(result.error || 'Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showErrorMessage('Failed to load categories. Please try again later.');
        } finally {
            // Hide loading indicator
            this.hideLoadingState();
        }
    }

    /**
     * Perform search for categories
     */
    async performSearch(query) {
        try {
            this.showLoadingState();
            this.currentFilter = query;

            if (query === '') {
                // If search is empty, just reset to show all categories
                await this.loadCategories();
                return;
            }

            const result = await this.searchCategoriesController.searchCategories(query);

            if (result.success) {
                this.categories = result.data;
                this.displayCategories();
                console.log(`Found ${this.categories.length} categories matching "${query}"`);

                // Display a "no results" message if needed
                if (this.categories.length === 0) {
                    this.showNotification(`No categories found matching "${query}"`, 'info');
                }
            } else {
                throw new Error(result.error || 'Search failed');
            }
        } catch (error) {
            console.error('Error searching categories:', error);
            this.showNotification(`Search failed: ${error.message}`, 'error');
            // Fall back to showing all categories
            await this.loadCategories();
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Display categories in the table
     */
    displayCategories() {
        if (!this.categoriesContainer) return;

        // Clear current content
        this.categoriesContainer.innerHTML = '';

        // Check if we have categories to display
        if (!this.categories || this.categories.length === 0) {
            this.categoriesContainer.innerHTML = '<tr><td colspan="4">No categories found</td></tr>';
            return;
        }

        // Display each category
        this.categories.forEach(category => {
            const row = this.createCategoryRow(category);
            this.categoriesContainer.appendChild(row);
        });
    }

    /**
     * Create a category table row
     */
    createCategoryRow(category) {
        const row = document.createElement('tr');

        // Create row content
        row.innerHTML = `
            <td>${category.category_code}</td>
            <td>${category.category_name}</td>
            <td>${category.description || 'No description provided'}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-id="${category.category_code}">Edit</button>
                <button class="delete-btn" data-id="${category.category_code}">Delete</button>
            </td>
        `;

        return row;
    }

    /**
     * Show the add category modal
     */
    showAddCategoryModal() {
        // Reset form fields
        this.categoryForm.reset();
        this.categoryId.value = '';

        // Set modal title
        this.modalTitle.textContent = 'Add New Category';

        // Show the modal
        this.categoryModal.style.display = 'block';
    }

    /**
     * Show the edit category modal
     */
    async showEditCategoryModal(categoryCode) {
        try {
            this.showLoadingState();

            // Find the category in our local data
            const category = this.categories.find(cat => cat.category_code === categoryCode);

            if (!category) {
                // If not in local data, fetch from API
                const result = await this.getCategoriesController.getCategoryByCode(categoryCode);
                if (result.success) {
                    this.populateEditForm(result.data);
                } else {
                    throw new Error(result.error || 'Failed to load category details');
                }
            } else {
                // Use local data
                this.populateEditForm(category);
            }

            // Set modal title
            this.modalTitle.textContent = 'Edit Category';

            // Show the modal
            this.categoryModal.style.display = 'block';
        } catch (error) {
            console.error('Error showing edit modal:', error);
            this.showNotification(`Failed to load category details: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Populate the edit form with category data
     */
    populateEditForm(category) {
        this.categoryId.value = category.category_code;
        this.categoryName.value = category.category_name;
        this.categoryDescription.value = category.description || '';
    }

    /**
     * Close the category modal
     */
    closeModal() {
        this.categoryModal.style.display = 'none';
        // Reset form and validation
        this.categoryForm.reset();
        document.getElementById('name-error').style.display = 'none';
        document.getElementById('description-error').style.display = 'none';
    }

    /**
     * Save category (add or update)
     */
    async saveCategory() {
        try {
            // Validate form fields
            if (!this.validateForm()) {
                return;
            }

            this.showLoadingState();

            const categoryData = {
                category_name: this.categoryName.value.trim(),
                description: this.categoryDescription.value.trim()
            };

            let result;

            // Check if we're adding or updating
            if (this.categoryId.value) {
                // Updating existing category
                result = await this.updateCategoryController.updateCategory(
                    this.categoryId.value,
                    categoryData
                );

                if (result.success) {
                    this.showNotification('Category updated successfully', 'success');
                } else {
                    throw new Error(result.error || 'Failed to update category');
                }
            } else {
                // Adding new category
                result = await this.addCategoryController.addCategory(categoryData);

                if (result.success) {
                    this.showNotification('Category added successfully', 'success');
                } else {
                    throw new Error(result.error || 'Failed to add category');
                }
            }

            // Close the modal
            this.closeModal();

            // Reload categories to reflect changes
            await this.loadCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            this.showNotification(`Failed to save category: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Validate the category form
     */
    validateForm() {
        let isValid = true;

        // Validate category name
        if (!this.categoryName.value.trim()) {
            document.getElementById('name-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('name-error').style.display = 'none';
        }

        // Validate description
        if (!this.categoryDescription.value.trim()) {
            document.getElementById('description-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('description-error').style.display = 'none';
        }

        return isValid;
    }

    /**
     * Show delete confirmation modal
     */
    showDeleteConfirmation(categoryCode) {
        console.log('Showing delete confirmation for category:', categoryCode);

        // Store the category code for deletion - fixed implementation
        this.pendingDeleteCategoryCode = categoryCode;

        // Also store on the modal element as a data attribute for redundancy
        this.deleteModal.setAttribute('data-category-code', categoryCode);

        // Show the delete confirmation modal
        this.deleteModal.style.display = 'block';
    }

    /**
     * Close delete confirmation modal
     */
    closeDeleteModal() {
        this.deleteModal.style.display = 'none';
    }

    /**
     * Confirm and execute category deletion
     */
    async confirmDeleteCategory() {
        try {
            // First try to get from class property
            let categoryCodeToDelete = this.pendingDeleteCategoryCode;

            // If that fails, try to get from the data attribute as backup
            if (!categoryCodeToDelete) {
                categoryCodeToDelete = this.deleteModal.getAttribute('data-category-code');
                console.log('Retrieved category code from data attribute:', categoryCodeToDelete);
            }

            // Check if we have a valid category code
            if (!categoryCodeToDelete) {
                throw new Error('No category selected for deletion');
            }

            console.log('Confirming deletion of category:', categoryCodeToDelete);
            this.showLoadingState();

            // Close the delete modal
            this.closeDeleteModal();

            // Delete the category
            const result = await this.deleteCategoryController.deleteCategory(categoryCodeToDelete);

            if (result.success) {
                this.showNotification('Category deleted successfully', 'success');

                // Reload categories to reflect changes
                await this.loadCategories();
            } else {
                throw new Error(result.error || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showNotification(`Failed to delete category: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
            // Clear the pending delete category code
            this.pendingDeleteCategoryCode = null;
            this.deleteModal.removeAttribute('data-category-code');
        }
    }

    /**
     * Show a notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('category-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'category-notification';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.padding = '15px 20px';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            notification.style.zIndex = '1000';
            notification.style.fontSize = '16px';
            notification.style.transition = 'all 0.3s ease';
            document.body.appendChild(notification);
        }

        // Set content and style
        notification.textContent = message;
        notification.className = `notification ${type}`;

        // Style based on notification type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
        }

        // Show notification
        notification.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /**
     * Show error message in the error container
     */
    showErrorMessage(message) {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'block';
            this.errorContainer.textContent = message;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'block';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    // Static initializer to create instance when document is loaded
    static {
        console.log('CategoryManagementUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;
            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new CategoryManagementUI instance');
                new CategoryManagementUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            // DOM is already loaded
            initializeUI();
        }

        // Also initialize when window is fully loaded
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring CategoryManagementUI is initialized');
            initializeUI();
        });
    }
}

// ===================== CONTROLLER LAYER =====================
// Each controller handles specific operations and business logic

/**
 * Controller for getting categories
 */
class GetCategoriesController {
    constructor() {
        console.log('Initializing GetCategoriesController');
        this.entity = new CategoryEntity();
    }

    async getCategories() {
        console.log('GetCategoriesController.getCategories called');
        return await this.entity.getCategories();
    }

    async getCategoryByCode(categoryCode) {
        console.log('GetCategoriesController.getCategoryByCode called with:', categoryCode);
        if (!categoryCode) {
            return { success: false, error: 'Missing category code' };
        }

        return await this.entity.getCategoryByCode(categoryCode);
    }
}

/**
 * Controller for adding a new category
 */
class AddCategoryController {
    constructor() {
        console.log('Initializing AddCategoryController');
        this.entity = new CategoryEntity();
    }

    async addCategory(categoryData) {
        console.log('AddCategoryController.addCategory called with:', categoryData);

        // Validate input
        if (!categoryData.category_name) {
            return { success: false, error: 'Category name is required' };
        }

        return await this.entity.addCategory(categoryData);
    }
}

/**
 * Controller for updating a category
 */
class UpdateCategoryController {
    constructor() {
        console.log('Initializing UpdateCategoryController');
        this.entity = new CategoryEntity();
    }

    async updateCategory(categoryCode, categoryData) {
        console.log('UpdateCategoryController.updateCategory called with:', categoryCode, categoryData);

        // Validate input
        if (!categoryCode) {
            return { success: false, error: 'Category code is required' };
        }

        if (!categoryData.category_name) {
            return { success: false, error: 'Category name is required' };
        }

        return await this.entity.updateCategory(categoryCode, categoryData);
    }
}

/**
 * Controller for deleting a category
 */
class DeleteCategoryController {
    constructor() {
        console.log('Initializing DeleteCategoryController');
        this.entity = new CategoryEntity();
    }

    async deleteCategory(categoryCode) {
        console.log('DeleteCategoryController.deleteCategory called with:', categoryCode);

        // Validate input
        if (!categoryCode) {
            return { success: false, error: 'Category code is required' };
        }

        return await this.entity.deleteCategory(categoryCode);
    }
}

/**
 * Controller for searching categories
 */
class SearchCategoriesController {
    constructor() {
        console.log('Initializing SearchCategoriesController');
        this.entity = new CategoryEntity();
    }

    async searchCategories(query) {
        console.log('SearchCategoriesController.searchCategories called with:', query);
        return await this.entity.searchCategories(query);
    }
}

// ===================== ENTITY LAYER =====================
// Entity class that handles all data operations related to categories
class CategoryEntity {
    constructor() {
        console.log('Initializing CategoryEntity');
        this.apiBaseUrl = 'http://localhost:3000/api'; // Base URL for API endpoints
    }

    /**
     * Get all categories from API
     */
    async getCategories() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error fetching categories:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a specific category by code
     */
    async getCategoryByCode(categoryCode) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories/${categoryCode}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error fetching category details:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a new category
     */
    async addCategory(categoryData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
                throw new Error(errorData.message || `Failed to add category. Status code: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error adding category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing category
     */
    async updateCategory(categoryCode, categoryData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories/${categoryCode}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
                throw new Error(errorData.message || `Failed to update category. Status code: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error updating category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(categoryCode) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories/${categoryCode}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
                throw new Error(errorData.message || `Failed to delete category. Status code: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error deleting category:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search categories - handles both category code and name searches
     */
    async searchCategories(query) {
        try {
            // First, check if search looks like a category code (starts with CAT followed by numbers)
            const isCatCodeSearch = /^CAT\d+$/i.test(query);

            if (isCatCodeSearch) {
                console.log('Search appears to be for a specific category code:', query);

                // Try to get the specific category by code
                try {
                    const categoryResponse = await fetch(`${this.apiBaseUrl}/categories/${query}`);

                    // If successful, return just this category as an array
                    if (categoryResponse.ok) {
                        const categoryData = await categoryResponse.json();
                        console.log('Found exact category match by code:', categoryData);

                        if (categoryData.success && categoryData.data) {
                            return {
                                success: true,
                                data: [categoryData.data]
                            };
                        }
                    }
                } catch (directLookupError) {
                    console.warn('Direct category lookup failed:', directLookupError);
                }
            }

            // Regular search using the search endpoint (handles category name searches)
            console.log('Performing general search for:', query);

            // Get all categories
            const allCategoriesResponse = await fetch(`${this.apiBaseUrl}/categories`);

            if (!allCategoriesResponse.ok) {
                const errorText = await allCategoriesResponse.text();
                throw new Error(`API error when getting categories: ${allCategoriesResponse.status} - ${errorText}`);
            }

            const allCategoriesData = await allCategoriesResponse.json();

            if (!allCategoriesData.success || !Array.isArray(allCategoriesData.data)) {
                throw new Error('Invalid response format from categories API');
            }

            // Perform client-side filtering for matching category names or codes
            const queryLower = query.toLowerCase();
            const matchingCategories = allCategoriesData.data.filter(category =>
                category.category_name.toLowerCase().includes(queryLower) ||
                category.category_code.toLowerCase().includes(queryLower)
            );

            console.log(`Found ${matchingCategories.length} categories matching "${query}"`);

            return {
                success: true,
                data: matchingCategories
            };
        } catch (error) {
            console.error('Entity: Error searching categories:', error);
            return { success: false, error: error.message };
        }
    }
}