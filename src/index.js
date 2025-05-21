// ==================== BOUNDARY LAYER ====================
/**
 * LoginUI - Boundary class responsible for UI interactions
 * Handles all DOM interactions and UI updates for login functionality
 */
class LoginUI {
    //Initializes the LoginUI instance, creates controller instances, and sets up event listeners.
    constructor() {
        // Initialize instance variables
        console.log('LoginUI constructor called');

        // Initialize controllers
        this.loginController = new ProcessLoginController(this);
        this.logoutController = new ProcessLogoutController();

        // Set up event listeners
        this.setupEventListeners();
    }

    //Sets up event listeners for the login form and logout button.
    setupEventListeners() {
        console.log('Setting up event listeners');

        // Immediately check if the form exists
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('Login form found, attaching submit handler');
            loginForm.addEventListener('submit', this.handleLoginSubmit.bind(this));
        } else {
            console.warn('Login form not found during initial setup');
        }

        // Also check when DOM is fully loaded (belt and suspenders approach)
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM fully loaded, rechecking for form');
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                console.log('Login form found after DOM load');
                // Remove any existing listeners to avoid duplicates
                loginForm.removeEventListener('submit', this.handleLoginSubmit.bind(this));
                // Add the listener again
                loginForm.addEventListener('submit', this.handleLoginSubmit.bind(this));
            } else {
                console.error('Login form not found even after DOM loaded');
            }

            // // Add logout button event listener if it exists
            // const logoutButton = document.getElementById('logoutButton');
            // if (logoutButton) {
            //     logoutButton.addEventListener('click', this.handleLogout.bind(this));
            // }
        });
    }

    //Handles the login form submission, gets user credentials, and calls the login controller.
    async handleLoginSubmit(event) {
        console.log('Login form submitted');
        event.preventDefault(); // Prevent form submission

        // Get input and pass to controller
        const credentials = this.getUserInput();
        console.log('Credentials obtained:', { username: credentials.username });

        // Call the login controller
        try {
            // Changed to use createUserData and authenticate directly
            const userData = this.loginController.createUserData(credentials.username, credentials.password);
            await this.loginController.authenticate(userData);
        } catch (error) {
            console.error('Error during login processing:', error);
            this.displayErrorMsg();
        }

        return false; // Prevent form submission
    }

    // async handleLogout(event) {
    //     if (event) event.preventDefault();
    //     console.log('Logout initiated');
    //
    //     // Call the logout controller
    //     try {
    //         await this.logoutController.processLogout();
    //     } catch (error) {
    //         console.error('Error during logout:', error);
    //         alert('Logout failed. Please try again.');
    //     }
    // }

    //Retrieves the username and password values from form input fields.
    getUserInput() {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        console.log(`User input retrieved: ${username}`);
        return { username, password };
    }

    displaySuccessMsg() {
        console.log('Displaying success message');
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = "Log-In Successful";
            messageElement.style.color = "green";
        } else {
            console.error('Message element not found');
        }
    }

    displayErrorMsg() {
        console.log('Displaying error message');
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = "Log-In Unsuccessful";
            messageElement.style.color = "red";
        } else {
            console.error('Message element not found');
        }
    }

    //Redirects the user to appropriate homepage based on their role.
    navigateToHomePage(role) {
        let targetPage;
        const processedRole = (role || '').toString().trim().toLowerCase();
        console.log(`Navigating to homepage for role: ${processedRole}`);

        switch (processedRole) {
            case 'home_owner':
                targetPage = "../src/homePage.html";
                break;
            case 'home_cleaner':
                targetPage = "../src/homePage.html";
                break;
            case 'user_admin':
                targetPage = "../src/user_admin/navigation.html";
                break;
            case 'platform_manager':
                targetPage = "../src/platform_management/homePage_PM.html";
                break;
            default:
                console.log("Role not recognized, using default page. Received:", role);
                targetPage = "../src/homePage.html";
        }
        console.log("Redirecting to:", targetPage);
        window.location.href = targetPage;
    }

    // Processes authentication results, storing user data in localStorage and redirecting if successful.
    handleLoginResult(authResult) {
        if (authResult.authenticated) {
            // Store user role for reference
            localStorage.setItem('userRole', authResult.userRole);
            localStorage.setItem('currentUserId', authResult.userId);
            localStorage.setItem('currentUsername', authResult.userName || authResult.userId);

            this.displaySuccessMsg();

            // Use navigateToHomePage method to direct users to appropriate pages based on role
            setTimeout(() => {
                this.navigateToHomePage(authResult.userRole);
            }, 1000);
        } else {
            this.displayErrorMsg();
        }
    }


    //Ensures the LoginUI is properly initialized when the page loads.
    static {
        console.log('LoginUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;

            // Check if we're on a page with login form
            const loginForm = document.getElementById('loginForm');
            if (!loginForm) {
                console.log('No login form found on this page, skipping LoginUI initialization');
                return;
            }

            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new LoginUI instance');
                window.loginUI = new LoginUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            initializeUI();
        }

        // Also initialize when window fully loads
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring LoginUI is initialized');
            initializeUI();
        });
    }
}

