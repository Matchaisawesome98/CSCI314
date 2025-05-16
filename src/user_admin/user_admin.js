// Base URL for API calls
const API_BASE_URL = 'http://localhost:3000';

// ENTITY CLASSES
// Main Entity Class - Handles data models and API interactions
class UserAdminEntity {
    constructor() {
        // Default structure for User entity
        this.userTemplate = {
            user_id: null,
            email: '',
            first_name: '',
            last_name: '',
            roles: 'user_admin',
            password: '',
            isSuspended: false
        };
        this.API_BASE_URL = API_BASE_URL;
    }
    
    // Create a new user object
    createUser(userData) {
        return {
            ...this.userTemplate,
            email: userData.email || '',
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            roles: userData.roles || 'user_admin',
            password: userData.password || ''
        };
    }
    
    // API call to check server status
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/test`);
            if (response.ok) {
                return { isOnline: true };
            } else {
                return { isOnline: false, message: 'Server error' };
            }
        } catch (error) {
            console.error('Server connection error:', error);
            return { isOnline: false, message: 'Server offline' };
        }
    }
    
    // API call to add new user
    async addUser(user) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });
            
            return await response.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    // API call to fetch all users
    async fetchAllUsers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/get-homeowners`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching users:', error);
            return { 
                success: false, 
                message: `Error fetching users: ${error.message}`
            };
        }
    }
    
    // API call to fetch a specific user by ID
    async fetchUserById(userId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/get-user/${userId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                success: false, 
                message: `Error fetching user: ${error.message}`
            };
        }
    }
    
    // API call to update a user
    async updateUser(userId, userData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/update-user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                success: false,
                message: `Error updating user: ${error.message}`
            };
        }
    }
}

// CONTROLLER CLASSES
// Main Controller Class - Acts as a medium to deliver information
class UserAdminController {
    constructor(entity) {
        this.entity = entity || new UserAdminEntity();
    }
    
    // Process adding a new user - no validation, just pass to entity
    async processAddUser(userData) {
        // Create user object with entity
        const user = this.entity.createUser(userData);
        
        // Send to API via entity
        return await this.entity.addUser(user);
    }
    
    // Get server status via entity
    async getServerStatus() {
        return await this.entity.checkServerStatus();
    }
    
    // Get all users via entity
    async getAllUsers() {
        return await this.entity.fetchAllUsers();
    }
    
    // Get a specific user by ID
    async getUserById(userId) {
        return await this.entity.fetchUserById(userId);
    }
    
    // Update a user
    async updateUser(userId, userData) {
        return await this.entity.updateUser(userId, userData);
    }
}

// UI/BOUNDARY CLASSES
// Creation Boundary Class - Handles UI interaction for user creation
class Creating_users_as_userAdmin_Boundary {
    constructor(controller) {
        this.controller = controller || new UserAdminController();
        
        // DOM Elements
        this.addUserForm = document.getElementById('addUserForm');
        this.messageDiv = document.getElementById('message');
        this.refreshButton = document.getElementById('refreshUsers');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.serverStatusSpan = document.getElementById('serverStatus');
        
        // Bind methods to this instance
        this.handleAddUser = this.handleAddUser.bind(this);
        this.refreshUsers = this.refreshUsers.bind(this);
        this.updateServerStatus = this.updateServerStatus.bind(this);
        
        // Add event listeners if elements exist
        if (this.addUserForm) {
            this.addUserForm.addEventListener('submit', this.handleAddUser);
        }
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', this.refreshUsers);
        }
        
