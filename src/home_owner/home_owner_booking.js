/**
 * BookingUI - Boundary class responsible for UI interactions
 * Handles all DOM interactions and UI updates
 */
class BookingUI {
    // Static boundary initialization - automatically runs when script is loaded
    static {
        console.log('BookingUI static boundary initialization starting');

        // Wait for DOM to be ready before creating instance
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new BookingUI();
            });
        } else {
            // DOM already loaded, initialize immediately
            new BookingUI();
        }

        console.log('BookingUI static boundary initialization complete');
    }
    constructor() {
        console.log('Initializing BookingUI');


        // Initialize instance variables
        this.serviceId = null;
        this.providerId = null;
        this.serviceName = '';
        this.providerName = '';
        this.currentUserId = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.bookedSlots = {};

        // Initialize controllers
        this.serviceDetailsController = new BookingServiceDetailsController();
        this.bookedSlotsController = new BookedSlotsController();
        this.createBookingController = new CreateBookingController();

        // Only proceed if page is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the booking system
     */
    initialize() {
        // Initialize DOM elements and setup event listeners
        this.initDomElements();
        this.setupEventListeners();

        // Initialize booking system
        this.initBookingSystem();

        console.log('BookingUI initialization complete');
    }

    /**
     * Initialize DOM element references
     */
    initDomElements() {
        console.log('Initializing DOM elements');
        this.bookBtn = document.getElementById('contact-provider-btn');
        this.modal = document.getElementById('booking-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.cancelBookingBtn = document.getElementById('cancel-booking');
        this.confirmBookingBtn = document.getElementById('confirm-booking');
        this.prevMonthBtn = document.getElementById('prev-month');
        this.nextMonthBtn = document.getElementById('next-month');
        this.calendarElement = document.getElementById('booking-calendar');
        this.timeSlotsContainer = document.getElementById('time-slots');
        this.summaryContainer = document.getElementById('booking-summary');
        this.currentMonthElement = document.getElementById('current-month');

        // Log element status for debugging
        console.log('Book Button found:', !!this.bookBtn);
        console.log('Modal found:', !!this.modal);
    }

    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        if (this.bookBtn) {
            console.log('Adding click listener to book button');
            this.bookBtn.addEventListener('click', (e) => {
                console.log('Book button clicked');
                e.preventDefault();
                this.showBookingModal();
            });
        } else {
            console.error('Book button element not found!');
        }

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.cancelBookingBtn) {
            this.cancelBookingBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.confirmBookingBtn) {
            this.confirmBookingBtn.addEventListener('click', () => this.confirmBooking());
        }

        if (this.prevMonthBtn) {
            this.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        }

        if (this.nextMonthBtn) {
            this.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        }
    }

    /**
     * Initialize the booking system
     */
    initBookingSystem() {
        // Get current user info from localStorage
        this.currentUserId = localStorage.getItem('currentUserId') || 'guest';

        // Get service ID from URL parameter
        this.serviceId = this.getUrlParameter('id');

        // Fetch service and provider details if we have a service ID
        if (this.serviceId) {
            this.fetchServiceDetails();
        }

        console.log("Booking system initialized with serviceId:", this.serviceId);
    }

    /**
     * Fetch service details including provider ID
     */
    async fetchServiceDetails() {
        try {
            const result = await this.serviceDetailsController.getServiceDetails(this.serviceId);

            if (result.success && result.data) {
                const service = result.data;
                this.providerId = service.user_id;
                this.serviceName = service.title || 'Unnamed Service';
                this.providerName = this.getProviderName(service);

                // Update the modal with service and provider names
                document.getElementById('booking-service-title').textContent = this.serviceName;
                document.getElementById('booking-provider-name').textContent = this.providerName;

                console.log("Service details fetched successfully. Provider ID:", this.providerId);

                // Fetch booked slots for this provider
                this.fetchBookedSlots();
            } else {
                console.error('Failed to load service details for booking');
            }
        } catch (error) {
            console.error('Error loading service details for booking:', error);
        }
    }

    /**
     * Fetch booked slots for this service and provider
     */
    async fetchBookedSlots() {
        try {
            console.log("Attempting to fetch booked slots for provider ID:", this.providerId);

            if (!this.providerId) {
                console.warn("No provider ID available for booking slot fetch");
                this.bookedSlots = {}; // Set to empty object to continue without booked slots
                return;
            }

            // Get booked slots from controller
            const result = await this.bookedSlotsController.getBookedSlots(this.providerId);
            this.bookedSlots = result;

            console.log('Booked slots loaded:', this.bookedSlots);
        } catch (error) {
            console.error('Error fetching booked slots:', error);
            // Fallback to empty booked slots if the API call fails
            this.bookedSlots = {};
        }
    }

    /**
     * Show the booking modal
     */
    showBookingModal() {
        // First make sure we have the necessary data
        if (!this.serviceId) {
            console.error('Missing service ID for booking');
            alert('Unable to book right now. Please try again later.');
            return;
        }

        console.log("Showing booking modal. ServiceId:", this.serviceId, "ProviderId:", this.providerId);

        // Show the modal - with improved error handling
        if (this.modal) {
            console.log("Modal element found, setting display to block");

            // Force display to block and ensure it's visible
            this.modal.style.display = 'block';

            // For debugging
            setTimeout(() => {
                console.log("Modal current display style:",
                    window.getComputedStyle(this.modal).getPropertyValue('display'));
            }, 100);
        } else {
            console.error("Booking modal element not found!");
        }

        // Initialize the calendar
        this.initCalendar();
    }

    /**
     * Initialize the calendar with the current month
     */
    initCalendar() {
        const today = new Date();
        this.renderCalendar(today.getFullYear(), today.getMonth());
    }

    /**
     * Render the calendar for a specific month
     */
    renderCalendar(year, month) {
        if (!this.calendarElement) return;

        // Update the month display
        const monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];
        this.currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        // Clear the calendar
        this.calendarElement.innerHTML = '';

        // Add weekday headers
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'weekday';
            dayElement.textContent = day;
            this.calendarElement.appendChild(dayElement);
        });

        // Get the first day of the month and the total days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add blank spaces for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const spacer = document.createElement('div');
            spacer.className = 'day empty';
            this.calendarElement.appendChild(spacer);
        }

        // Add the days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = i;

            // Format the date string to check against booked slots
            const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

            // Check if this date has any bookings
            if (this.bookedSlots[dateString] && this.bookedSlots[dateString].length > 0) {
                dayElement.classList.add('has-bookings');
            }

            // Check if this date is in the past
            const currentDate = new Date(year, month, i);
            if (currentDate < today) {
                dayElement.classList.add('disabled');
            } else {
                // Add click event to select the date
                dayElement.addEventListener('click', () => this.selectDate(dateString, dayElement));
            }

            this.calendarElement.appendChild(dayElement);
        }
    }

    /**
     * Change the month displayed in the calendar
     */
    changeMonth(delta) {
        const currentMonth = this.currentMonthElement.textContent;
        const [monthName, year] = currentMonth.split(' ');

        const monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];
        let monthIndex = monthNames.indexOf(monthName);
        let yearNum = parseInt(year);

        monthIndex += delta;

        if (monthIndex < 0) {
            monthIndex = 11;
            yearNum--;
        } else if (monthIndex > 11) {
            monthIndex = 0;
            yearNum++;
        }

        this.renderCalendar(yearNum, monthIndex);

        // Clear time slot selection when month changes
        this.clearTimeSlots();
        this.updateBookingSummary();
    }

    /**
     * Handle date selection in the calendar
     */
    selectDate(dateString, element) {
        // Remove selected class from any previously selected date
        const allDays = document.querySelectorAll('.calendar .day');
        allDays.forEach(day => day.classList.remove('selected'));

        // Add selected class to the clicked date
        element.classList.add('selected');

        // Update the selected date
        this.selectedDate = dateString;

        // Update the time slots for this date
        this.renderTimeSlots(dateString);

        // Update booking summary
        this.updateBookingSummary();
    }

    /**
     * Render the available time slots for a selected date
     */
    renderTimeSlots(dateString) {
        if (!this.timeSlotsContainer) return;

        // Clear existing time slots
        this.timeSlotsContainer.innerHTML = '';

        // Business hours: 8 AM to 8 PM (last slot is 7pm-8pm)
        const startHour = 8;
        const endHour = 20; // Using 20 for 8 PM

        // Get booked slots for this date
        const bookedTimesForDate = this.bookedSlots[dateString] || [];

        // Create time slots in 1-hour intervals with display showing range
        for (let hour = startHour; hour < endHour; hour++) {
            // Create the time slot element
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';

            // Format start time (e.g., "8:00")
            const startTime = `${hour.toString().padStart(2, '0')}:00`;

            // Format end time (e.g., "9:00")
            const endHour = (hour + 1) % 24;

            // Format as "8:00 AM - 9:00 AM"
            const timeRange = this.formatTimeSlotRange(hour, endHour);

            // Set the display text as a range
            timeSlot.textContent = timeRange;

            // Store the start time as a data attribute (we'll use this when selecting)
            timeSlot.dataset.time = startTime;

            // Check if this slot is booked
            if (bookedTimesForDate.includes(startTime)) {
                timeSlot.classList.add('disabled');
                timeSlot.title = 'This time slot is already booked';
            } else {
                // Add click event to select the time
                timeSlot.addEventListener('click', () => this.selectTimeSlot(startTime, timeSlot));
            }

            this.timeSlotsContainer.appendChild(timeSlot);
        }
    }

    /**
     * Clear time slots when needed
     */
    clearTimeSlots() {
        if (this.timeSlotsContainer) {
            this.timeSlotsContainer.innerHTML = '<p>Please select a date first</p>';
        }

        // Reset selected time
        this.selectedTime = null;
    }

    /**
     * Handle time slot selection
     */
    selectTimeSlot(timeString, element) {
        // Remove selected class from any previously selected time slot
        const allTimeSlots = document.querySelectorAll('.time-slot');
        allTimeSlots.forEach(slot => slot.classList.remove('selected'));

        // Add selected class to the clicked time slot
        element.classList.add('selected');

        // Update the selected time
        this.selectedTime = timeString;

        // Update booking summary
        this.updateBookingSummary();

        // Enable the confirm button if both date and time are selected
        if (this.confirmBookingBtn) {
            this.confirmBookingBtn.disabled = !(this.selectedDate && this.selectedTime);
        }
    }

    /**
     * Update the booking summary
     */
    updateBookingSummary() {
        if (!this.summaryContainer) return;

        if (this.selectedDate && this.selectedTime) {
            // Format date for display
            const formattedDate = this.formatDateForDisplay(this.selectedDate);

            // Format selected time range
            const hour = parseInt(this.selectedTime.split(':')[0]);
            const timeRange = this.formatTimeSlotRange(hour, (hour + 1) % 24);

            this.summaryContainer.innerHTML = `
                <h3>Booking Summary</h3>
                <p><strong>Service:</strong> ${this.serviceName}</p>
                <p><strong>Provider:</strong> ${this.providerName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${timeRange}</p>
            `;
        } else if (this.selectedDate) {
            this.summaryContainer.innerHTML = `
                <h3>Booking Summary</h3>
                <p><strong>Service:</strong> ${this.serviceName}</p>
                <p><strong>Provider:</strong> ${this.providerName}</p>
                <p><strong>Date:</strong> ${this.formatDateForDisplay(this.selectedDate)}</p>
                <p>Please select a time slot</p>
            `;
        } else {
            this.summaryContainer.innerHTML = `
                <h3>Booking Summary</h3>
                <p>Please select a date and time</p>
            `;
        }
    }

    /**
     * Confirm the booking
     */
    async confirmBooking() {
        if (!this.selectedDate || !this.selectedTime || !this.serviceId || !this.providerId || !this.currentUserId) {
            alert('Please select both a date and time to confirm your booking.');
            return;
        }

        try {
            // First, notify the user we're processing
            if (this.confirmBookingBtn) {
                this.confirmBookingBtn.disabled = true;
                this.confirmBookingBtn.textContent = 'Processing...';
            }

            // Prepare the booking data
            const bookingData = {
                user_id: this.currentUserId,
                listing_id: parseInt(this.serviceId),
                provider_id: this.providerId,
                scheduled_date: this.selectedDate,
                scheduled_time: this.selectedTime + ':00', // Add seconds to match the database format
                status: 'pending_approval'
            };

            console.log('Sending booking data:', bookingData);

            // Use controller to create booking
            const result = await this.createBookingController.createBooking(bookingData);

            if (result.success) {
                // Show success message
                alert(`Booking confirmed for ${this.serviceName} on ${this.formatDateForDisplay(this.selectedDate)} at ${this.selectedTime}. You will receive a service confirmation shortly.`);

                // Close the modal
                this.closeModal();
            } else {
                throw new Error(result.error || 'Booking failed');
            }
        } catch (error) {
            console.error('Error confirming booking:', error);
            alert('An error occurred while confirming your booking: ' + error.message);

            // Re-enable the button
            if (this.confirmBookingBtn) {
                this.confirmBookingBtn.disabled = false;
                this.confirmBookingBtn.textContent = 'Confirm Booking';
            }
        }
    }

    /**
     * Close the booking modal
     */
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }

        // Reset selections
        this.selectedDate = null;
        this.selectedTime = null;

        // Reset the confirm button
        if (this.confirmBookingBtn) {
            this.confirmBookingBtn.disabled = true;
            this.confirmBookingBtn.textContent = 'Confirm Booking';
        }
    }

    /**
     * Format a time slot range with AM/PM notation
     */
    formatTimeSlotRange(startHour, endHour) {
        const startAmPm = startHour >= 12 ? 'PM' : 'AM';
        const endAmPm = endHour >= 12 ? 'PM' : 'AM';

        const hours12Start = startHour % 12 || 12; // Convert 0 to 12 for 12 AM
        const hours12End = endHour % 12 || 12;

        return `${hours12Start}:00 ${startAmPm} - ${hours12End}:00 ${endAmPm}`;
    }

    /**
     * Format a single time with AM/PM notation
     */
    formatTimeWithAMPM(hours, minutes) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    /**
     * Format a date string for display
     */
    formatDateForDisplay(dateString) {
        const dateObj = new Date(dateString);
        return dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Get provider name from service data
     */
    getProviderName(service) {
        // First try the joined provider_name field
        if (service.provider_name) {
            return service.provider_name;
        }

        // Next try to create it from first_name and last_name if available
        if (service.first_name && service.last_name) {
            return `${service.first_name} ${service.last_name}`;
        }

        // Fallback to user_id if no name is available
        if (service.user_id) {
            return `Provider ${service.user_id}`;
        }

        // Last resort
        return 'Unknown Provider';
    }

    /**
     * Helper function to get URL parameters
     */
    getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
}

