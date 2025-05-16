// ===================== BOUNDARY LAYER (UI) =====================
// Handles all UI interactions related to viewing service details
class ServiceDetailsUI {
    constructor() {
        console.log('ServiceDetailsUI initialized');

        // Initialize controllers
        this.serviceDetailsController = new ServiceDetailsController();
        this.userController = new UserController();

        // Check if we're on the details page or homepage
        this.isDetailsPage = window.location.href.includes('viewDetails.html');

        if (this.isDetailsPage) {
            // On details page - load details for the current service
            this.initializeDetailsPage();
        } else {
            // On homepage - set up view details button handlers
            this.initializeHomePage();
        }
    }

    initializeHomePage() {
        console.log('Initializing homepage functionality');
        // No need to initialize user info on homepage as it's handled elsewhere
        // Add event listener for view details buttons
        this.setupViewDetailsButtons();
    }

    // Initialize UI components and load data
    initializeDetailsPage() {
        console.log('Initializing details page functionality');
        this.initUserInfo().then(() => {
            this.loadServiceDetails();
        }).catch(error => {
            console.error('Error initializing UI:', error);
            this.showError('An error occurred while initializing the page.');
        });
    }

    setupViewDetailsButtons() {
        console.log('Setting up view details button handlers');

        // Use event delegation for efficiency
        document.addEventListener('click', event => {
            // Find the clicked element or closest parent with view-details-btn class
            const button = event.target.closest('.view-details-btn');

            if (button) {
                event.preventDefault();

                const serviceId = button.getAttribute('data-id');
                if (serviceId) {
                    console.log('View details clicked for ID:', serviceId);
                    this.navigateToServiceDetails(serviceId);
                } else {
                    console.error('View details button missing data-id attribute');
                }
            }
        });
    }

    navigateToServiceDetails(serviceId) {
        if (!serviceId) {
            console.error('No service ID provided for navigation');
            return;
        }

        console.log('Navigating to service details for ID:', serviceId);

        // Navigate to the service details page with the service ID as a URL parameter
        window.location.href = `viewDetails.html?id=${serviceId}`;
    }

    // Initialize user information
    async initUserInfo() {
        try {
            const userInfo = await this.userController.getCurrentUser();

            // Update username display
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = userInfo.username;
            }

            // Set avatar initial (first letter of username)
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.textContent = userInfo.username.charAt(0).toUpperCase();
            }

            // Show/hide shortlist button based on user role
            const shortlistBtn = document.getElementById('shortlist-btn');
            if (shortlistBtn && userInfo.role !== 'home_owner') {
                shortlistBtn.style.display = 'none';
            }

