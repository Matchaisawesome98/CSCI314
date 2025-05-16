//BOUNDARY
/**
 * HomeOwnerBookingListUI - Boundary class responsible for UI interactions
 * Handles all DOM interactions and UI updates for booking management
 */
class HomeOwnerBookingListUI {
    constructor() {
        // Initialize instance variables
        this.currentUserId = localStorage.getItem('currentUserId') || null;
        this.currentUsername = localStorage.getItem('currentUsername') || 'Guest User';
        this.bookings = [];
        this.selectedStatus = 'all'; // Default to show all bookings

        // Initialize controllers
        this.getUserBookingsController = new GetUserBookingsController();
        this.getBookingDetailsController = new GetBookingDetailsController();
        this.updateBookingStatusController = new UpdateBookingStatusController();

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
     * Initialize DOM element references
     */
    initDomElements() {
        this.bookingsTableBody = document.getElementById('bookings-table-body');
        this.loadingIndicator = document.getElementById('bookings-loading');
        this.statusFilter = document.getElementById('booking-status-filter');
        this.noBookingsMessage = document.getElementById('no-bookings-message');
        this.bookingsTable = document.getElementById('bookings-table');
        this.statusConfirmModal = document.getElementById('status-confirm-modal');
        this.modalMessage = document.getElementById('modal-message');
        this.modalCancel = document.getElementById('modal-cancel');
        this.modalConfirm = document.getElementById('modal-confirm');
        this.bookingDetailsModal = document.getElementById('booking-details-modal');
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

        // Modal buttons
        if (this.modalCancel) {
            this.modalCancel.addEventListener('click', () => this.closeStatusModal());
        }

        if (this.modalConfirm) {
            this.modalConfirm.addEventListener('click', (event) => {
                const bookingId = event.target.getAttribute('data-booking-id');
                console.log('Confirm clicked with booking ID:', bookingId);
                this.confirmStatusChange(bookingId); // Pass the ID directly to the method
            });
        }

        // Document-level event delegation for booking actions
        document.addEventListener('click', (event) => {
            // Cancel booking button
            if (event.target.classList.contains('cancel-booking-btn')) {
                console.log('Cancel button clicked!');
                console.log('Booking ID:', event.target.getAttribute('data-booking-id'));
                const bookingId = event.target.getAttribute('data-booking-id');
                this.showCancellationConfirmation(bookingId);
            }
            // View booking details button
            else if (event.target.classList.contains('view-booking-btn')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                this.showBookingDetails(bookingId);
            }
        });
    }

    /**
     * Load all bookings for the current user
     */
    async loadBookings() {
        try {
            // Show loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'flex';
            }

            if (this.bookingsTable) {
                this.bookingsTable.style.display = 'none';
            }

            // Get bookings from controller
            const result = await this.getUserBookingsController.getUserBookings(this.currentUserId);

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
        if (!this.bookingsTableBody) return;

        // Clear current content
        this.bookingsTableBody.innerHTML = '';

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
                    : `You have no ${this.formatStatus(this.selectedStatus)} bookings.`;
            }

            if (this.bookingsTable) {
                this.bookingsTable.style.display = 'none';
            }

            return;
        }

        // Hide no bookings message and show table
        if (this.noBookingsMessage) {
            this.noBookingsMessage.style.display = 'none';
        }

        if (this.bookingsTable) {
            this.bookingsTable.style.display = 'table';
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

        // Create booking rows
        filteredBookings.forEach(booking => {
            const row = this.createBookingRow(booking);
            this.bookingsTableBody.appendChild(row);
        });
    }

