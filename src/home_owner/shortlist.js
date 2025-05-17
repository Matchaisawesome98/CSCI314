// ===================== BOUNDARY LAYER (UI) =====================
// Handles all UI interactions and delegates to appropriate controllers
class shortListUI {
    constructor() {
        console.log('Initializing ShortListUI');

        // Initialize controllers
        this.addController = new AddToShortlistController();
        this.removeController = new RemoveFromShortlistController();
        this.checkController = new CheckShortlistController();
        this.getUserController = new GetUserShortlistController();

        // User info
        this.userId = localStorage.getItem('currentUserId');
        this.userRole = localStorage.getItem('userRole') || 'home_owner';
        this.shortlistCache = new Map(); // Cache for shortlist status

        // Determine what page we're on
        this.isShortlistPage = window.location.pathname.includes('home_owner_shortlists.html');

        // Initialize appropriate functionality based on page
        if (this.isShortlistPage) {
            console.log('On shortlist page, initializing shortlist view');
            this.initShortlistPageElements();
            this.setupShortlistPageListeners();
            this.viewShortlistedServices();
        } else if (this.userId && this.userRole === 'home_owner') {
            // On other pages with service cards, add shortlist buttons
            console.log('On regular page, initializing shortlist buttons');
            this.preloadUserShortlist().then(() => {
                this.initDomElements();
                this.setupEventListeners();
                this.addShortlistButtonsToCards();
            });
        } else {
            console.log('User is not a home_owner or not logged in, skipping shortlist initialization');
        }
    }

    // Preload all user's shortlisted items to improve performance
    async preloadUserShortlist() {
        if (!this.userId) return;

        console.log('Preloading shortlist data for user:', this.userId);
        try {
            const result = await this.getUserController.getUserShortlist(this.userId);
            if (result.success) {
                // Populate cache with shortlisted items
                result.data.forEach(item => {
                    const listingId = item.listing_id;
                    this.shortlistCache.set(`${this.userId}-${listingId}`, true);
                });
                console.log(`Preloaded ${result.data.length} shortlisted items`);
            } else {
                console.error('Failed to preload shortlist:', result.error);
            }
        } catch (error) {
            console.error('Error preloading shortlist:', error);
        }
    }

    initDomElements() {
        // Find all service cards on the page
        this.serviceCards = document.querySelectorAll('.service-card');
        console.log(`Found ${this.serviceCards.length} service cards`);

        // Find search-related elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.servicesContainer = document.getElementById('services-container');

        // Initialize search UI elements if on shortlist page
        if (this.searchInput && this.searchBtn) {
            this.setupSearchUI();
        }
    }