            return userInfo;
        } catch (error) {
            console.error('Error initializing user info:', error);
            throw error;
        }
    }

    // Load service details
    async loadServiceDetails() {
        try {
            // Get service ID from URL parameter
            const serviceId = this.getUrlParameter('id');

            if (!serviceId) {
                this.showError('Service ID is missing. Please go back and try again.');
                return;
            }

            console.log('Loading details for service ID:', serviceId);

            // Fetch service details using controller
            const result = await this.serviceDetailsController.getServiceDetails(serviceId);

            if (!result.success || !result.data) {
                this.showError('Failed to load service details. Please try again.');
                return;
            }

            // Get service data
            const service = result.data;

            // Update UI with service details
            this.updateServiceUI(service, serviceId);

            return service;
        } catch (error) {
            console.error('Error loading service details:', error);
            this.showError('An error occurred while loading service details.');
            throw error;
        }
    }

    // Update the UI with service details
    updateServiceUI(service, serviceId) {
        // Update service information
        document.getElementById('service-title').textContent = service.title || 'Unnamed Service';
        document.getElementById('service-price').textContent = this.formatPrice(service.price);
        document.getElementById('service-category').textContent = service.category_name || service.category || 'Uncategorized';
        document.getElementById('service-description').textContent = service.description || 'No description available';

        // Set image
        const serviceImage = document.getElementById('service-image');
        serviceImage.src = service.image_path || 'https://placehold.co/600x400?text=Cleaning+Service';
        serviceImage.alt = service.title || 'Service Image';

        // Set provider info
        const providerName = service.provider_name ||
                            (service.first_name && service.last_name ? `${service.first_name} ${service.last_name}` :
                            `Provider ${service.user_id}`);

        document.getElementById('provider-name').textContent = providerName;

        const createdAt = service.created_at || service.createdAt;
        if (createdAt) {
            const joinDate = new Date(createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('provider-joined').textContent = `Listed on ${joinDate}`;
        }

        // Set provider avatar
        const providerAvatar = document.getElementById('provider-avatar');
        if (providerAvatar) {
            providerAvatar.textContent = providerName.charAt(0).toUpperCase();
        }
    }

    // Show error message
    showError(message) {
        const detailsContainer = document.getElementById('service-details-container');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <a href="homePage.html" class="btn" style="margin-top: 20px;">Return to Home</a>
                </div>
            `;
        }
    }

    // Format price
    formatPrice(price) {
        const priceNum = typeof price === 'string' ? parseFloat(price) : price;
        return !isNaN(priceNum) ? `S$${priceNum.toFixed(2)}` : 'Price not available';
    }

    // Get URL parameter
    getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded in viewDetails.js, initializing ServiceDetailsUI');
    new ServiceDetailsUI();
});

// For debugging
console.log('viewDetails.js loaded');

// ===================== CONTROLLER LAYER =====================
// Controllers handle business logic and coordinate between UI and entities

// Controller for service details
class ServiceDetailsController {
    constructor() {
        this.entity = new ServiceDetailsEntity();
        console.log('ServiceDetailsController initialized');
    }

    async getServiceDetails(serviceId) {
        console.log('ServiceDetailsController.getServiceDetails called with:', serviceId);

        if (!serviceId) {
            return { success: false, error: 'Service ID is required' };
        }

        try {
            return await this.entity.fetchServiceDetails(serviceId);
        } catch (error) {
            console.error('Error in controller getting service details:', error);
            return { success: false, error: 'Failed to load service details' };
        }
    }
}

// Controller for user operations
class UserController {
    constructor() {
        this.entity = new UserEntity();
        console.log('UserController initialized');
    }

    async getCurrentUser() {
        console.log('UserController.getCurrentUser called');

        try {
            return await this.entity.getCurrentUser();
        } catch (error) {
            console.error('Error in controller getting current user:', error);
            // Return default user info on error
            return {
                userId: 'guest',
                username: 'Guest User',
                role: 'home_owner'
            };
        }
    }
}

// ===================== ENTITY LAYER =====================
// Entities handle data operations and storage

// Entity for service details
class ServiceDetailsEntity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        console.log('ServiceDetailsEntity initialized');
    }

    async fetchServiceDetails(serviceId) {
        console.log('ServiceDetailsEntity.fetchServiceDetails called with:', serviceId);

        try {
            // Fetch service details from API
            const response = await fetch(`${this.apiBaseUrl}/listings/${serviceId}`);

            if (!response.ok) {
                console.error('API returned error status:', response.status);
                return { success: false, error: `API error: ${response.status}` };
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                return { success: false, error: result.error || 'No data returned from API' };
            }

            return result;
        } catch (error) {
            console.error('Error fetching service details:', error);
            throw error;
        }
    }
}

// Entity for user operations
class UserEntity {
    constructor() {
        console.log('UserEntity initialized');
    }

    async getCurrentUser() {
        console.log('UserEntity.getCurrentUser called');

        try {
            // Get user info from localStorage
            const userId = localStorage.getItem('currentUserId');
            const username = localStorage.getItem('currentUsername');
            const role = localStorage.getItem('userRole');

            // If no user data is stored, set defaults
            if (!userId) {
                localStorage.setItem('currentUserId', 'user01');
                localStorage.setItem('currentUsername', 'Guest User');
                localStorage.setItem('userRole', 'home_owner');

                return {
                    userId: 'user01',
                    username: 'Guest User',
                    role: 'home_owner'
                };
            }

            return {
                userId,
                username: username || 'Guest User',
                role: role || 'home_owner'
            };
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded in viewDetails.js, initializing ServiceDetailsUI');
    new ServiceDetailsUI();
});

// For debugging
console.log('viewDetails.js loaded');