// ===================== CONTROLLER LAYER =====================
// Each controller handles specific operations and business logic

/**
 * Controller for getting service details specifically for booking
 */
class BookingServiceDetailsController {
    constructor() {
        console.log('Initializing BookingServiceDetailsController');
        this.entity = new BookingEntity();
    }

    /**
     * Get service details from entity layer
     */
    async getServiceDetails(serviceId) {
        if (!serviceId) {
            return { success: false, error: 'Missing service ID' };
        }

        try {
            return await this.entity.getServiceDetails(serviceId);
        } catch (error) {
            console.error('Controller: Error getting service details:', error);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Controller for getting booked slots
 */
class BookedSlotsController {
    constructor() {
        console.log('Initializing BookedSlotsController');
        this.entity = new BookingEntity();
    }

    /**
     * Get booked slots for a provider from entity layer
     */
    async getBookedSlots(providerId) {
        if (!providerId) {
            console.warn('Controller: Missing provider ID for booked slots');
            return {};
        }

        try {
            const result = await this.entity.getBookedSlots(providerId);

            // Process the data from the entity layer into the format needed by the UI
            if (result.success && result.data && result.data.bookings) {
                const bookedSlots = {};

                result.data.bookings.forEach(booking => {
                    const date = booking.scheduled_date;
                    const time = booking.scheduled_time.substring(0, 5); // Convert "HH:MM:SS" to "HH:MM"

                    if (!bookedSlots[date]) {
                        bookedSlots[date] = [];
                    }

                    if (!bookedSlots[date].includes(time)) {
                        bookedSlots[date].push(time);
                    }
                });

                return bookedSlots;
            } else {
                // Return empty object if no data
                console.warn('No booking data received from API, returning empty slots');
                return {};
            }
        } catch (error) {
            console.error('Controller: Error getting booked slots:', error);
            // Return empty object if API fails
            return {};
        }
    }
}

/**
 * Controller for creating bookings
 */
class CreateBookingController {
    constructor() {
        console.log('Initializing CreateBookingController');
        this.entity = new BookingEntity();
    }

    /**
     * Create a new booking through entity layer
     */
    async createBooking(bookingData) {
        try {
            // Validate booking data
            if (!this.validateBookingData(bookingData)) {
                return { success: false, error: 'Invalid booking data' };
            }

            // Call the entity to make the API request
            return await this.entity.createBooking(bookingData);
        } catch (error) {
            console.error('Controller: Error creating booking:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate booking data
     */
    validateBookingData(data) {
        // Check required fields
        if (!data.user_id || !data.listing_id || !data.provider_id ||
            !data.scheduled_date || !data.scheduled_time) {
            return false;
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.scheduled_date)) {
            return false;
        }

        // Validate time format (HH:MM:SS)
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(data.scheduled_time)) {
            return false;
        }

        return true;
    }
}

// ===================== ENTITY LAYER =====================
// Single entity class that handles all data operations
class BookingEntity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        console.log('BookingEntity initialized with API base URL:', this.apiBaseUrl);
    }

    /**
     * Get service details from API
     */
    async getServiceDetails(serviceId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/listings/${serviceId}`);

            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Entity: Error fetching service details:', error);
            return {success: false, error: error.message};
        }
    }

    /**
     * Get booked slots for a provider from API
     */
    async getBookedSlots(providerId) {
        try {
            const url = `${this.apiBaseUrl}/bookings/availability?provider_id=${providerId}`;
            console.log('Fetching availability from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }

            const result = await response.json();
            console.log('API response for booked slots:', result);

            return result;
        } catch (error) {
            console.error('Entity: Error fetching booked slots:', error);
            throw error; // Let controller handle the error
        }
    }

    /**
     * Create a new booking via API
     */
    async createBooking(bookingData) {
        try {
            const url = `${this.apiBaseUrl}/bookings`;
            console.log('Sending booking request to:', url);
            console.log('Booking data:', JSON.stringify(bookingData));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            // Check if response is OK before parsing JSON
            if (!response.ok) {
                console.error('Booking API error:', response.status, response.statusText);
                // Try to get error details
                const errorText = await response.text();
                console.error('Error response:', errorText);

                let errorMessage;
                try {
                    // Try to parse error as JSON
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || `API error: ${response.status} ${response.statusText}`;
                } catch (e) {
                    // If not JSON, use the raw text
                    errorMessage = errorText || `API error: ${response.status} ${response.statusText}`;
                }

                return {success: false, error: errorMessage};
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Entity: Error creating booking:', error);
            return {success: false, error: error.message};
        }
    }
}

console.log('home_owner_booking.js loaded, creating BookingUI instance');