    setupEventListeners() {
        // Set up event delegation for shortlist button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('shortlist-btn')) {
                const listingId = event.target.dataset.id;
                console.log('Shortlist button clicked for ID:', listingId);
                this.handleShortlistButtonClick(listingId, event.target);
            }
        });
        console.log('Event listeners set up');

        // Setup search event listeners if on shortlist page
        if (this.searchInput && this.searchBtn) {
            this.setupSearchEventListeners();
        }
    }

    // Setup search UI elements
    setupSearchUI() {
        console.log('Setting up search UI elements');

        // Add clear button inside the search input if it doesn't exist
        const searchContainer = this.searchInput.parentElement;
        if (searchContainer && !document.getElementById('search-clear-btn')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'search-clear-btn';
            clearBtn.className = 'search-clear-btn';
            clearBtn.innerHTML = '✕';
            clearBtn.style.position = 'absolute';
            clearBtn.style.right = '40px'; // Position to the left of the search button
            clearBtn.style.top = '50%';
            clearBtn.style.transform = 'translateY(-50%)';
            clearBtn.style.background = 'none';
            clearBtn.style.border = 'none';
            clearBtn.style.color = '#757575';
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.display = 'none'; // Hide initially

            searchContainer.appendChild(clearBtn);

            // Show/hide clear button based on input content
            this.searchInput.addEventListener('input', function() {
                clearBtn.style.display = this.value ? 'block' : 'none';
            });
        }
    }

    // Setup search-related event listeners
    setupSearchEventListeners() {
        console.log('Setting up search event listeners');

        // Search button click
        this.searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        // Live search as user types (with debounce)
        let debounceTimer;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.performSearch(), 300); // 300ms debounce

            // Show/hide the clear button
            const clearBtn = document.getElementById('search-clear-btn');
            if (clearBtn) {
                clearBtn.style.display = this.searchInput.value ? 'block' : 'none';
            }
        });

        // Search on Enter key
        this.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Clear search when button clicked
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.searchInput.focus();
                this.performSearch();
                clearBtn.style.display = 'none';
            });
        }

        // Initial search if input has value on page load
        if (this.searchInput.value.trim()) {
            this.performSearch();
        }
    }

    // Perform search and filter services
    performSearch() {
        console.log('Performing search');

        const query = this.searchInput.value.trim().toLowerCase();

        // Remove any previous "no results" message
        const existingNoResults = document.querySelector('.no-results');
        if (existingNoResults) {
            existingNoResults.remove();
        }

        // If search is empty, show all cards
        if (!query) {
            const cards = document.querySelectorAll('.service-card');
            cards.forEach(card => {
                card.style.display = '';
            });
            return;
        }

        // Get all service cards
        const cards = document.querySelectorAll('.service-card');
        let matchFound = false;

        // Filter cards based on search query
        cards.forEach(card => {
            const title = card.querySelector('.service-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.service-description')?.textContent.toLowerCase() || '';
            const price = card.querySelector('.service-price')?.textContent.toLowerCase() || '';
            const category = card.querySelector('.tag')?.textContent.toLowerCase() || '';
            const provider = card.querySelector('.provider-name')?.textContent.toLowerCase() || '';

            // Check if any field contains the search query
            if (
                title.includes(query) ||
                description.includes(query) ||
                price.includes(query) ||
                category.includes(query) ||
                provider.includes(query)
            ) {
                card.style.display = '';
                matchFound = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Show "no results" message if no matches found
        if (!matchFound && cards.length > 0) {
            this.showNoResultsMessage(query);
        }
    }

    // Show no results message
    showNoResultsMessage(query) {
        const noResultsElement = document.createElement('div');
        noResultsElement.className = 'no-results';
        noResultsElement.style.gridColumn = '1 / -1';
        noResultsElement.style.textAlign = 'center';
        noResultsElement.style.padding = '30px';
        noResultsElement.style.backgroundColor = 'white';
        noResultsElement.style.borderRadius = '8px';
        noResultsElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        noResultsElement.style.margin = '20px 0';

        noResultsElement.innerHTML = `
            <p style="margin-bottom: 15px; font-size: 16px;">No services match your search for "<strong>${query}</strong>"</p>
            <button class="btn" style="background-color: #ff5722; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer;">Clear Search</button>
        `;

        this.servicesContainer.appendChild(noResultsElement);

        // Add event listener to the clear button
        const clearButton = noResultsElement.querySelector('button');
        clearButton.addEventListener('click', () => {
            this.searchInput.value = '';
            this.performSearch();

            // Hide the clear button as well
            const clearBtn = document.getElementById('search-clear-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }
        });
    }

    // Improved method to add shortlist buttons to cards with better status checking
    async addShortlistButtonsToCards() {
        // Skip if user is not a home_owner or not logged in
        if (this.userRole !== 'home_owner' || !this.userId) {
            return;
        }

        console.log(`Adding shortlist buttons to ${this.serviceCards.length} cards`);

        // Process each card
        for (let index = 0; index < this.serviceCards.length; index++) {
            const card = this.serviceCards[index];

            // Find the card-buttons div
            const cardButtons = card.querySelector('.card-buttons');
            if (!cardButtons) continue;

            // Find the listing ID from the view details button
            const viewDetailsBtn = cardButtons.querySelector('.view-details-btn');
            if (!viewDetailsBtn) continue;

            const listingId = viewDetailsBtn.dataset.id;
            if (!listingId) continue;

            // Check if shortlist button already exists
            if (cardButtons.querySelector('.shortlist-btn')) {
                // Update existing button instead of creating a new one
                await this.updateExistingShortlistButton(cardButtons.querySelector('.shortlist-btn'), listingId);
                continue;
            }

            // Create shortlist button
            const shortlistBtn = document.createElement('button');
            shortlistBtn.className = 'btn card-btn shortlist-btn';
            shortlistBtn.dataset.id = listingId;
            shortlistBtn.style.marginLeft = '5px';

            // Initially set to loading state
            shortlistBtn.innerHTML = '⏳';
            shortlistBtn.disabled = true;

            // Ensure consistent styling for the buttons container
            cardButtons.style.display = 'flex';
            cardButtons.style.flexDirection = 'row';
            cardButtons.style.justifyContent = 'flex-end';
            cardButtons.style.gap = '5px';

            // Add button to card before checking status
            cardButtons.insertBefore(shortlistBtn, viewDetailsBtn);

            // Check shortlist status and update button
            await this.updateExistingShortlistButton(shortlistBtn, listingId);
        }
    }

    // Update an existing shortlist button based on current status
    async updateExistingShortlistButton(button, listingId) {
        try {
            if (!this.userId) return;

            // Check cache first
            const cacheKey = `${this.userId}-${listingId}`;
            if (this.shortlistCache.has(cacheKey)) {
                console.log('Using cached shortlist status for:', cacheKey);
                button.disabled = false;
                if (this.shortlistCache.get(cacheKey)) {
                    // Item is shortlisted - update both icon and text
                    button.innerHTML = '❤️ Shortlisted';
                    button.classList.add('shortlisted');
                } else {
                    // Item is not shortlisted - update both icon and text
                    button.innerHTML = '🤍 Shortlist';
                    button.classList.remove('shortlisted');
                }
                return;
            }

            // If not in cache, check server
            const checkResult = await this.checkController.checkShortlistStatus(this.userId, listingId);
            console.log(`Shortlist check for listing ${listingId}:`, checkResult);

            // Enable the button
            button.disabled = false;

            if (checkResult.success && checkResult.isShortlisted) {
                // Item is already shortlisted - update both icon and text
                button.innerHTML = '❤️ Shortlisted';
                button.classList.add('shortlisted');
                this.shortlistCache.set(cacheKey, true);
            } else {
                // Item is not shortlisted - update both icon and text
                button.innerHTML = '🤍 Shortlist';
                button.classList.remove('shortlisted');
                this.shortlistCache.set(cacheKey, false);
            }
        } catch (error) {
            console.error(`Error checking shortlist status for listing ${listingId}:`, error);
            // Default state on error
            button.innerHTML = '🤍 Shortlist';
            button.disabled = false;
        }
    }

    // Handle shortlist button click with improved error handling
    async handleShortlistButtonClick(listingId, buttonElement) {
        try {
            console.log('Handling shortlist button click for ID:', listingId);

            // Validate user is logged in
            if (!this.userId) {
                this.showToast('Please log in to shortlist items', 'error');
                return;
            }

            // Validate inputs
            if (!listingId) {
                // Try to get the ID from the button itself as a fallback
                listingId = buttonElement.getAttribute('data-id');

                // If still no ID, show error and return
                if (!listingId) {
                    this.showToast('Missing listing ID. Please try again later.', 'error');
                    return;
                }
            }

            // Check if already shortlisted (from button state)
            const isAlreadyShortlisted = buttonElement.classList.contains('shortlisted');

            // Show loading state
            buttonElement.innerHTML = isAlreadyShortlisted ? '⏳ Removing...' : '⏳ Adding...';
            buttonElement.disabled = true;

            let result;

            // Toggle action based on current state
            if (isAlreadyShortlisted) {
                // If already shortlisted, remove from shortlist
                result = await this.removeController.removeFromShortlist(this.userId, listingId);
                console.log('Controller returned remove result:', result);

                // Update button based on result
                if (result.success) {
                    buttonElement.innerHTML = '🤍 Shortlist';
                    buttonElement.classList.remove('shortlisted');
                    this.shortlistCache.set(`${this.userId}-${listingId}`, false); // Update cache
                    this.showToast('Removed from your shortlist!', 'success');
                } else {
                    // Failed to remove, revert to shortlisted state
                    buttonElement.innerHTML = '❤️ Shortlisted';
                    buttonElement.classList.add('shortlisted');
                    const errorMsg = result.error || 'Unknown error';
                    this.showToast(`Failed to remove: ${errorMsg}`, 'error');
                }
            } else {
                // If not shortlisted, add to shortlist
                result = await this.addController.addToShortlist(this.userId, listingId);
                console.log('Controller returned add result:', result);

                // Update button based on result
                if (result.success) {
                    buttonElement.innerHTML = '❤️ Shortlisted';
                    buttonElement.classList.add('shortlisted');
                    this.shortlistCache.set(`${this.userId}-${listingId}`, true); // Update cache
                    this.showToast('Added to your shortlist!', 'success');
                } else {
                    // Check if it failed because it's already shortlisted
                    if (result.error && result.error.includes('already in your shortlist')) {
                        buttonElement.innerHTML = '❤️ Shortlisted';
                        buttonElement.classList.add('shortlisted');
                        this.shortlistCache.set(`${this.userId}-${listingId}`, true); // Update cache
                        this.showToast('Already in your shortlist!', 'info');
                    } else {
                        buttonElement.innerHTML = '🤍 Shortlist';
                        buttonElement.classList.remove('shortlisted');
                        this.shortlistCache.set(`${this.userId}-${listingId}`, false); // Update cache
                        const errorMsg = result.error || 'Unknown error';
                        this.showToast(errorMsg, 'error');
                    }
                }
            }

            // Re-enable button
            buttonElement.disabled = false;

        } catch (error) {
            console.error('Error handling shortlist action:', error);
            buttonElement.disabled = false;

            // Determine which state to revert to based on previous state
            if (buttonElement.classList.contains('shortlisted')) {
                buttonElement.innerHTML = '❤️ Shortlisted';
            } else {
                buttonElement.innerHTML = '🤍 Shortlist';
            }

            this.showToast('Failed to update shortlist. Please try again later.', 'error');
        }
    }

    updateButtonState(button, isShortlisted) {
        if (isShortlisted) {
            // Check if we're on the details page or cards page
            const isDetailsPage = window.location.href.includes('viewDetails.html');

            if (isDetailsPage) {
                // On details page, use "Unshortlist" text
                button.innerHTML = '<span class="shortlist-icon">❤️</span> Unshortlist';
            } else {
                // On cards/homepage, use "Shortlisted" text
                button.innerHTML = '❤️ Shortlisted';
            }
            button.classList.add('shortlisted');
        } else {
            // Not shortlisted - same for both pages
            button.innerHTML = window.location.href.includes('viewDetails.html') ?
                '<span class="shortlist-icon">🤍</span> Shortlist' :
                '🤍 Shortlist';
            button.classList.remove('shortlisted');
        }
    }

    // ---------- SHORTLIST PAGE SPECIFIC METHODS ----------

    initShortlistPageElements() {
        this.servicesContainer = document.getElementById('services-container');
        this.emptyState = document.getElementById('empty-state');
        this.searchInput = document.getElementById('search-input');

        // Initialize user display
        this.initUserDisplay();
    }

    initUserDisplay() {
        const username = localStorage.getItem('currentUsername') || 'Guest';
        const userInitial = username.charAt(0).toUpperCase();

        const usernameDisplay = document.getElementById('username-display');
        const userAvatar = document.getElementById('user-avatar');

        if (usernameDisplay) usernameDisplay.textContent = username;
        if (userAvatar) userAvatar.textContent = userInitial;
    }

    setupShortlistPageListeners() {
        // Search input for the shortlist page
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.filterShortlistedServices());
        }

        // Event delegation for remove buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('view-btn')) {
                const card = event.target.closest('.service-card');
                const serviceId = card?.dataset.id;
                if (serviceId) window.location.href = `../viewDetails.html?id=${serviceId}`;
            }
        });
    }

    async viewShortlistedServices() {
        if (!this.userId) {
            this.showEmptyState("Please log in to view your shortlisted services");
            return;
        }

        try {
            // Show loading state
            this.servicesContainer.innerHTML = '<p style="text-align:center;padding:20px;">Loading your shortlisted services...</p>';

            // Get shortlisted items for the user
            const shortlistResult = await this.getUserController.getUserShortlist(this.userId);

            if (!shortlistResult.success || !shortlistResult.data || shortlistResult.data.length === 0) {
                this.showEmptyState();
                return;
            }

            // Get all service listings
            const serviceEntity = new service();
            const servicesResult = await serviceEntity.readCleaningService();

            if (!servicesResult.success) {
                this.servicesContainer.innerHTML = '<p style="text-align:center;padding:20px;">Failed to load services. Please try again later.</p>';
                return;
            }

            // Match shortlisted IDs with full service data
            const shortlistedIds = shortlistResult.data.map(item => item.listing_id);
            const shortlistedServices = servicesResult.data.filter(service => {
                // Check various ID formats that might be used
                return shortlistedIds.includes(service.listing_id) ||
                       shortlistedIds.includes(service.id) ||
                       (service._id && shortlistedIds.includes(service._id.toString()));
            });

            console.log(`Found ${shortlistedServices.length} shortlisted services`);

            // Render the services
            this.renderShortlistedServices(shortlistedServices);
        } catch (error) {
            console.error('Error loading shortlisted services:', error);
            this.servicesContainer.innerHTML = '<p style="text-align:center;padding:20px;">An error occurred while loading your shortlisted services.</p>';
        }
    }

        prepareServiceForDisplay(service) {
        return {
            id: service.listing_id || service.id || service._id || '0',
            title: service.title || 'Unnamed Service',
            description: service.description || 'No description available',
            formattedPrice: this.formatPrice(service.price),
            imageUrl: service.image_path || this.getDefaultImage(),
            category: service.category_name || service.category || 'Uncategorized',
            providerName: this.getProviderName(service),
            filterCategory: this.getCategoryFilter(service.category_name || service.category),
            isOwner: this.isServiceOwner(service.user_id)
        };
    }

    formatPrice(price) {
        const priceNum = typeof price === 'string' ? parseFloat(price) : price;
        return !isNaN(priceNum) ? `S$${priceNum.toFixed(2)}` : 'Price not available';
    }

    // Get default image if none provided
    getDefaultImage() {
        return 'https://placehold.co/600x400?text=Cleaning+Service';
    }

    // Map category to filter value
    getCategoryFilter(category) {
        if (!category) return 'all';

        category = category.toLowerCase();
        const filterMap = {
            'home': 'home',
            'office': 'office',
            'carpet': 'carpet',
            'window': 'windows',
            'deep': 'deep'
        };

        for (const [key, value] of Object.entries(filterMap)) {
            if (category.includes(key)) return value;
        }

        return 'all';
    }

    // Check if user is the owner of the service listing
    isServiceOwner(serviceUserId) {
        const currentUserId = localStorage.getItem('currentUserId');
        return serviceUserId === currentUserId;
    }

    // Get provider name - use first priority field or fallback to alternatives
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


    renderShortlistedServices(services) {
        // Clear the container
        this.servicesContainer.innerHTML = '';

        // Check if we have any services to display
        if (!services || services.length === 0) {
            this.showEmptyState();
            return;
        }

        // Hide empty state if we have services
        this.emptyState.style.display = 'none';

        // Add grid class to the container
        this.servicesContainer.classList.add('services-grid');

        // Get the template
        const template = document.getElementById('service-card-template');
        if (!template) {
            console.error('Service card template not found');
            return;
        }

        // Create a controller to prepare service data
        const controller = new readServiceController();

        // Render each service
        services.forEach(service => {
            try {
                // Clone the template
                const card = document.importNode(template.content, true).querySelector('.service-card');

                // Prepare the service data
                const processedService = this.prepareServiceForDisplay(service);

                // Set data attributes
                card.setAttribute('data-id', processedService.id);
                card.setAttribute('data-category', processedService.filterCategory);

                // Set content
                card.querySelector('.service-image').src = processedService.imageUrl;
                card.querySelector('.service-image').alt = processedService.title;
                card.querySelector('.service-title').textContent = processedService.title;
                card.querySelector('.service-price').textContent = processedService.formattedPrice;
                card.querySelector('.service-description').textContent = processedService.description;
                card.querySelector('.tag').textContent = processedService.category;

                // Set provider name if the element exists
                const providerElement = card.querySelector('.provider-name');
                if (providerElement) {
                    providerElement.textContent = processedService.providerName;
                }

                // Set up buttons
                const viewBtn = card.querySelector('.view-btn');
                if (viewBtn) {
                    viewBtn.dataset.id = processedService.id;
                }

                const removeBtn = card.querySelector('.remove-btn');
                if (removeBtn) {
                    removeBtn.dataset.id = processedService.id;
                }

                // Add the card to the container
                this.servicesContainer.appendChild(card);
            } catch (error) {
                console.error('Error rendering service card:', error);
            }
        });
    }

    filterShortlistedServices() {
        const query = this.searchInput.value.trim().toLowerCase();
        const cards = this.servicesContainer.querySelectorAll('.service-card');
        let hasVisibleCards = false;

        cards.forEach(card => {
            const title = card.querySelector('.service-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.service-description')?.textContent.toLowerCase() || '';
            const category = card.querySelector('.tag')?.textContent.toLowerCase() || '';
            const provider = card.querySelector('.provider-name')?.textContent.toLowerCase() || '';

            if (title.includes(query) || description.includes(query) ||
                category.includes(query) || provider.includes(query)) {
                card.style.display = '';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Show empty state if no matching cards
        if (!hasVisibleCards && cards.length > 0) {
            // Check if we already have a no-results message
            let noResults = this.servicesContainer.querySelector('.no-results');
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.style.gridColumn = '1 / -1';
                noResults.style.padding = '20px';
                noResults.style.backgroundColor = 'white';
                noResults.style.borderRadius = '8px';
                noResults.style.textAlign = 'center';
                noResults.style.marginTop = '20px';

                noResults.innerHTML = `
                    <p>No services match your search for "<strong>${query}</strong>"</p>
                    <button class="btn" style="margin-top:10px;">Clear Search</button>
                `;

                // Add clear button functionality
                noResults.querySelector('button').addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.filterShortlistedServices();
                });

                this.servicesContainer.appendChild(noResults);
            }
        } else {
            // Remove any existing no-results message
            const noResults = this.servicesContainer.querySelector('.no-results');
            if (noResults) {
                noResults.remove();
            }
        }
    }

    showEmptyState(message) {
        // Clear services container
        this.servicesContainer.innerHTML = '';
        this.servicesContainer.classList.remove('services-grid');

        // Show empty state
        this.emptyState.style.display = 'block';

        // Update message if provided
        if (message) {
            const messageElement = this.emptyState.querySelector('h3');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
    // Show toast notification
    showToast(message, type = 'info') {
        // Check if toast container exists, create if not
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '1000';
            document.body.appendChild(toastContainer);
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style toast based on type
        toast.style.padding = '10px 15px';
        toast.style.marginBottom = '10px';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' :
                                      type === 'error' ? '#F44336' :
                                      type === 'info' ? '#2196F3' :
                                      '#FFC107'; // warning
        toast.style.color = 'white';
        toast.style.transition = 'opacity 0.5s ease-in-out';
        toast.style.opacity = '0';

        // Add to container
        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500);
        }, 3000);
    }

    // Clear cache method in UI
    clearCache() {
        this.shortlistCache.clear();
        console.log('Shortlist cache cleared');
    }

    // Static initializer with explicit page load checks
    static {
        console.log('shortListUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;
            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new shortListUI instance');
                new shortListUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            initializeUI();
        }

        // Also initialize when cards are rendered
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring shortListUI is initialized');
            initializeUI();
        });
    }
}