        // Initialize UI
        this.initializeUI();
    }
    
    // Initialize UI components
    initializeUI() {
        this.updateServerStatus();
        this.refreshUsers();
        
        // Set up periodic status checks
        setInterval(this.updateServerStatus, 60000); // Check server status every minute
    }
    
    // Update server status in UI
    async updateServerStatus() {
        if (!this.serverStatusSpan) return;
        
        try {
            const status = await this.controller.getServerStatus();
            
            if (status.isOnline) {
                this.serverStatusSpan.innerHTML = '<span class="status-indicator status-online"></span>Online';
            } else {
                this.serverStatusSpan.innerHTML = `<span class="status-indicator status-offline"></span>${status.message || 'Offline'}`;
            }
        } catch (error) {
            this.serverStatusSpan.innerHTML = '<span class="status-indicator status-offline"></span>Error checking status';
            console.error('Error updating server status:', error);
        }
    }
    
    // Validate user data - moved from controller to boundary
    validateUser(userData) {
        if (!userData.email || !userData.email.includes('@')) {
            return { isValid: false, message: 'Valid email is required' };
        }
        
        if (!userData.first_name) {
            return { isValid: false, message: 'First name is required' };
        }
        
        if (!userData.last_name) {
            return { isValid: false, message: 'Last name is required' };
        }
        
        if (!userData.password) {
            return { isValid: false, message: 'Password is required' };
        }
        
        if (userData.password.length < 6) {
            return { isValid: false, message: 'Password must be at least 6 characters' };
        }
        
        return { isValid: true };
    }
    
    // Handle form submission for adding users (UI event)
    async handleAddUser(event) {
        event.preventDefault();
        
        const result = confirm("Create a new admin user?");
        if (result === false) {
            return;
        }
        
        // Collect form data
        const formData = {
            email: document.getElementById('email').value,
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            roles: document.getElementById('roles').value,
            password: document.getElementById('password').value
        };
        
        // Validate data - now done in boundary
        const validation = this.validateUser(formData);
        if (!validation.isValid) {
            this.showMessage(`Error: ${validation.message}`, 'error');
            return;
        }
        
        try {
            // Send to controller for processing
            const response = await this.controller.processAddUser(formData);
            
            // Handle UI updates based on response
            if (response.success) {
                this.showMessage(`Admin user added successfully with ID: ${response.user_id}`, 'success');
                this.addUserForm.reset();
                this.refreshUsers(); // Refresh user list
            } else {
                this.showMessage(`Error: ${response.message}`, 'error');
            }
        } catch (error) {
            this.showMessage(`System Error: ${error.message || 'Unknown error occurred'}`, 'error');
            console.error('Error processing add user:', error);
        }
    }
    
    // Refresh users list in UI
    async refreshUsers() {
        if (!this.usersTableBody) return;
        
        try {
            // Show loading state
            this.usersTableBody.innerHTML = '<tr><td colspan="6">Loading users...</td></tr>';
            
            // Get users from controller
            const result = await this.controller.getAllUsers();
            
            // Update UI based on result
            if (result.success) {
                this.renderUserTable(result.data);
            } else {
                this.showMessage(`Error: ${result.message}`, 'error');
                this.usersTableBody.innerHTML = '<tr><td colspan="6">Failed to load users</td></tr>';
            }
        } catch (error) {
            this.showMessage('Error connecting to server', 'error');
            this.usersTableBody.innerHTML = '<tr><td colspan="6">Connection error</td></tr>';
            console.error('Error refreshing users:', error);
        }
    }
    
    // Render users table (UI only)
    renderUserTable(users) {
        if (!this.usersTableBody) return;
        
        try {
            this.usersTableBody.innerHTML = '';
            
            if (!users || users.length === 0) {
                this.usersTableBody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
                return;
            }
            
            users.forEach(user => {
                const row = document.createElement('tr');
                const isSuspended = user.isSuspended || false;
                const statusClass = isSuspended ? 'suspended' : 'active';
                const statusText = isSuspended ? 'Suspended' : 'Active';
                
                row.innerHTML = `
                    <td>${user.user_id || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.first_name || 'N/A'}</td>
                    <td>${user.last_name || 'N/A'}</td>
                    <td>${user.roles || 'home_owner'}</td>
                    <td><span class="suspension-status ${statusClass}">${statusText}</span></td>
                `;
                
                this.usersTableBody.appendChild(row);
            });
        } catch (error) {
            this.usersTableBody.innerHTML = '<tr><td colspan="6">Error rendering user data</td></tr>';
            console.error('Error rendering user table:', error);
        }
    }
    
    // Show message in UI
    showMessage(message, type) {
        if (!this.messageDiv) return;
        
        this.messageDiv.textContent = message;
        this.messageDiv.className = `message ${type}`;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            this.messageDiv.textContent = '';
            this.messageDiv.className = 'message';
        }, 5000);
    }
}

// View UI class - For displaying and managing the user list
class View_all_users_as_UserAdmin_boundary {
    constructor() {
        this.controller = new UserAdminController();
        this.statusDiv = document.getElementById('status');
        this.tableContainer = document.getElementById('tableContainer');
    }
    
    showLoading() {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status';
       
    }
    