    /**
     * Create a booking table row
     */
    createBookingRow(booking) {
        const row = document.createElement('tr');

        // Add class for completed or cancelled bookings
        if (booking.status === 'completed' || booking.status === 'cancelled') {
            row.classList.add('completed-row');
        }

        // Format date and time
        const bookingDate = this.formatDate(booking.scheduled_date);
        const bookingTime = this.formatTime(booking.scheduled_time);

        // Get status badge
        const statusBadge = `<span class="status-badge status-${booking.status.replace('_', '-')}">${this.formatStatus(booking.status)}</span>`;

        // Create row content
        row.innerHTML = `
            <td>${booking.service_title || 'Unnamed Service'}</td>
            <td>${booking.provider_name || 'Unknown Provider'}</td>
            <td>${bookingDate}</td>
            <td>${bookingTime}</td>
            <td>${statusBadge}</td>
            <td>${this.getBookingActions(booking)}</td>
        `;

        return row;
    }

    /**
     * Get appropriate booking action buttons based on status
     */
    getBookingActions(booking) {
        const bookingId = booking.booking_id;
        let actions = `<div class="booking-actions">
            <button class="btn view-booking-btn" data-booking-id="${bookingId}">View Details</button>`;

        // Only add cancel button if booking is not already completed or cancelled
        if (booking.status !== 'completed' && booking.status !== 'cancelled') {
            actions += `<button class="btn btn-danger cancel-booking-btn" data-booking-id="${bookingId}">Cancel</button>`;
        }

        actions += `</div>`;
        return actions;
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        switch (status) {
            case 'pending_approval': return 'Pending Approval';
            case 'approved': return 'Approved';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        }
    }

    /**
     * Show cancellation confirmation modal
     */
    showCancellationConfirmation(bookingId) {
        console.log('Attempting to cancel booking with ID:', bookingId);

        // Add the booking ID directly to the confirm button
        if (this.modalConfirm) {
            this.modalConfirm.setAttribute('data-booking-id', bookingId);
        }

        if (this.modalMessage) {
            this.modalMessage.textContent = 'Are you sure you want to cancel this booking?';
        }

        if (this.statusConfirmModal) {
            this.statusConfirmModal.style.display = 'flex';
        }
    }

    /**
     * Close status confirmation modal
     */
    closeStatusModal() {
        if (this.statusConfirmModal) {
            this.statusConfirmModal.style.display = 'none';
        }
        this.pendingBookingId = null;
    }