/**
 * LogoutUI - Dedicated boundary class for logout functionality
 * Can be used in any page including homePage.html
 */
class LogoutUI {
    constructor() {
        console.log('LogoutUI constructor called');

        // Initialize the controller
        this.logoutController = new ProcessLogoutController();

        // Set up event listeners
        this.setupEventListeners();
    }

    //Sets up event listeners for the logout button.
    setupEventListeners() {
        console.log('Setting up logout UI event listeners');

        // Add event listener to the logout button in homePage.html (and potentially other pages)
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            console.log('Found logout-btn, attaching event handler');
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        } else {
            console.log('logout-btn not found on this page');
        }
    }


    //Handles logout button clicks by calling the logout controller.
    async handleLogout(event) {
        if (event) event.preventDefault();
        console.log('LogoutUI: Logout initiated');

        try {
            // Call the controller for logout
            await this.logoutController.processLogout();
        } catch (error) {
            console.error('LogoutUI: Error during logout:', error);
            alert('Logout failed. Please try again.');

            // Fallback: manually clear storage and redirect
            this.clearLocalStorage();
            this.redirectToLoginPage();
        }
    }

    //Removes user-related data from localStorage.
    clearLocalStorage() {
        console.log('LogoutUI: Clearing local storage');
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('shortlist');
    }

    //Redirects the user to the login page.
    redirectToLoginPage() {
        console.log('LogoutUI: Redirecting to login page');
        window.location.href = '/CSCI314/public/index.html';
    }

    // Ensures the LogoutUI is properly initialized when the page loads.
    static {
        console.log('LogoutUI static initializer running');
        let isInitialized = false;

        const initializeUI = () => {
            if (isInitialized) return;
            isInitialized = true;

            // Wrapped in setTimeout to ensure DOM is completely ready
            setTimeout(() => {
                console.log('Creating new LogoutUI instance');
                window.logoutUI = new LogoutUI();
            }, 0);
        };

        // Handle various page load scenarios
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            initializeUI();
        }

        // Also initialize when window fully loads
        window.addEventListener('load', () => {
            console.log('Window load event, ensuring LogoutUI is initialized');
            initializeUI();
        });
    }
}

// ==================== CONTROLLER LAYER ====================
/**
 * ProcessLoginController - Controller for processing login
 */
class ProcessLoginController {
    constructor(loginUI) {
        this.entity = new UserAuthEntity();
        // Store reference to login UI
        this.loginUI = loginUI;
        console.log('ProcessLoginController initialized');
    }

    //Creates a user data object with username and password.
    createUserData(username, password) {
        console.log('Creating user data object');
        return {
            username: username,
            password: password
        };
    }

    //Sends authentication request to the entity layer and handles the result.
    async authenticate(userData) {
        console.log('Processing login attempt for:', userData.username);

        try {
            // Call entity to authenticate
            const authResult = await this.entity.authenticate(userData);
            console.log('Authentication result:', authResult);

            // Handle result using the boundary layer method
            this.loginUI.handleLoginResult(authResult);
        } catch (error) {
            console.error('Login process error:', error);
            if (this.loginUI) {
                this.loginUI.displayErrorMsg();
            } else {
                // Fallback error display if loginUI reference is missing
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = "Login Error: " + error.message;
                    messageElement.style.color = "red";
                }
            }
        }
    }
}