    showError(message) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status error';
        this.statusDiv.innerHTML = `Error: ${message}`;
    }
    
    showSuccess(count) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status success';
        this.statusDiv.innerHTML = `Found ${count} records`;
    }
    
    showUpdateSuccess(userName) {
        if (!this.statusDiv) return;
        
        // Ensure status div is visible
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status success';
        this.statusDiv.innerHTML = `<strong>Success!</strong> User "${userName}" was updated successfully.`;
        
        // Scroll to the status message to ensure it's visible
        this.statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide the message after 5 seconds
        setTimeout(() => {
            this.statusDiv.style.display = 'none';
        }, 5000);
    }
    
    showUpdateError(message) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status error';
        this.statusDiv.innerHTML = `Error updating user: ${message}`;
    }
    
    renderTable(data) {
        if (!this.tableContainer) return;
        
        if (!data || data.length === 0) {
            this.tableContainer.innerHTML = '<p>No records found in the table.</p>';
            return;
        }
        
        // Create table
        let tableHTML = '<table id="usersTable"><thead><tr>';
        
        // Get column names from the first record
        const columns = Object.keys(data[0]);
        
        // Add table headers
        columns.forEach(column => {
            tableHTML += `<th>${column}</th>`;
        });
        
        // Add actions column
        tableHTML += '<th>Actions</th>';
        
        tableHTML += '</tr></thead><tbody>';
        
        // Add table rows
        data.forEach(row => {
            const rowId = row.id || row.user_id;
            tableHTML += `<tr id="user-row-${rowId}">`;
            columns.forEach(column => {
                // Special handling for password column - blur it
                if (column === 'password') {
                    tableHTML += `<td><span class="blur-text">${row[column] || ''}</span></td>`;
                }
                // Special handling for the isSuspended column to show true/false explicitly
                else if (column === 'isSuspended') {
                    tableHTML += `<td>${row[column] ? 'true' : 'false'}</td>`;
                }
                else {
                    tableHTML += `<td>${row[column] || ''}</td>`;
                }
            });
            
            // Add edit button
            tableHTML += `<td><button class="edit-btn" onclick="openEditModal(${JSON.stringify(row).replace(/"/g, '&quot;')})">Edit</button></td>`;
            
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody></table>';
        this.tableContainer.innerHTML = tableHTML;
    }
    
    async updateTableRow(userId, userData) {
        // Fetch the complete user data from the API
        const result = await this.controller.getUserById(userId);
        
        if (!result.success) {
            console.error(`Error fetching updated user data: ${result.message}`);
            // If we can't get the latest data, refresh the entire table
            this.displayAllUsers(true);
            return;
        }
        
        const updatedUser = result.data;
        const tableRow = document.getElementById(`user-row-${userId}`);
        
        if (!tableRow) {
            console.error(`Row with ID user-row-${userId} not found`);
            // Fallback to full table refresh
            this.displayAllUsers(true);
            return;
        }
        
        // Get all column names from the first row
        const table = document.getElementById('usersTable');
        if (!table) return;
        
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        
        const columns = Array.from(headerRow.cells)
            .map(cell => cell.textContent)
            .filter(col => col !== 'Actions');
        
        // Update each cell in the row
        let cellIndex = 0;
        columns.forEach(column => {
            if (updatedUser.hasOwnProperty(column)) {
                const cell = tableRow.cells[cellIndex];
                
                // Special handling for password column - blur it
                if (column === 'password') {
                    cell.innerHTML = `<span class="blur-text">${updatedUser[column] || ''}</span>`;
                }
                // Special handling for the isSuspended column to show true/false explicitly
                else if (column === 'isSuspended') {
                    cell.textContent = updatedUser[column] ? 'true' : 'false';
                }
                else {
                    cell.textContent = updatedUser[column] || '';
                }
            }
            cellIndex++;
        });
        
        // Apply highlighting animation to the updated row
        tableRow.classList.remove('highlight');
        // Force a reflow
        void tableRow.offsetWidth;
        tableRow.classList.add('highlight');
    }
    
    async displayAllUsers(skipSuccessMessage = false) {
        this.showLoading();
        
        try {
            const result = await this.controller.getAllUsers();
            
            if (result.success) {
                // Render the table directly with the API data
                this.renderTable(result.data);
                
                // Only show the "Found X records" message if not skipping it
                if (!skipSuccessMessage) {
                    this.showSuccess(result.data.length);
                }
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError(`Failed to connect to server: ${error.message}`);
        }
    }
}

// Search UI class - Extends ViewUI to reuse the rendering logic
class Search_for_user_as_UserAdmin_boundary extends View_all_users_as_UserAdmin_boundary {
    constructor() {
        super();
        this.searchInput = document.getElementById('searchInput');
    }
    
    showSearchLoading() {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status';
        this.statusDiv.innerHTML = 'Searching...';
    }
    
    showSearchSuccess(count, searchTerm) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status success';
        this.statusDiv.innerHTML = `Found ${count} matching users for "${searchTerm}"`;
    }
    
    async performSearch() {
        if (!this.searchInput) return;
        
        try {
            let searchTerm = this.searchInput.value;
            this.showSearchLoading();
            
            try {
                // Get all users from the controller
                const result = await this.controller.getAllUsers();
                
                // Check for success
                if (!result.success) {
                    this.showError(result.message || 'Unknown error occurred');
                    return;
                }
                
                // Ensure data is an array to prevent undefined errors
                const userData = Array.isArray(result.data) ? result.data : [];
                
                // Filter users here if search term is not empty
                let filteredData = userData;
                
                if (searchTerm && searchTerm.trim() !== '') {
                    searchTerm = searchTerm.trim();
                    // Filtering logic
                    filteredData = userData.filter(user => {
                        return Object.values(user).some(value => 
                            value !== null && 
                            value !== undefined && 
                            String(value).toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    });
                }
                
                this.showSearchSuccess(filteredData.length, searchTerm.trim() || "all users");
                this.renderTable(filteredData);
            } catch (error) {
                this.showError(`Error processing search: ${error.message}`);
            }
        } catch (error) {
            // Handle UI-specific errors
            console.error('UI Error in performSearch:', error);
            this.showError(`UI error: ${error.message}`);
        }
    }
}

// Edit Boundary class - Handles UI, presentation, validation, and error handling for editing users
class Edit_users_as_UserAdmin_Boundary {
    constructor() {
        this.controller = new UserAdminController();
        this.statusDiv = document.getElementById('status');
        this.editModal = document.getElementById('editModal');
        this.editUserForm = document.getElementById('editUserForm');
        this.userIdField = document.getElementById('userId');
        this.userNameField = document.getElementById('userName');
        this.formFields = document.getElementById('formFields');
        this.View_all_users_as_UserAdmin_boundary = new View_all_users_as_UserAdmin_boundary(); // Reference to ViewUI for table updates
        
        // If the elements exist, set up event listeners
        if (this.editUserForm) {
            // Remove any existing event listeners (to avoid duplicates)
            this.editUserForm.removeEventListener('submit', this.handleFormSubmit);
            // Add event listener for form submission
            this.editUserForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }
    }
    
    validateUserData(userData) {
        // Basic validation example - extend as needed
        if (userData.email && !this.isValidEmail(userData.email)) {
            return {
                success: false,
                message: "Please enter a valid email address"
            };
        }
        
        return {
            success: true
        };
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showSuccess(message) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status success';
        this.statusDiv.innerHTML = message;
        
        // Scroll to the status message to ensure it's visible
        this.statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide the message after 5 seconds
        setTimeout(() => {
            this.statusDiv.style.display = 'none';
        }, 5000);
    }

    showError(message) {
        if (!this.statusDiv) return;
        
        this.statusDiv.style.display = 'block';
        this.statusDiv.className = 'status error';
        this.statusDiv.innerHTML = `Error: ${message}`;
    }
    
    async openEditModal(userData) {
        if (!this.editModal || !this.userIdField || !this.userNameField || !this.formFields) return;
        
        try {
            // Store the user ID
            this.userIdField.value = userData.id || userData.user_id;
            
            // Store the user name (or email or username, whatever is available)
            const userName = userData.name || userData.username || userData.email || `User #${this.userIdField.value}`;
            this.userNameField.value = userName;
            
            // Clear previous form fields
            this.formFields.innerHTML = '';
            
            // Create form fields for each property
            Object.keys(userData).forEach(key => {
                // Skip primary key as it shouldn't be edited
                if (key === 'id' || key === 'user_id') return;
                
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.htmlFor = key;
                label.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                
                let input;
                
                // Special handling for boolean values
                if (key === 'isSuspended' || (typeof userData[key] === 'boolean')) {
                    input = document.createElement('select');
                    input.innerHTML = `
                        <option value="true" ${userData[key] ? 'selected' : ''}>true</option>
                        <option value="false" ${!userData[key] ? 'selected' : ''}>false</option>
                    `;
                } else {
                    input = document.createElement('input');
                    input.type = key === 'password' ? 'password' : 'text';
                    input.value = userData[key] || '';
                }
                
                input.id = key;
                input.name = key;
                
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                this.formFields.appendChild(formGroup);
            });
            
            // Show the modal
            this.editModal.style.display = 'block';
        } catch (error) {
            this.showError(`Error opening edit modal: ${error.message}`);
        }
    }
    
    closeEditModal() {
        if (!this.editModal) return;
        this.editModal.style.display = 'none';
    }
    
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (!this.userIdField || !this.userNameField || !this.editUserForm) return;
        
        try {
            // Get the user ID and name
            const userId = this.userIdField.value;
            const userName = this.userNameField.value;
            
            // Collect form data
            const formData = {};
            const formElements = this.editUserForm.elements;
            
            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];
                
                // Skip buttons and hidden fields
                if (element.type === 'button' || element.type === 'submit' || 
                    element.id === 'userId' || element.id === 'userName') {
                    continue;
                }
                
                formData[element.name] = element.value;
            }
            
            // Process boolean values (convert string representation to actual boolean)
            Object.keys(formData).forEach(key => {
                if (formData[key] === 'true' || formData[key] === 'false') {
                    formData[key] = formData[key] === 'true';
                }
            });
            
            // Validate user data before updating
            const validation = this.validateUserData(formData);
            if (!validation.success) {
                this.showError(validation.message);
                return;
            }
            
            // Call the controller to update the user
            const result = await this.controller.updateUser(userId, formData);
            
            // Close the modal first
            this.closeEditModal();
            
            if (result.success) {
                // Display the success message
                this.showSuccess(`<strong>Update Successful</strong> - User "${userName}" was updated.`);
                
                // Update the table row with the new data
                this.View_all_users_as_UserAdmin_boundary.updateTableRow(userId, formData);
            } else {
                this.showError(result.message || "Unknown error occurred");
            }
        } catch (error) {
            this.closeEditModal();
            this.showError(`Error updating user: ${error.message}`);
        }
    }
}