    /**
     * Confirm status change (cancellation)
     */
    async confirmStatusChange(bookingId) {
        const idToUse = bookingId || this.pendingBookingId;
        console.log('confirmStatusChange called with ID:', idToUse);

        if (!idToUse) {
            console.error('No booking ID available for cancellation!');
            return;
        }

        try {
            // Close the modal first
            this.closeStatusModal();

            // Show loading state
            this.showLoadingState();

            // Use controller to cancel booking with the passed ID
            const result = await this.updateBookingStatusController.updateBookingStatus(
                idToUse,
                'cancelled',
                this.currentUserId
            );

            if (result.success) {
                // Show success message
                this.showNotification('Booking successfully cancelled!', 'success');

                // REFRESH APPROACH 1: Update local data and refresh display
                this.bookings = this.bookings.map(booking => {
                    if (booking.booking_id.toString() === idToUse.toString()) {
                        return { ...booking, status: 'cancelled' };
                    }
                    return booking;
                });

                // Refresh display with updated data
                this.displayBookings();
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showNotification(`Failed to cancel booking: ${error.message}`, 'error');
        } finally {
            this.hideLoadingState();
            this.pendingBookingId = null;
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
            const result = await this.getBookingDetailsController.getBookingDetails(bookingId);

            if (!result.success) {
                throw new Error(result.message || 'Failed to load booking details');
            }

            const booking = result.data;

            // Format date and time
            const bookingDate = this.formatDate(booking.scheduled_date);
            const bookingTime = this.formatTime(booking.scheduled_time);

            // Update modal content
            if (this.bookingDetailsModal) {
                const modalContent = this.bookingDetailsModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.innerHTML = `
                        <span class="close-button" id="close-booking-modal">&times;</span>
                        <h2>Booking Details</h2>
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
                            <p><strong>Status:</strong> <span class="status-badge status-${booking.status.replace('_', '-')}">${this.formatStatus(booking.status)}</span></p>
                            <p><strong>Provider:</strong> ${booking.provider_name || 'Unknown Provider'}</p>
                        </div>
                        
                        <div class="booking-actions-container">
                            ${this.getDetailedBookingActions(booking)}
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
            case 'approved':
                actions = `
                    <button class="btn btn-danger cancel-detail-btn" data-booking-id="${bookingId}">Cancel Booking</button>
                `;
                break;
            case 'completed':
                actions = `
                    <div class="completed-message">
                        <p>This booking has been completed.</p>
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

        // Cancel button
        const cancelBtn = modalContent.querySelector('.cancel-detail-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeBookingModal();
                this.showCancellationConfirmation(booking.booking_id);
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
     * Show error message
     */
    showErrorMessage(message) {
        if (this.noBookingsMessage) {
            this.noBookingsMessage.style.display = 'block';
            this.noBookingsMessage.innerHTML = `
                <p style="color: #F44336;">${message}</p>
                <button class="btn" onclick="window.location.reload()" style="margin-top: 10px;">Try Again</button>
            `;
        }

        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }

        if (this.bookingsTable) {
            this.bookingsTable.style.display = 'none';
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

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString);

        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Format time for display
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

    // Static initializer to create instance when document is loaded
    static {
        console.log('HomeOwnerBookingListUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;
            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new HomeOwnerBookingListUI instance');
                new HomeOwnerBookingListUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            // DOM is already loaded
            initializeUI();
        }

        // Also initialize when cards are rendered
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring HomeOwnerBookingListUI is initialized');
            initializeUI();
        });
    }
}


// ===================== CONTROLLER LAYER =====================
// Each controller handles specific operations and business logic

// Controller for getting user bookings
class GetUserBookingsController {
    constructor() {
        console.log('Initializing GetUserBookingsController');
        this.entity = new BookingListEntity();
    }

    async getUserBookings(userId) {
        console.log('GetUserBookingsController.getUserBookings called with:', userId);
        if (!userId) {
            return { success: false, error: 'Missing user ID' };
        }

        return await this.entity.getUserBookings(userId);
    }
}

// Controller for getting booking details
class GetBookingDetailsController {
    constructor() {
        console.log('Initializing GetBookingDetailsController');
        this.entity = new BookingListEntity();
    }

    async getBookingDetails(bookingId) {
        console.log('GetBookingDetailsController.getBookingDetails called with:', bookingId);
        if (!bookingId) {
            return { success: false, error: 'Missing booking ID' };
        }

        return await this.entity.getBookingDetails(bookingId);
    }
}

// Controller for updating booking status
class UpdateBookingStatusController {
    constructor() {
        console.log('Initializing UpdateBookingStatusController');
        this.entity = new BookingListEntity();
    }

    async updateBookingStatus(bookingId, status, userId) {
        console.log('UpdateBookingStatusController.updateBookingStatus called with:', bookingId, status, userId);

        // Validate inputs
        if (!bookingId || !status) {
            return { success: false, error: 'Missing booking ID or status' };
        }

        // For home owners, only cancellation is allowed
        if (status !== 'cancelled') {
            return { success: false, error: 'Home owners can only cancel bookings' };
        }

        // Call entity to update status
        return await this.entity.updateBookingStatus(bookingId, status, userId);
    }
}


// ===================== ENTITY LAYER =====================
// Single entity class that handles all data operations
class BookingListEntity {
    constructor() {
        console.log('Initializing BookingListEntity');
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    /**
     * Get bookings for a user from API
     */
    async getUserBookings(userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bookings/user/${userId}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error fetching user bookings:', error);
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
    async updateBookingStatus(bookingId, status, userId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status,
                    user_id: userId // For authorization check
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