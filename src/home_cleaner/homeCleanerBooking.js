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
        this.pendingStatusChange = {
            bookingId: null,
            element: null,
            originalValue: null,
            newValue: null
        };
        this.displayMode = 'table';

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
        this.searchBookingsController = new SearchBookingsController();
    }

    /**
     * Initialize DOM element references
     */
    initDomElements() {
        // Card view elements
        this.bookingsContainer = document.getElementById('cleaner-bookings-container');
        this.loadingIndicator = document.getElementById('bookings-loading');
        this.statusFilter = document.getElementById('booking-status-filter');
        this.noBookingsMessage = document.getElementById('no-bookings-message');
        this.bookingDetailsModal = document.getElementById('booking-details-modal');
        this.closeModalBtn = document.getElementById('close-booking-modal');

        // Table view elements
        this.bookingsTable = document.getElementById('bookings-table');
        this.tableBody = document.getElementById('bookings-table-body');
        this.statusConfirmModal = document.getElementById('status-confirm-modal');
        this.modalMessage = document.getElementById('modal-message');
        this.modalConfirmBtn = document.getElementById('modal-confirm');
        this.modalCancelBtn = document.getElementById('modal-cancel');

        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');

        // Display toggle elements (if they exist)
        this.displayToggleBtn = document.getElementById('display-toggle-btn');
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

        // Close modal button for details modal
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeBookingModal());
        }

        // Status confirmation modal buttons
        if (this.modalConfirmBtn) {
            this.modalConfirmBtn.addEventListener('click', () => this.confirmStatusChange());
        }

        if (this.modalCancelBtn) {
            this.modalCancelBtn.addEventListener('click', () => this.cancelStatusChange());
        }

        // Search functionality
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.performSearch());
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // Display toggle button (if it exists)
        if (this.displayToggleBtn) {
            this.displayToggleBtn.addEventListener('click', () => {
                this.displayMode = this.displayMode === 'cards' ? 'table' : 'cards';
                this.displayBookings();
            });
        }

        // Document-level event delegation for booking cards and status dropdowns
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

        // Add event listeners for status dropdowns (for table view)
        document.addEventListener('change', (event) => {
            if (event.target.classList.contains('status-select')) {
                const bookingId = event.target.getAttribute('data-booking-id');
                const newStatus = event.target.value;
                const originalValue = event.target.getAttribute('data-original-value') ||
                    Array.from(event.target.options).find(opt => opt.defaultSelected).value;

                // Store pending change data
                this.pendingStatusChange = {
                    bookingId,
                    element: event.target,
                    originalValue,
                    newValue: newStatus
                };

                // Show confirmation modal
                this.showConfirmationModal(this.formatStatus(newStatus));
            }
        });
    }

    /**
     * Load all bookings for the current provider
     */
    async loadBookings() {
        try {
            // Show loading indicator
            this.showLoadingState();

            // Get bookings from controller
            const result = await this.getBookingsController.getProviderBookings(this.currentUserId);

            if (result.success) {
                this.bookings = result.data;
                console.log(`Loaded ${this.bookings.length} bookings`);

                // Clear search input
                if (this.searchInput) {
                    this.searchInput.value = '';
                }

                // Remove any existing "no results" message
                const existingNoResults = document.querySelector('.no-results');
                if (existingNoResults) {
                    existingNoResults.remove();
                }

                // Display bookings based on current display mode
                this.displayBookings();
            } else {
                throw new Error(result.error || 'Failed to load bookings');
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showErrorMessage('Failed to load bookings. Please try again later.');
        } finally {
            // Hide loading indicator
            this.hideLoadingState();
        }
    }

    /**
     * Display bookings with optional filtering - chooses between card and table display
     */
    displayBookings() {
        // Check if we have bookings to display
        if (!this.bookings || this.bookings.length === 0) {
            if (this.noBookingsMessage) {
                this.noBookingsMessage.style.display = 'block';
            }

            if (this.bookingsTable) {
                this.bookingsTable.style.display = 'none';
            }

            if (this.bookingsContainer) {
                this.bookingsContainer.style.display = 'none';
            }

            return;
        }

        // Filter bookings by selected status
        let filteredBookings = this.bookings;
        if (this.selectedStatus !== 'all') {
            filteredBookings = this.bookings.filter(booking => booking.status === this.selectedStatus);
        }

        // Check if we have filtered bookings to display
        if (filteredBookings.length === 0) {
            if (this.noBookingsMessage) {
                this.noBookingsMessage.style.display = 'block';
                this.noBookingsMessage.textContent = this.selectedStatus === 'all'
                    ? 'You have no bookings yet.'
                    : `You have no ${this.selectedStatus} bookings.`;
            }

            if (this.bookingsTable) {
                this.bookingsTable.style.display = 'none';
            }

            if (this.bookingsContainer) {
                this.bookingsContainer.style.display = 'none';
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

        console.log('Display mode:', this.displayMode);
console.log('Filtered bookings:', filteredBookings);
console.log('DOM elements exist:', {
    bookingsContainer: !!this.bookingsContainer,
    tableBody: !!this.tableBody,
    bookingsTable: !!this.bookingsTable
});
        // Display bookings based on current mode
        if (this.displayMode === 'table' && this.tableBody && this.bookingsTable) {
            // Show table view, hide card view
            if (this.bookingsContainer) {
                this.bookingsContainer.style.display = 'none';
            }

            this.bookingsTable.style.display = 'table';
            this.displayBookingsTable(filteredBookings);
        } else if (this.bookingsContainer) {
            // Show card view, hide table view
            if (this.bookingsTable) {
                this.bookingsTable.style.display = 'none';
            }

            this.bookingsContainer.style.display = 'block';
            this.displayBookingsCards(filteredBookings);
        }
    }

    /**
     * Display bookings in card format
     */
    displayBookingsCards(filteredBookings) {
        if (!this.bookingsContainer) return;

        // Clear current content
        this.bookingsContainer.innerHTML = '';

        // Create booking cards
        filteredBookings.forEach(booking => {
            const card = this.createBookingCard(booking);
            this.bookingsContainer.appendChild(card);
        });
    }

    /**
     * Display bookings in table format
     */
    displayBookingsTable(filteredBookings) {
        if (!this.tableBody) return;

        // Clear table body
        this.tableBody.innerHTML = '';

        // Create rows for each booking
        filteredBookings.forEach(booking => {
            const row = document.createElement('tr');

            // Add class for completed bookings
            if (booking.status === 'completed' || booking.status === 'cancelled') {
                row.classList.add('completed-row');
            }

            // Format date and time
            const formattedDate = this.formatDate(booking.scheduled_date);
            const formattedTime = this.formatTime(booking.scheduled_time);

            // Limit description length
            const shortDescription = booking.service_description
                ? (booking.service_description.length > 50
                    ? booking.service_description.substring(0, 50) + '...'
                    : booking.service_description)
                : 'No description';

            // Create row content
            row.innerHTML = `
                <td>${booking.listing_id || '—'}</td>
                <td>${booking.service_title || 'Unnamed Service'}</td>
                <td title="${booking.service_description || ''}">${shortDescription}</td>
                <td>${formattedDate}</td>
                <td>${formattedTime}</td>
                <td>${booking.client_name || 'Unknown'}</td>
                <td>${this.createStatusDropdown(booking)}</td>
            `;

            this.tableBody.appendChild(row);
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
     * Create status dropdown based on booking status
     */
    createStatusDropdown(booking) {
        const isDisabled = booking.status === 'completed' || booking.status === 'cancelled';
        const statuses = [
            { value: 'pending_approval', text: 'Pending Approval' },
            { value: 'approved', text: 'Approved' },
            { value: 'completed', text: 'Completed' },
            { value: 'cancelled', text: 'Cancelled' }
        ];

        // Create select element
        const selectHtml = `
            <select
                class="status-select"
                data-booking-id="${booking.booking_id}"
                ${isDisabled ? 'disabled' : ''}
            >
                ${statuses.map(status => `
                    <option
                        value="${status.value}"
                        ${booking.status === status.value ? 'selected' : ''}
                    >
                        ${status.text}
                    </option>
                `).join('')}
            </select>
        `;

        return selectHtml;
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
     * Format status for display
     */
    formatStatus(status) {
        return this.getStatusLabel(status);
    }

    /**
     * Update a booking status - works for both card and table views
     */
    async updateBookingStatus(bookingId, newStatus) {
        try {
            // For table view with dropdowns, we already have the confirmation from modal
            // For card view with buttons, confirm the action here
            if (this.displayMode === 'cards') {
                const statusAction = newStatus === 'approved' ? 'approve' : 'mark as completed';
                if (!confirm(`Are you sure you want to ${statusAction} this booking?`)) {
                    return;
                }
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

            // Revert dropdown to original value if in table view
            if (this.pendingStatusChange.element && this.pendingStatusChange.originalValue) {
                this.pendingStatusChange.element.value = this.pendingStatusChange.originalValue;
            }
        } finally {
            this.hideLoadingState();

            // Clear pending change
            this.pendingStatusChange = {
                bookingId: null,
                element: null,
                originalValue: null,
                newValue: null
            };
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
        if (!this.bookingDetailsModal) return;

        const modalContent = this.bookingDetailsModal.querySelector('.modal-content');
        if (!modalContent) return;

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
     * Show confirmation modal for status changes (used in table view)
     */
    showConfirmationModal(newStatusText) {
        if (!this.statusConfirmModal || !this.modalMessage) return;

        this.modalMessage.textContent = `Are you sure you want to change this booking to "${newStatusText}" status?`;
        this.statusConfirmModal.style.display = 'flex';
    }

    /**
     * Confirm status change from modal
     */
    confirmStatusChange() {
        // Hide modal
        if (this.statusConfirmModal) {
            this.statusConfirmModal.style.display = 'none';
        }

        // Proceed with status update
        if (this.pendingStatusChange.bookingId && this.pendingStatusChange.newValue) {
            this.updateBookingStatus(
                this.pendingStatusChange.bookingId,
                this.pendingStatusChange.newValue
            );
        }
    }

    /**
     * Cancel status change from modal
     */
    cancelStatusChange() {
        // Hide modal
        if (this.statusConfirmModal) {
            this.statusConfirmModal.style.display = 'none';
        }

        // Revert select to original value
        if (this.pendingStatusChange.element && this.pendingStatusChange.originalValue) {
            this.pendingStatusChange.element.value = this.pendingStatusChange.originalValue;
        }

        // Clear pending change
        this.pendingStatusChange = {
            bookingId: null,
            element: null,
            originalValue: null,
            newValue: null
        };
    }

    /**
 * Perform search on bookings
 */
    async performSearch() {
        if (!this.searchInput) return;

        const query = this.searchInput.value.trim();

        try {
            // Show loading indicator
            this.showLoadingState();

            // If no query, reload all bookings
            if (!query) {
                this.loadBookings();
                return;
            }

            // Use the controller to search bookings
            const result = await this.searchBookingsController.searchBookings(this.currentUserId, query);

            if (result.success) {
                this.bookings = result.data;
                console.log(`Found ${this.bookings.length} bookings matching "${query}"`);

                // Remove any existing "no results" message
                const existingNoResults = document.querySelector('.no-results');
                if (existingNoResults) {
                    existingNoResults.remove();
                }

                // Display bookings based on current display mode
                this.displayBookings();

                // Check if we have matching results
                if (this.bookings.length === 0) {
                    this.handleSearchResults(false, query, 0);
                }
            } else {
                throw new Error(result.error || 'Failed to search bookings');
            }
        } catch (error) {
            console.error('Error searching bookings:', error);
            this.showNotification(`Search failed: ${error.message}`, 'error');
        } finally {
            // Hide loading indicator
            this.hideLoadingState();
        }
    }

    /**
 * Handle search results - show "no results" message if needed
 */
        handleSearchResults(matchFound, query, totalItems) {
            // Remove any existing "no results" message
            const existingNoResults = document.querySelector('.no-results');
            if (existingNoResults) {
                existingNoResults.remove();
            }

            // If no matches and we have a query
            if (!matchFound || (this.bookings.length === 0 && query)) {
                const noResultsDiv = document.createElement('div');
                noResultsDiv.className = 'no-results';
                noResultsDiv.innerHTML = `
                    <p>No bookings match your search for "${query}"</p>
                    <button class="btn" id="reset-search-btn">Show All Bookings</button>
                `;

                // Insert after bookings container or table
                const parent = (this.displayMode === 'table' && this.bookingsTable)
                    ? this.bookingsTable.parentNode
                    : (this.bookingsContainer ? this.bookingsContainer.parentNode : document.body);

                const insertAfter = this.displayMode === 'table' ? this.bookingsTable : this.bookingsContainer;

                if (parent && insertAfter) {
                    parent.insertBefore(noResultsDiv, insertAfter.nextSibling);

                    // Add event listener to the reset button
                    const resetBtn = document.getElementById('reset-search-btn');
                    if (resetBtn) {
                        resetBtn.addEventListener('click', () => {
                            if (this.searchInput) {
                                this.searchInput.value = '';
                            }
                            this.loadBookings();
                        });
                    }
                } else {
                    document.body.appendChild(noResultsDiv);
                }
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
        // Hide the dynamically created loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Also hide the static loading indicator from HTML
        const staticLoadingIndicator = document.getElementById('bookings-loading');
        if (staticLoadingIndicator) {
            staticLoadingIndicator.style.display = 'none';
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
 * SearchBookingsController - Controller for searching bookings
 */
class SearchBookingsController {
    constructor() {
        this.entity = new CleanerBookingsEntity();
    }

    /**
     * Search bookings with a query string
     * @param {string} providerId - ID of the provider
     * @param {string} query - Search query
     * @returns {Promise<object>} - Result of the search
     */
    async searchBookings(providerId, query) {
        try {
            if (!providerId) {
                return { success: false, error: 'Missing provider ID' };
            }

            return await this.entity.searchBookings(providerId, query);
        } catch (error) {
            console.error('Controller: Error searching bookings:', error);
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
    async searchBookings(providerId, query) {
        try {
            // Encode the query for URL
            const encodedQuery = encodeURIComponent(query || '');

            // Build the API URL
            const url = `${this.apiBaseUrl}/bookings/search?provider_id=${providerId}&query=${encodedQuery}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Entity: Error searching bookings:', error);
            throw error;
        }
    }
}
