// Initialize the application
// This code runs before the classes are defined,
// setting default user if needed
document.addEventListener('DOMContentLoaded', function() {
    // If no user ID is stored, set a default one for testing
    if (!localStorage.getItem('currentUserId')) {
        localStorage.setItem('currentUserId', 'user01');
        localStorage.setItem('currentUsername', 'Guest User');
    }
});

// Class to handle the UI elements and user interactions
class ServiceStatsUI {
    constructor() {
        this.initDomElements();
        this.setupEventListeners();
        this.controller = new ServiceStatsController();
        this.initUserInfo();
        this.init();
    }

    // Load DOM elements
    initDomElements() {
        this.statsContainer = document.getElementById('stats-container');
        this.notification = document.getElementById('notification');
    }

    // Set up event listeners for UI interactions
    setupEventListeners() {
        // Set up filter buttons if they exist
        const filterButtons = document.querySelectorAll('.filter-btn');
        if (filterButtons.length > 0) {
            filterButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    // Remove active class from all buttons
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    button.classList.add('active');

                    // Update displayed stats with the selected period
                    this.updateDisplayedStats(button.dataset.period);
                });
            });
        }
    }

    // Validate user access
    validateUserAccess() {
        const userId = localStorage.getItem('currentUserId');
        return !!userId;
    }

    // Initialize and fetch data
    async init() {
        // Check if user is logged in
        if (!this.validateUserAccess()) {
            this.showNotification('Please log in to view service statistics', 'error');
            return;
        }

        const userId = localStorage.getItem('currentUserId');
        console.log('User ID:', userId);

        // Fetch and display the stats
        await this.fetchAndDisplayStats(userId);
    }

    // Fetch and display stats
    async fetchAndDisplayStats(userId) {
        this.displayLoading();

        try {
            // Call the controller to get the data
            const statsData = await this.controller.getServiceStats(userId);

            if (!statsData.success || !statsData.data || statsData.data.length === 0) {
                this.displayNoServices();
                return;
            }

            // Display the data in the UI
            this.displayServicesTable(statsData.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            this.displayError(error);
        }
    }

    // Update displayed stats based on the selected time period
    async updateDisplayedStats(period) {
        console.log(`Displaying stats for period: ${period}`);

        // Show notification
        this.showNotification(`Showing statistics for ${period === 'all' ? 'all time' : `this ${period}`}`, 'info');

        // Check if user is logged in
        if (!this.validateUserAccess()) {
            this.showNotification('Please log in to view service statistics', 'error');
            return;
        }

        const userId = localStorage.getItem('currentUserId');

        // In a full implementation, fetch new data with the period parameter
        // await this.fetchAndDisplayStats(userId, period);
    }

    // Initialize user information
    initUserInfo() {
        // Get the stored username or use a default
        const currentUserId = localStorage.getItem('currentUserId') || 'guest';
        const currentUsername = localStorage.getItem('currentUsername') || 'Guest User';

        console.log('Initializing user info:', { currentUserId, currentUsername });

        // Update username display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUsername;
        }

        // Set avatar initial (first letter of username)
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.textContent = currentUsername.charAt(0).toUpperCase();
        }
    }

    // Display the services table with the provided data
    displayServicesTable(services) {
        console.log('Displaying services table with data:', services);

        if (!services || services.length === 0) {
            this.displayNoServices();
            return;
        }

        // Create the table structure
        const tableHTML = `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Service Name</th>
                        <th>Shortlists</th>
                        <th>Views/Day</th>
                        <th>Views/Week</th>
                        <th>Views/Month</th>
                    </tr>
                </thead>
                <tbody id="stats-table-body">
                    ${services.map(service => {
                        const serviceId = service.listing_id.toString();
                        const shortlistCount = service.shortlist_count || 0;
                        const viewData = service.views || { day: 0, week: 0, month: 0 };
                        
                        return `
                            <tr data-id="${serviceId}">
                                <td>${serviceId}</td>
                                <td>${service.title}</td>
                                <td>${shortlistCount}</td>
                                <td>${viewData.day}</td>
                                <td>${viewData.week}</td>
                                <td>${viewData.month}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        this.statsContainer.innerHTML = tableHTML;
    }

    // Display loading state in the stats container
    displayLoading() {
        this.statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';
    }

    // Display a message when no services are available
    displayNoServices() {
        this.statsContainer.innerHTML = `
            <div class="no-stats">
                <h3>No services found</h3>
                <p>You don't have any active services to show statistics for.</p>
                <button class="btn" onclick="window.location.href='cleanerListings.html'">Create a Service</button>
            </div>
        `;
    }

    // Display an error message
    displayError(error) {
        this.statsContainer.innerHTML = `
            <div class="no-stats">
                <h3>Error loading statistics</h3>
                <p>There was a problem loading your service statistics. Please try again later.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
    }

    // Show a notification
    showNotification(message, type = 'info') {
        if (!this.notification) return;

        console.log(`Showing notification: ${message} (${type})`);

        // Set the message
        this.notification.textContent = message;

        // Set the notification type (color)
        this.notification.className = ''; // Clear existing classes
        this.notification.classList.add('notification', `notification-${type}`);

        // Set the background color based on type
        if (type === 'error') {
            this.notification.style.backgroundColor = '#F44336';
        } else if (type === 'success') {
            this.notification.style.backgroundColor = '#4CAF50';
        } else if (type === 'warning') {
            this.notification.style.backgroundColor = '#FF9800';
        } else {
            this.notification.style.backgroundColor = '#2196F3'; // info
        }

        // Make the notification visible
        this.notification.style.display = 'block';
        this.notification.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            this.notification.style.opacity = '0';
            setTimeout(() => {
                this.notification.style.display = 'none';
            }, 500);
        }, 3000);
    }

    // Static initializer to create the UI when the DOM is loaded
    static {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new ServiceStatsUI());
        } else {
            // DOM is already loaded
            new ServiceStatsUI();
        }
    }
}

// Controller class to handle business logic
class ServiceStatsController {
    constructor() {
        this.entity = new ServiceStatsEntity();
    }

    // Main function to get service stats from the entity layer
    async getServiceStats(userId, period = 'all') {
        // Check if the userId is valid before proceeding
        if (!userId) {
            return { success: false, error: "Invalid user ID" };
        }

        try {
            // Call the entity to fetch data
            const statsData = await this.entity.getServiceStats(userId, period);
            console.log(`Found ${statsData.data ? statsData.data.length : 0} services with stats for user ${userId}`);

            // Return the data as is - let the boundary decide how to display it
            return statsData;
        } catch (error) {
            console.error('Error getting service stats:', error);
            return { success: false, error: error.message };
        }
    }
}

// Entity class to handle data and API calls
class ServiceStatsEntity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    // Get service stats for a user
    async getServiceStats(userId, period = 'all') {
        try {
            console.log('Fetching service stats...');
            const response = await fetch(`${this.apiBaseUrl}/views/user/${userId}${period !== 'all' ? `?period=${period}` : ''}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch service stats: ${response.status}`);
            }

            const data = await response.json();
            console.log('Service stats data:', data);

            return data;
        } catch (error) {
            console.error('Error fetching service stats:', error);
            return { success: false };
        }
    }
}