// ===================== CONTROLLER LAYER =====================
// Each controller handles specific operations and business logic

// Controller for adding items to shortlist
class AddToShortlistController {
    constructor() {
        console.log('Initializing AddToShortlistController');
        this.entity = new ShortListEntity();
    }

    async addToShortlist(userId, listingId) {
        console.log('AddToShortlistController.addToShortlist called with:', userId, listingId);
        // Pass to entity, could add business logic here if needed
        return await this.entity.addToShortlist(userId, listingId);
    }
}

// Controller for removing items from shortlist
class RemoveFromShortlistController {
    constructor() {
        console.log('Initializing RemoveFromShortlistController');
        this.entity = new ShortListEntity();
    }

    async removeFromShortlist(userId, listingId) {
        console.log('RemoveFromShortlistController.removeFromShortlist called with:', userId, listingId);
        return await this.entity.removeFromShortlist(userId, listingId);
    }
}

// Controller for checking shortlist status
class CheckShortlistController {
    constructor() {
        console.log('Initializing CheckShortlistController');
        this.entity = new ShortListEntity();
    }

    async checkShortlistStatus(userId, listingId) {
        console.log('CheckShortlistController.checkShortlistStatus called with:', userId, listingId);
        return await this.entity.checkShortlistStatus(userId, listingId);
    }
}

