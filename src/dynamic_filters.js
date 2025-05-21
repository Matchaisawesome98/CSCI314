//Dynamically display the filter categories


// Class to handle dynamic category filtering
class DynamicCategoryFilters {
    constructor() {
        this.filterContainer = document.querySelector('.filter-options');
        this.initialized = false;
        this.categories = [];
        this.apiBaseUrl = 'http://localhost:3000/api';

        // Initialize the filters
        this.init();
    }

    // Initialize the component
    async init() {
        if (this.initialized) return;

        try {
            // First try to fetch categories from the API
            await this.fetchCategories();

            // Then render the filter chips
            this.renderFilterChips();

            // Set up event listeners
            this.setupFilterListeners();

            this.initialized = true;
            console.log('Dynamic category filters initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dynamic filters:', error);
            // Fallback to the existing static filters if there's an error
        }
    }

    // Fetch categories from the API
    async fetchCategories() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                this.categories = result.data;
                console.log('Categories fetched successfully:', this.categories);
                return this.categories;
            } else {
                throw new Error(result.message || 'Failed to get categories');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    // Render the filter chips based on categories
    renderFilterChips() {
        // Clear existing filter chips
        if (this.filterContainer) {
            this.filterContainer.innerHTML = '';

            // Add the "All Services" filter first
            const allFilter = document.createElement('div');
            allFilter.className = 'filter-chip active';
            allFilter.setAttribute('data-filter', 'all');
            allFilter.textContent = 'All Services';
            this.filterContainer.appendChild(allFilter);

            // Add the rest of the category filters
            this.categories.forEach(category => {
                const filterChip = document.createElement('div');
                filterChip.className = 'filter-chip';

                // Create a data-filter attribute from the category name
                // Convert to lowercase and use only the first word for simplicity
                const filterValue = category.category_name.toLowerCase().split(' ')[0];
                filterChip.setAttribute('data-filter', filterValue);

                // Set the display text to the full category name
                filterChip.textContent = category.category_name;

                this.filterContainer.appendChild(filterChip);
            });
        }
    }

    // Set up event listeners for the filter chips
    setupFilterListeners() {
        const filterChips = document.querySelectorAll('.filter-chip');
        if (!filterChips?.length) return;

        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove active class from all chips
                filterChips.forEach(c => c.classList.remove('active'));

                // Add active class to the clicked chip
                chip.classList.add('active');

                // Get the filter value
                const filter = chip.getAttribute('data-filter');

                // Apply the filter
                this.applyFilter(filter);
            });
        });
    }

    // Apply the selected filter
    applyFilter(filter) {
        const servicesContainer = document.getElementById('services-container');
        if (!servicesContainer) return;

        // If we're using a page instance from readServicePage
        if (window.existingReadPage) {
            window.existingReadPage.displayServices(filter);
            return;
        }

        // If we have access to the loadServices function with filters
        if (typeof loadServices === 'function') {
            // Check if loadServices accepts a filter parameter
            const originalFn = loadServices.toString();
            if (originalFn.includes('filter')) {
                loadServices(filter);
                return;
            }
        }

        // Fallback to manual DOM filtering if neither of the above methods work
        const serviceCards = servicesContainer.querySelectorAll('.service-card');

        if (filter === 'all') {
            // Show all cards
            serviceCards.forEach(card => {
                card.style.display = 'flex';
            });
        } else {
            // Filter the cards based on category
            serviceCards.forEach(card => {
                const cardCategory = (card.querySelector('.tag')?.textContent || '').toLowerCase();

                if (cardCategory.includes(filter)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    }
}

// Initialize the dynamic filters when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a page with filters
    if (document.querySelector('.filter-options')) {
        window.dynamicFilters = new DynamicCategoryFilters();
    }
});

// Update the readServiceController to work with the dynamic filters
// This code extends the existing readServiceController class
const originalReadServiceController = window.readServiceController || null;

if (originalReadServiceController) {
    class ExtendedReadServiceController extends originalReadServiceController {
        async readCleaningServiceController(filter = 'all') {
            const result = await this.entity.readCleaningService();

            if (!result.success) {
                return result;
            }

            // If no filter or 'all', return all results
            if (!filter || filter === 'all') {
                return result;
            }

            // Apply filtering based on dynamic categories
            const filteredData = result.data.filter(service => {
                const category = (service.category_name || service.category || '').toLowerCase();
                return category.includes(filter.toLowerCase());
            });

            return { success: true, data: filteredData };
        }
    }

    // Replace the original controller with the extended one
    window.readServiceController = ExtendedReadServiceController;
}