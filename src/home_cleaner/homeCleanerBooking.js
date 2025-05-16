// HomeCleanerBookings with Boundary-Control-Entity (BCE) architectural pattern
// Restructured to have separate controllers for each operation type

/**
 * CleanerBookingsUI - Boundary class responsible for UI interactions
 * Handles all DOM interactions and UI updates for cleaner booking management
 */
class CleanerBookingsUI {
    constructor() {
        // Initialize instance variables
        this.currentUserId = localStorage.getItem('currentUserId') || null;
        this.currentUsername = localStorage.getItem('currentUsername') || 'Guest User';
        this.bookings = [];
        this.selectedStatus = 'all'; // Default to show all bookings

        // Initialize controllers
        this.initControllers();

        // Initialize DOM elements and setup event listeners
        this.initDomElements();
        this.setupEventListeners();

        // Load bookings if we have a user ID
        if (this.currentUserId) {
            this.loadBookings();
        } else {
            console.error('No user ID available for booking management');
        }
    }

    /**
     * Initialize controller classes
     */
    initControllers() {
        // Create a controller for each operation type
        this.getBookingsController = new GetProviderBookingsController();
        this.getDetailsController = new GetBookingDetailsController();
        this.updateStatusController = new UpdateBookingStatusController();
    }

    /**
     * Initialize DOM element references
     */
    initDomElements() {
        this.bookingsContainer = document.getElementById('cleaner-bookings-container');
        this.loadingIndicator = document.getElementById('bookings-loading');
        this.statusFilter = document.getElementById('booking-status-filter');
        this.noBookingsMessage = document.getElementById('no-bookings-message');
        this.bookingDetailsModal = document.getElementById('booking-details-modal');
        this.closeModalBtn = document.getElementById('close-booking-modal');
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        // Status filter change
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', (event) => {
                this.selectedStatus = event.target.value;
                this.displayBookings();
            });
        }

        // Close modal button
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeBookingModal());
        }

        // Document-level event delegation for booking cards
        document.addEventListener('click', (event) => {
            // Approve booking button
            if (event.target.classList.contains('approve-booking-btn')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                this.updateBookingStatus(bookingId, 'approved');
            }
            // Mark as completed button
            else if (event.target.classList.contains('complete-booking-btn')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                this.updateBookingStatus(bookingId, 'completed');
            }
            // View booking details button
            else if (event.target.classList.contains('view-booking-btn')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                this.showBookingDetails(bookingId);
            }
        });
    }

    /**
     * Load all bookings for the current provider
     */
    async loadBookings() {
        try {
            // Show loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'block';
            }

            // Get bookings from controller
            const result = await this.getBookingsController.getProviderBookings(this.currentUserId);

            if (result.success) {
                this.bookings = result.data;
                console.log(`Loaded ${this.bookings.length} bookings`);
                this.displayBookings();
            } else {
                throw new Error(result.error || 'Failed to load bookings');
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showErrorMessage('Failed to load bookings. Please try again later.');
        } finally {
            // Hide loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
        }
    }

    /**
     * Display bookings with optional filtering
     */
    displayBookings() {
        if (!this.bookingsContainer) return;

        // Clear current content
        this.bookingsContainer.innerHTML = '';

        // Filter bookings by selected status
        let filteredBookings = this.bookings;
        if (this.selectedStatus !== 'all') {
            filteredBookings = this.bookings.filter(booking => booking.status === this.selectedStatus);
        }

        // Check if we have bookings to display
        if (filteredBookings.length === 0) {
            if (this.noBookingsMessage) {
                this.noBookingsMessage.style.display = 'block';
                this.noBookingsMessage.textContent = this.selectedStatus === 'all'
                    ? 'You have no bookings yet.'
                    : `You have no ${this.selectedStatus} bookings.`;
            }
            return;
        }

        // Hide no bookings message
        if (this.noBookingsMessage) {
            this.noBookingsMessage.style.display = 'none';
        }

        // Sort bookings: pending first, then by date (most recent first)
        filteredBookings.sort((a, b) => {
            // First sort by status priority
            const statusPriority = { 'pending_approval': 0, 'approved': 1, 'completed': 2, 'cancelled': 3 };
            const priorityDiff = statusPriority[a.status] - statusPriority[b.status];

            if (priorityDiff !== 0) return priorityDiff;

            // Then sort by date (most recent first for same status)
            const dateA = new Date(`${a.scheduled_date} ${a.scheduled_time}`);
            const dateB = new Date(`${b.scheduled_date} ${b.scheduled_time}`);
            return dateA - dateB; // Ascending order (upcoming first)
        });

        // Create booking cards
        filteredBookings.forEach(booking => {
            const card = this.createBookingCard(booking);
            this.bookingsContainer.appendChild(card);
        });
    }

    /**
     * Create a booking card element
     */
    createBookingCard(booking) {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.setAttribute('data-booking-id', booking.booking_id);

        // Add status-based class
        card.classList.add(`status-${booking.status.replace('_', '-')}`);

        // Format date and time
        const bookingDate = this.formatDate(booking.scheduled_date);
        const bookingTime = this.formatTime(booking.scheduled_time);

        // Get status label
        const statusLabel = this.getStatusLabel(booking.status);

        // Create card content
        card.innerHTML = `
            <div class="booking-header">
                <h3 class="booking-service">${booking.service_title || 'Unnamed Service'}</h3>
                <span class="booking-status ${booking.status}">${statusLabel}</span>
            </div>
            <div class="booking-details">
                <p><strong>Client:</strong> ${booking.client_name || 'Unknown Client'}</p>
                <p><strong>Date:</strong> ${bookingDate}</p>
                <p><strong>Time:</strong> ${bookingTime}</p>
            </div>
            <div class="booking-actions">
                ${this.getBookingActions(booking)}
            </div>
        `;

        return card;
    }

    /**
     * Get appropriate booking action buttons based on status
     */
    getBookingActions(booking) {
        const bookingId = booking.booking_id;
        let actions = `<button class="btn card-btn view-booking-btn" data-booking-id="${bookingId}">View Details</button>`;

        switch (booking.status) {
            case 'pending_approval':
                actions += `<button class="btn card-btn approve-booking-btn" data-booking-id="${bookingId}">Approve</button>`;
                break;
            case 'approved':
                actions += `<button class="btn card-btn complete-booking-btn" data-booking-id="${bookingId}">Mark Completed</button>`;
                break;
            case 'completed':
                // No additional actions for completed bookings
                break;
            case 'cancelled':
                // No additional actions for cancelled bookings
                break;
        }

        return actions;
    }

    /**
     * Get human-readable status label
     */
    getStatusLabel(status) {
        switch (status) {
            case 'pending_approval': return 'Pending Approval';
            case 'approved': return 'Approved';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        }
    }

    /**
     * Update a booking status
     */
    async updateBookingStatus(bookingId, newStatus) {
        try {
            // Confirm the action
            const statusAction = newStatus === 'approved' ? 'approve' : 'mark as completed';
            if (!confirm(`Are you sure you want to ${statusAction} this booking?`)) {
                return;
            }

            // Show loading state
            this.showLoadingState();

            // Update via controller
            const result = await this.updateStatusController.updateBookingStatus(bookingId, newStatus, this.currentUserId);

            if (result.success) {
                // Show success message
                this.showNotification(`Booking successfully ${newStatus === 'approved' ? 'approved' : 'completed'}!`, 'success');

                // Update local data
                this.bookings = this.bookings.map(booking => {
                    if (booking.booking_id.toString() === bookingId.toString()) {
                        return { ...booking, status: newStatus };
                    }
                    return booking;
                });

                // Refresh display
                this.displayBookings();
            } else {
                throw new Error(result.message || `Failed to update booking to ${newStatus}`);
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showNotification(`Failed to update booking: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Show booking details in modal
     */
    async showBookingDetails(bookingId) {
        try {
            // Show loading state
            this.showLoadingState();

            // Get booking details
            const result = await this.getDetailsController.getBookingDetails(bookingId);

            if (!result.success) {
                throw new Error(result.message || 'Failed to load booking details');
            }

            const booking = result.data;

            // Format date and time
            const bookingDate = this.formatDate(booking.scheduled_date);
            const bookingTime = this.formatTime(booking.scheduled_time);
            const statusLabel = this.getStatusLabel(booking.status);

            // Update modal content
            if (this.bookingDetailsModal) {
                const modalContent = this.bookingDetailsModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.innerHTML = `
                        <span class="close-button" id="close-booking-modal">&times;</span>
                        <h2>Booking Details</h2>
                        <div class="booking-details-content">
                            <div class="booking-info-group">
                                <h3>Service Information</h3>
                                <p><strong>Service:</strong> ${booking.service_title || 'Unnamed Service'}</p>
                                <p><strong>Price:</strong> S$${parseFloat(booking.service_price || 0).toFixed(2)}</p>
                                <p><strong>Description:</strong> ${booking.service_description || 'No description available'}</p>
                            </div>
                            
                            <div class="booking-info-group">
                                <h3>Appointment Details</h3>
                                <p><strong>Date:</strong> ${bookingDate}</p>
                                <p><strong>Time:</strong> ${bookingTime}</p>
                                <p><strong>Status:</strong> <span class="status-badge ${booking.status}">${statusLabel}</span></p>
                                <p><strong>Client:</strong> ${booking.client_name || 'Unknown Client'}</p>
                            </div>
                            
                            <div class="booking-actions-container">
                                ${this.getDetailedBookingActions(booking)}
                            </div>
                        </div>
                    `;

                    // Set up close button
                    const closeBtn = modalContent.querySelector('#close-booking-modal');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => this.closeBookingModal());
                    }

                    // Set up action buttons
                    this.setupDetailActionButtons(booking);
                }

                // Show the modal
                this.bookingDetailsModal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error showing booking details:', error);
            this.showNotification(`Failed to load booking details: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Get detailed booking actions for the modal
     */
    getDetailedBookingActions(booking) {
        const bookingId = booking.booking_id;
        let actions = '';

        switch (booking.status) {
            case 'pending_approval':
                actions = `
                    <button class="btn approve-detail-btn" data-booking-id="${bookingId}">Approve Booking</button>
                `;
                break;
            case 'approved':
                actions = `
                    <button class="btn complete-detail-btn" data-booking-id="${bookingId}">Mark as Completed</button>
                `;
                break;
            case 'completed':
                actions = `
                    <div class="completed-message">
                        <p>This booking has been marked as completed.</p>
                    </div>
                `;
                break;
            case 'cancelled':
                actions = `
                    <div class="cancelled-message">
                        <p>This booking has been cancelled.</p>
                    </div>
                `;
                break;
        }

        return actions;
    }

    /**
     * Set up action buttons in the detail modal
     */
    setupDetailActionButtons(booking) {
        const modalContent = this.bookingDetailsModal.querySelector('.modal-content');

        // Approve button
        const approveBtn = modalContent.querySelector('.approve-detail-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => {
                this.closeBookingModal();
                this.updateBookingStatus(booking.booking_id, 'approved');
            });
        }

        // Complete button
        const completeBtn = modalContent.querySelector('.complete-detail-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                this.closeBookingModal();
                this.updateBookingStatus(booking.booking_id, 'completed');
            });
        }
    }

    /**
     * Close booking details modal
     */
    closeBookingModal() {
        if (this.bookingDetailsModal) {
            this.bookingDetailsModal.style.display = 'none';
        }
    }

    /**
     * Format date for display (moved from controller)
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString);

        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Format time for display (moved from controller)
     */
    formatTime(timeString) {
        if (!timeString) return 'N/A';

        // Convert 24h time (HH:MM:SS) to 12h format with AM/PM
        const timeParts = timeString.split(':');
        if (timeParts.length < 2) return timeString;

        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12

        return `${hours}:${minutes} ${ampm}`;
    }

    /**
     * Show a notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('booking-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'booking-notification';
            document.body.appendChild(notification);
        }

        // Set content and style
        notification.textContent = message;
        notification.className = `notification ${type}`;

        // Show notification
        notification.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    /**
     * Show error message in the bookings container
     */
    showErrorMessage(message) {
        if (this.bookingsContainer) {
            this.bookingsContainer.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                    <button class="btn retry-btn" onclick="window.location.reload()">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(loadingOverlay);
        }

        loadingOverlay.style.display = 'flex';
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Static initializer to create instance when document is loaded
    static {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new CleanerBookingsUI());
        } else {
            // DOM is already loaded
            new CleanerBookingsUI();
        }
    }
}