// Controller for retrieving user's shortlist
class GetUserShortlistController {
    constructor() {
        console.log('Initializing GetUserShortlistController');
        this.entity = new ShortListEntity();
    }

    async getUserShortlist(userId) {
        console.log('GetUserShortlistController.getUserShortlist called for user:', userId);
        return await this.entity.getUserShortlist(userId);
    }
}


// ===================== ENTITY LAYER =====================
// Single entity class that handles all data operations
class ShortListEntity {
    constructor() {
        console.log('Initializing ShortListEntity');
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    async addToShortlist(userId, listingId) {
        try {
            console.log('Entity.addToShortlist called with:', userId, listingId);

            // Input validation
            if (!userId || !listingId) {
                console.error('Missing required data:', { userId, listingId });
                return { success: false, error: 'Missing required user ID or listing ID' };
            }

            // Prepare request body - send the ID exactly as received without parsing
            // This maintains the original format from the data source
            const requestBody = {
                user_id: userId,
                listing_id: listingId
            };

            console.log('Sending request with body:', JSON.stringify(requestBody));

            // Make API request
            const response = await fetch(`${this.apiBaseUrl}/shortlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            // Handle different response status codes
            if (!response.ok) {
                if (response.status === 409) {
                    return { success: false, error: 'This service is already in your shortlist' };
                } else if (response.status === 404) {
                    return { success: false, error: 'Service or user not found' };
                } else if (response.status >= 500) {
                    return { success: false, error: 'Server error. Please try again later.' };
                }
            }

            // Parse the response
            const responseText = await response.text();
            let result;

            try {
                // Only try to parse as JSON if the response has content
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                    console.log('Parsed response:', result);
                } else {
                    // Empty response with success status is considered successful
                    return response.ok
                        ? { success: true }
                        : { success: false, error: 'Unknown error occurred' };
                }
            } catch (parseError) {
                console.error('Error parsing response as JSON:', parseError);
                // If response.ok is true, consider it a success despite parsing issues
                return response.ok
                    ? { success: true }
                    : { success: false, error: 'Invalid response from server' };
            }

            // Return result based on response
            if (result && result.success) {
                console.log('Successfully added item to shortlist');
                return { success: true, isShortlisted: true }; // Added isShortlisted flag
            } else {
                const errorMessage = result?.message || result?.error || 'Failed to add to shortlist';
                console.error('Failed to add item to shortlist:', errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Error adding item to shortlist:', error);
            return { success: false, error: 'Network or server error. Please try again.' };
        }
    }

    // Remove a service from the shortlist
    async removeFromShortlist(userId, listingId) {
        try {
            console.log('Entity.removeFromShortlist called with:', userId, listingId);

            // Input validation
            if (!userId || !listingId) {
                console.error('Missing required data for shortlist removal:', { userId, listingId });
                return { success: false, error: 'Missing required user ID or listing ID' };
            }

            // Make API request to delete the shortlist entry
            const response = await fetch(`${this.apiBaseUrl}/shortlist`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    listing_id: listingId
                })
            });

            console.log('Remove shortlist response status:', response.status);

            // Handle different response status codes
            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'Item not found in your shortlist' };
                } else if (response.status >= 500) {
                    return { success: false, error: 'Server error. Please try again later.' };
                } else {
                    return { success: false, error: `Error: ${response.status}` };
                }
            }

            // Parse the response if there is one
            const responseText = await response.text();
            let result;

            try {
                // Only try to parse as JSON if the response has content
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                    console.log('Parsed remove response:', result);
                } else {
                    // Empty response with success status is considered successful
                    return response.ok
                        ? { success: true }
                        : { success: false, error: 'Unknown error occurred' };
                }
            } catch (parseError) {
                console.error('Error parsing remove response as JSON:', parseError);
                // If response.ok is true, consider it a success despite parsing issues
                return response.ok
                    ? { success: true }
                    : { success: false, error: 'Invalid response from server' };
            }

            // Return result based on response
            if (result && result.success) {
                console.log('Successfully removed item from shortlist');
                return { success: true };
            } else {
                const errorMessage = result?.message || result?.error || 'Failed to remove from shortlist';
                console.error('Failed to remove item from shortlist:', errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('Error removing item from shortlist:', error);
            return { success: false, error: 'Network or server error. Please try again.' };
        }
    }

    // Check if a listing is already shortlisted with improved error handling
    async checkShortlistStatus(userId, listingId) {
        try {
            console.log('Entity.checkShortlistStatus called with:', userId, listingId);

            // Input validation
            if (!userId || !listingId) {
                console.error('Missing required data for shortlist check:', { userId, listingId });
                return { success: false, isShortlisted: false };
            }

            // Make API request to check shortlist status
            const response = await fetch(`${this.apiBaseUrl}/shortlist/check?user_id=${encodeURIComponent(userId)}&listing_id=${encodeURIComponent(listingId)}`);

            console.log('Check shortlist status response:', response.status);

            if (!response.ok) {
                console.error('Error checking shortlist status, status:', response.status);
                return { success: false, isShortlisted: false };
            }

            const result = await response.json();
            console.log('Shortlist check result:', result);

            return {
                success: true,
                isShortlisted: result.isShortlisted || false
            };
        } catch (error) {
            console.error('Error checking shortlist status:', error);
            return { success: false, isShortlisted: false };
        }
    }

    // Get all shortlisted listings for a user
    async getUserShortlist(userId) {
        try {
            console.log('Entity.getUserShortlist called for user:', userId);

            if (!userId) {
                return { success: false, error: 'Missing user ID' };
            }

            const response = await fetch(`${this.apiBaseUrl}/shortlist/${encodeURIComponent(userId)}`);

            if (!response.ok) {
                return { success: false, error: `Error fetching shortlist: ${response.status}` };
            }

            const result = await response.json();

            return {
                success: true,
                data: result.data || []
            };
        } catch (error) {
            console.error('Error fetching user shortlist:', error);
            return { success: false, error: 'Network or server error' };
        }
    }
}