/**
 * ProcessLogoutController - Controller for processing logout
 */
class ProcessLogoutController {
    constructor() {
        this.entity = new UserAuthEntity();
    }

    //Sends authentication request to the entity layer and handles the result.
    async processLogout() {
        try {
            // Call entity to logout
            const result = await this.entity.processLogout();
            console.log('Logout result:', result);

            if (result.success) {
                // Clear local storage
                localStorage.removeItem('userRole');
                localStorage.removeItem('currentUserId');
                localStorage.removeItem('currentUsername');
                localStorage.removeItem('shortlist');

                // Navigate to login page
                window.location.href = '/CSCI314/public/index.html';

                return result;
            } else {
                console.error('Server logout failed:', result.message || 'Unknown error');
                throw new Error(result.message || 'Logout failed');
            }
        } catch (error) {
            console.error('Logout process error:', error);
            throw error;
        }
    }
}

// ==================== ENTITY LAYER ====================
/**
 * UserAuthEntity - Entity class for authentication data access
 * Handles API calls and data storage related to user authentication
 */
class UserAuthEntity {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        console.log('UserAuthEntity initialized with base URL:', this.apiBaseUrl);
    }


    /**
     * Authenticate user with server
     */
    async authenticate(userData) {
        console.log('Authenticating user:', userData.username);
        try {
            const response = await fetch(`${this.apiBaseUrl}/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: userData.username,
                    password: userData.password
                })
            });

            const data = await response.json();
            console.log('Authentication API response:', data);

            // Handle the case where another user is logged in
            if (response.status === 403) {
                return {
                    authenticated: false,
                    userRole: null,
                    error: data.message,
                    activeUser: data.activeUser
                };
            }

            // Check if user is suspended
            if (data.isSuspended) {
                console.log('User account is suspended');
                return {
                    authenticated: false,
                    userRole: null,
                    error: 'Your account has been suspended. Please contact an administrator.',
                    isSuspended: true
                };
            }

            // If authentication is successful, store user info
            if (data.authenticated) {
                console.log('Authentication response data:', data);
                localStorage.setItem('currentUserId', data.userId);
                localStorage.setItem('currentUsername', data.userName);
                localStorage.setItem('userRole', data.userRole);
            }

            return {
                authenticated: data.authenticated,
                userRole: data.userRole || null,
                userId: data.userId,
                userName: data.userName,
                error: data.authenticated ? null : 'Invalid username or password'
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return {
                authenticated: false,
                userRole: null,
                error: 'Network or server error occurred'
            };
        }
    }

    /**
     * Log user out (clear session/local storage)
     */
    async processLogout() {
        try {
            const userId = localStorage.getItem('currentUserId');

            if (!userId) {
                console.warn('No user ID found in local storage for logout');
                this.clearLocalStorage();
                return { success: true };
            }

            // Call the logout endpoint
            const response = await fetch(`${this.apiBaseUrl}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            const data = await response.json();

            // Clear local storage regardless of server response
            this.clearLocalStorage();

            return {
                success: data.success,
                message: data.message
            };
        } catch (error) {
            console.error('Logout error:', error);

            // Clear local storage even if there's an error
            this.clearLocalStorage();

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clear all authentication data from local storage
     */
    clearLocalStorage() {
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUsername');
    }

    // /**
    //  * Check if there's an active session
    //  */
    // async checkActiveSession() {
    //     try {
    //         const response = await fetch(`${this.apiBaseUrl}/active-session`);
    //         return await response.json();
    //     } catch (error) {
    //         console.error('Active session check error:', error);
    //         return { success: false, active: false, error: error.message };
    //     }
    // }
}

// // Create LoginUI instance
// console.log('Creating LoginUI instance');
// window.loginUI = new LoginUI();
//
// // Additional initialization to ensure the LoginUI is created after document load
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOM fully loaded, ensuring LoginUI instance exists');
//     if (!window.loginUI) {
//         console.log('Creating LoginUI instance after DOM load');
//         window.loginUI = new LoginUI();
//     } else {
//         console.log('LoginUI instance already exists');
//     }
// });