// ===================== CONTROLLER LAYER =====================
// Individual controller classes for different operations

/**
 * GetProviderBookingsController - Controller for fetching provider bookings
 */
class GetProviderBookingsController {
    constructor() {
        this.entity = new CleanerBookingsEntity();
    }

    /**
     * Get bookings for the current provider
     */
    async getProviderBookings(providerId) {
        try {
            if (!providerId) {
                return { success: false, error: 'Missing provider ID' };
            }

            return await this.entity.getProviderBookings(providerId);
        } catch (error) {
            console.error('Controller: Error getting provider bookings:', error);
            return { success: false, error: error.message };
        }
    }
}

/**
 * GetBookingDetailsController - Controller for fetching booking details
 */
class GetBookingDetailsController {
    constructor() {
        this.entity = new CleanerBookingsEntity();
    }

    /**
     * Get details for a specific booking
     */
    async getBookingDetails(bookingId) {
        try {
            if (!bookingId) {
                return { success: false, error: 'Missing booking ID' };
            }

            return await this.entity.getBookingDetails(bookingId);
        } catch (error) {
            console.error('Controller: Error getting booking details:', error);
            return { success: false, error: error.message };
        }
    }
}

/**
 * UpdateBookingStatusController - Controller for updating booking status
 */
class UpdateBookingStatusController {
    constructor() {
        this.entity = new CleanerBookingsEntity();
    }