// UTILITY FUNCTIONS
// View users initialization function
function initViewUsers() {
    // Hide the View All button
    const viewAllButton = document.getElementById('viewAllButton');
    if (viewAllButton) {
        viewAllButton.style.display = 'none';
    }
    
    // Show the search container
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        searchContainer.style.display = 'block';
    }
    
    // Initialize the view UI if not already done
    if (!window.viewUI) {
        window.viewUI = new View_all_users_as_UserAdmin_boundary();
    }
    
    // Display all users
    window.viewUI.displayAllUsers();
}

// Search function
function performSearch() {
    // Initialize the search UI if not already done
    if (!window.searchUI) {
        window.searchUI = new Search_for_user_as_UserAdmin_boundary();
    }
    
    // Perform search
    window.searchUI.performSearch();
}

// Handle keyboard events for search input
function handleSearchKeyPress(event) {
    // Check if Enter key was pressed
    if (event.key === 'Enter') {
        event.preventDefault();
        performSearch();
    }
}

// Edit modal functions - updated to use the EditBoundary class
function openEditModal(userData) {
    if (!window.editBoundary) {
        window.editBoundary = new Edit_users_as_UserAdmin_Boundary();
    }
    window.editBoundary.openEditModal(userData);
}

function closeEditModal() {
    if (window.editBoundary) {
        window.editBoundary.closeEditModal();
    } else {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main entity and controller
    const entity = new UserAdminEntity();
    const controller = new UserAdminController(entity);
    
    // Initialize the creation boundary if on creation page
    if (document.getElementById('addUserForm')) {
        window.creationBoundary = new Creating_users_as_userAdmin_Boundary(controller);
    }
    
    // Initialize view UI
    window.viewUI = new View_all_users_as_UserAdmin_boundary();
    
    // Initialize search UI
    window.searchUI = new Search_for_user_as_UserAdmin_boundary();
    
    // Initialize edit boundary
    window.editBoundary = new Edit_users_as_UserAdmin_Boundary();
    
    // Hide modal on page load
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
});