    /**
     * Update a booking's status
     */
    async updateBookingStatus(bookingId, status, providerId) {
        try {
            // Validate inputs
            if (!bookingId || !status) {
                return { success: false, error: 'Missing booking ID or status' };
            }

            // Validate status
            const validStatuses = ['pending_approval', 'approved', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return { success: false, error: 'Invalid status value' };
            }

            // Call entity to update status
            return await this.entity.updateBookingStatus(bookingId, status, providerId);
        } catch (error) {
            console.error('Controller: Error updating booking status:', error);
            return { success: false, error: error.message };
        }
    }
}

/**
 * CleanerBookingsEntity - Entity class for data access
 * Handles API calls and data storage
 */
class CleanerBookingsEntity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    /**
     * Get bookings for a provider from API
     */
    async getProviderBookings(providerId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bookings/provider/${providerId}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error fetching provider bookings:', error);
            throw error;
        }
    }

    /**
     * Get details for a specific booking
     */
    async getBookingDetails(bookingId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bookings/${bookingId}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error fetching booking details:', error);
            throw error;
        }
    }

    /**
     * Update a booking's status via API
     */
    async updateBookingStatus(bookingId, status, providerId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status,
                    user_id: providerId // For authorization check
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `API error: ${response.status}` }));
                throw new Error(errorData.message || `Failed to update booking status. Status code: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error updating booking status:', error);
            throw error;
        }
    }
}

// Initialize the CleanerBookingsUI when the DOM is loaded
// The static initializer in the CleanerBookingsUI class takes care of this