const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const mysql2Promise = require('mysql2/promise');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'password', //please change if needed
    database: 'users'
};

// MySQL connection pool for authentication
const pool = mysql.createPool({
    connectionLimit: 10,
    ...dbConfig
});

// Authentication endpoint
app.post('/api/authenticate', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // MODIFIED: Instead of checking if ANY user is logged in,
        // we only check if THIS specific user is already logged in elsewhere
        const [activeUserCheck] = await connection.execute(
            'SELECT user_id FROM user_accounts WHERE user_id = ? AND login_status = TRUE',
            [username]
        );

        // If this user is already logged in somewhere else
        if (activeUserCheck.length > 0) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'You are already logged in on another device or browser. Please log out first.',
                activeUser: username
            });
        }

        // Check if user exists and password matches
        const [results] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ? AND password = ?',
            [username, password]
        );

        if (results.length === 0) {
            await connection.end();
            return res.json({
                success: true,
                authenticated: false,
                message: 'Invalid username or password'
            });
        }

        // User authenticated successfully, update login status
        await connection.execute(
            'UPDATE user_accounts SET login_status = TRUE, last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [username]
        );

        const userRole = results[0].roles || 'home_owner';
        const firstName = results[0].first_name;
        const lastName = results[0].last_name;

        // Get the user's full name
        const fullName = `${firstName} ${lastName}`;

        await connection.end();

        res.json({
            success: true,
            authenticated: true,
            userRole: userRole,
            userId: username,
            userName: fullName
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during authentication'
        });
    }
});

// Get all homeowners endpoint
app.get('/get-homeowners', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM user_accounts');
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data',
            error: error.message
        });
    }
});


// Add this code to your existing server.js file

// Add new user endpoint
app.post('/api/users', async (req, res) => {
    const { email, first_name, last_name, roles } = req.body;

    // Basic validation
    if (!email || !first_name || !last_name) {
        return res.status(400).json({
            success: false,
            message: 'Email, first name, and last name are required'
        });
    }

    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Generate a user_id (you might want a better ID system in production)
        const [result] = await connection.execute(
            'SELECT MAX(CAST(SUBSTRING(user_id, 5) AS UNSIGNED)) AS max_id FROM user_accounts'
        );
        const nextId = result[0].max_id ? result[0].max_id + 1 : 51;
        const user_id = `user${nextId.toString().padStart(2, '0')}`;

        // Insert the new user
        await connection.execute(
            'INSERT INTO user_accounts (user_id, email, password, first_name, last_name, roles) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, email, `password${nextId}`, first_name, last_name, roles || 'home_owner']
        );

        await connection.end();

        res.json({
            success: true,
            message: 'User added successfully',
            user_id
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add user',
            error: error.message
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // First check if any user is already logged in
        const [activeUsers] = await connection.execute(
            'SELECT user_id FROM user_accounts WHERE login_status = TRUE'
        );

        if (activeUsers.length > 0) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'Another user is currently logged in. Please try again later.',
                activeUser: activeUsers[0].user_id
            });
        }

        // Authenticate the user
        const [results] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ? AND password = ?',
            [username, password]
        );

        if (results.length === 0) {
            await connection.end();
            return res.json({
                success: false,
                authenticated: false,
                message: 'Invalid username or password'
            });
        }

        // User authenticated successfully, update login status
        await connection.execute(
            'UPDATE user_accounts SET login_status = TRUE, last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [username]
        );

        // Get user details for the response
        const userRole = results[0].roles || 'home_owner';
        const firstName = results[0].first_name;
        const lastName = results[0].last_name;

        await connection.end();

        // Return success response with user details
        res.json({
            success: true,
            authenticated: true,
            userRole: userRole,
            userId: username,
            userName: `${firstName} ${lastName}`,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login',
            error: error.message
        });
    }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
    try {
        const { user_id } = req.body;

        // Input validation
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if the user exists and is logged in
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!userCheck[0].login_status) {
            await connection.end();
            return res.status(400).json({
                success: false,
                message: 'User is not currently logged in'
            });
        }

        // Update the login status
        await connection.execute(
            'UPDATE user_accounts SET login_status = FALSE WHERE user_id = ?',
            [user_id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during logout',
            error: error.message
        });
    }
});

// Force logout for all users (admin function)
app.post('/api/admin/force-logout-all', async (req, res) => {
    try {
        const { admin_id } = req.body;

        // Verify admin credentials
        if (!admin_id) {
            return res.status(400).json({
                success: false,
                message: 'Admin ID is required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if user is an admin
        const [adminCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ? AND roles IN ("user_admin", "platform_manager")',
            [admin_id]
        );

        if (adminCheck.length === 0) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Admin privileges required'
            });
        }

        // Log out all users
        await connection.execute('UPDATE user_accounts SET login_status = FALSE');

        await connection.end();

        res.json({
            success: true,
            message: 'All users have been logged out'
        });
    } catch (error) {
        console.error('Force logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during force logout operation',
            error: error.message
        });
    }
});

// Get currently logged in user
app.get('/api/active-session', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);

        // Find active users
        const [activeUsers] = await connection.execute(
            'SELECT user_id, first_name, last_name, roles, last_login FROM user_accounts WHERE login_status = TRUE'
        );

        await connection.end();

        if (activeUsers.length === 0) {
            return res.json({
                success: true,
                active: false,
                message: 'No active session found'
            });
        }

        const activeUser = activeUsers[0];

        res.json({
            success: true,
            active: true,
            user: {
                userId: activeUser.user_id,
                userName: `${activeUser.first_name} ${activeUser.last_name}`,
                userRole: activeUser.roles,
                lastLogin: activeUser.last_login
            }
        });
    } catch (error) {
        console.error('Active session check error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error checking active session',
            error: error.message
        });
    }
});

// Get all listings
app.get('/api/listings', async (req, res) => {
    try {
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
            FROM listings l
            JOIN user_accounts u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
        `);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch listings',
            error: error.message
        });
    }
});

app.get('/api/listings/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT l.*,
                   l.user_id,
                   u.first_name,
                   u.last_name,
                   CONCAT(u.first_name, ' ', u.last_name) as provider_name
            FROM listings l
                     LEFT JOIN user_accounts u ON l.user_id = u.user_id
            ORDER BY l.created_at DESC
        `);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user listings',
            error: error.message
        });
    }
});

// Create a new listing
app.post('/api/listings', async (req, res) => {
    try {
        const { title, description, price, image_path, user_id, category } = req.body;

        // Validate required fields
        if (!title || !description || !price || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, price, and user_id are required fields'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if user exists
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if title already exists
        const [titleCheck] = await connection.execute(
            'SELECT * FROM listings WHERE title = ?',
            [title]
        );

        if (titleCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'A listing with this title already exists'
            });
        }

        // Get the next numeric ID
        const [maxIdResult] = await connection.execute(
            'SELECT MAX(listing_id) AS max_id FROM listings'
        );

        let nextId = 1;
        if (maxIdResult[0].max_id) {
            nextId = parseInt(maxIdResult[0].max_id) + 1;
        }

        // Make sure all values are defined (convert undefined to null)
        const category_name = category || null;
        const image_path_value = image_path || null;

        // Add this right before the INSERT query
        console.log('Values being inserted:', {
            listing_id: nextId,
            title: title,
            description: description,
            price: price,
            image_path: image_path_value,
            user_id: user_id,
            category_name: category_name
        });

        // Insert the listing
        await connection.execute(
            'INSERT INTO listings (listing_id, title, description, price, image_path, user_id, category_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nextId, title, description, price, image_path_value, user_id, category_name]
        );

        // Get user details for the response
        const [userDetails] = await connection.execute(
            'SELECT CONCAT(first_name, " ", last_name) as provider_name FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Listing created successfully',
            data: {
                listing_id: nextId,
                title,
                description,
                price,
                image_path: image_path_value,
                user_id,
                provider_name: userDetails[0].provider_name,
                created_at: new Date(),
                category_name: category_name
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to create listing',
            error: error.message
        });
    }
});

// Update a listing
app.put('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, image_path, user_id } = req.body;

        // Validate required fields
        if (!title || !description || !price || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // First check if the listing exists and belongs to the user
        const [existingListing] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [id]
        );

        if (existingListing.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Verify ownership
        if (existingListing[0].user_id !== user_id) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'You can only update your own listings'
            });
        }

        // Check if the new title conflicts with another listing
        if (title !== existingListing[0].title) {
            const [titleCheck] = await connection.execute(
                'SELECT * FROM listings WHERE title = ? AND listing_id != ?',
                [title, id]
            );

            if (titleCheck.length > 0) {
                await connection.end();
                return res.status(409).json({
                    success: false,
                    message: 'A listing with this title already exists'
                });
            }
        }

        // Update the listing
        await connection.execute(
            'UPDATE listings SET title = ?, description = ?, price = ?, image_path = ? WHERE listing_id = ?',
            [title, description, price, image_path || null, id]
        );

        // Get user details for the response
        const [userDetails] = await connection.execute(
            'SELECT CONCAT(first_name, " ", last_name) as provider_name FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing updated successfully',
            data: {
                listing_id: parseInt(id),
                title,
                description,
                price,
                image_path,
                user_id,
                provider_name: userDetails[0].provider_name
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update listing',
            error: error.message
        });
    }
});

// Delete a listing
app.delete('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query; // Get the user_id from query param

        const connection = await mysql2Promise.createConnection(dbConfig);

        // First check if the listing exists
        const [existingListing] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [id]
        );

        if (existingListing.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Verify ownership if user_id is provided
        if (user_id && existingListing[0].user_id !== user_id) {
            await connection.end();
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own listings'
            });
        }

        // Delete the listing
        await connection.execute(
            'DELETE FROM listings WHERE listing_id = ?',
            [id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing deleted successfully'
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete listing',
            error: error.message
        });
    }
});

app.get('/api/listings/search', async (req, res) => {
    try {
        const query = req.query.query || '';
        const userId = req.query.userId || null;

        // Log the search request
        console.log(`Search request received - query: "${query}", userId: ${userId || 'not specified'}`);

        // Skip empty searches
        if (!query.trim()) {
            // Return all listings or user's listings if userId provided
            let sql = `
                SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
                FROM listings l
                JOIN user_accounts u ON l.user_id = u.user_id
            `;
            let params = [];

            if (userId) {
                sql += ' WHERE l.user_id = ?';
                params.push(userId);
            }

            sql += ' ORDER BY l.created_at DESC';

            const connection = await mysql2Promise.createConnection(dbConfig);
            const [rows] = await connection.execute(sql, params);
            await connection.end();

            return res.json({
                success: true,
                data: rows
            });
        }

        // Build the SQL query for search with wildcards
        let sql = `
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
            FROM listings l
            JOIN user_accounts u ON l.user_id = u.user_id
            WHERE (
                l.title LIKE ? OR 
                l.description LIKE ? OR 
                l.category_name LIKE ? OR 
                CAST(l.price AS CHAR) LIKE ?
            )
        `;

        // Add user filter if userId is provided
        if (userId) {
            sql += ` AND l.user_id = ?`;
        }

        // Add order by created_at for consistent sorting
        sql += ` ORDER BY l.created_at DESC`;

        // Create the search parameter (with wildcards for partial matches)
        const searchParam = `%${query}%`;

        // Set up query parameters
        let params = [searchParam, searchParam, searchParam, searchParam];

        // Add userId to params if it was provided
        if (userId) {
            params.push(userId);
        }

        // Execute the query
        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(sql, params);
        await connection.end();

        console.log(`Search found ${rows.length} results`);

        // Return the results
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search listings',
            error: error.message
        });
    }
});

// Make sure this endpoint is properly defined and not nested inside any conditional blocks
// Place this with your other endpoint definitions

// Update user account endpoint - keep the original URL without the /api/ prefix
app.post('/update-user-account', async (req, res) => {
    try {
        console.log('Update user request received:', req.body);
        const { user_id, email, first_name, last_name, roles } = req.body;
        
        // Basic validation
        if (!email || !first_name || !last_name || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID, email, first name, and last name are required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Validate roles (must be either 'home_owner' or 'user_admin')
        if (roles && !['home_owner', 'user_admin'].includes(roles)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "home_owner" or "user_admin"'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is already in use by another user
        const [emailCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE email = ? AND user_id != ?',
            [email, user_id]
        );
        
        if (emailCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Email already in use by another user'
            });
        }
        
        // Check if first_name and last_name combination is already in use by another user
        const [nameCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE first_name = ? AND last_name = ? AND user_id != ?',
            [first_name, last_name, user_id]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'First name and last name combination already in use by another user'
            });
        }
        
        // Update user
        await connection.execute(
            'UPDATE user_accounts SET email = ?, first_name = ?, last_name = ?, roles = ? WHERE user_id = ?',
            [email, first_name, last_name, roles, user_id]
        );
        
        await connection.end();
        
        console.log('User updated successfully:', user_id);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        // Comprehensive error logging
        console.error('Error in update-user-account endpoint:', error);
        // Send proper JSON error response
        res.status(500).json({
            success: false,
            message: 'Failed to update user: ' + error.message
        });
    }
});

// Also add a duplicate endpoint with the /api/ prefix for consistency
app.post('/api/update-user-account', async (req, res) => {
    // Simply call the same logic from the other route
    try {
        const { user_id, email, first_name, last_name, roles } = req.body;
        
        // Basic validation
        if (!email || !first_name || !last_name || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID, email, first name, and last name are required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        // Validate roles (must be either 'home_owner' or 'user_admin')
        if (roles && !['home_owner', 'user_admin'].includes(roles)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "home_owner" or "user_admin"'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is already in use by another user
        const [emailCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE email = ? AND user_id != ?',
            [email, user_id]
        );
        
        if (emailCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'Email already in use by another user'
            });
        }
        
        // Check if first_name and last_name combination is already in use by another user
        const [nameCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE first_name = ? AND last_name = ? AND user_id != ?',
            [first_name, last_name, user_id]
        );
        
        if (nameCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'First name and last name combination already in use by another user'
            });
        }
        
        // Update user
        await connection.execute(
            'UPDATE user_accounts SET email = ?, first_name = ?, last_name = ?, roles = ? WHERE user_id = ?',
            [email, first_name, last_name, roles, user_id]
        );
        
        await connection.end();
        
        console.log('User updated successfully:', user_id);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        // Comprehensive error logging
        console.error('Error in api/update-user-account endpoint:', error);
        // Send proper JSON error response
        res.status(500).json({
            success: false,
            message: 'Failed to update user: ' + error.message
        });
    }
});


// Add this to your server.js to test if the server is properly handling requests
app.get('/test-endpoint', (req, res) => {
    res.json({ success: true, message: 'Server is properly responding to requests' });
});

// Also add a POST version to test POST requests specifically
app.post('/test-post', (req, res) => {
    res.json({ 
        success: true, 
        message: 'POST request successful',
        receivedData: req.body 
    });
});


// Suspension Code
// Toggle user suspension status endpoint
app.post('/api/toggle-suspension', async (req, res) => {
    try {
        const { user_id, isSuspended } = req.body;
        
        // Basic validation
        if (user_id === undefined || isSuspended === undefined) {
            return res.status(400).json({
                success: false,
                message: 'User ID and suspension status are required'
            });
        }
        
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update user suspension status
        await connection.execute(
            'UPDATE user_accounts SET isSuspended = ? WHERE user_id = ?',
            [isSuspended, user_id]
        );
        
        await connection.end();
        
        console.log(`User ${user_id} suspension status updated to: ${isSuspended}`);
        res.json({
            success: true,
            message: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
        });
    } catch (error) {
        console.error('Error in toggle-suspension endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update suspension status: ' + error.message
        });
    }
});

// Add these endpoints to your server.js file

// Get shortlisted listings for a user
app.get('/api/shortlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);

        const [rows] = await connection.execute(`
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name, 
                   s.created_at as shortlisted_at
            FROM shortlisted_listings s
            JOIN listings l ON s.listing_id = l.listing_id
            JOIN user_accounts u ON l.user_id = u.user_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `, [userId]);

        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shortlisted listings',
            error: error.message
        });
    }
});

// Add a listing to shortlist
app.post('/api/shortlist', async (req, res) => {
    try {
        const { user_id, listing_id } = req.body;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if the listing exists
        const [listingCheck] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [listing_id]
        );

        if (listingCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Check if user exists
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already shortlisted
        const [existingShortlist] = await connection.execute(
            'SELECT * FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        if (existingShortlist.length > 0) {
            await connection.end();
            return res.status(200).json({
                success: true,
                message: 'Listing is already in shortlist',
                isShortlisted: true
            });
        }

        // Add to shortlist
        await connection.execute(
            'INSERT INTO shortlisted_listings (user_id, listing_id) VALUES (?, ?)',
            [user_id, listing_id]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Listing added to shortlist',
            isShortlisted: true
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add listing to shortlist',
            error: error.message
        });
    }
});

// Remove a listing from shortlist
app.delete('/api/shortlist', async (req, res) => {
    try {
        const { user_id, listing_id } = req.body;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Delete from shortlist
        await connection.execute(
            'DELETE FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Listing removed from shortlist',
            isShortlisted: false
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove listing from shortlist',
            error: error.message
        });
    }
});

// Check if a listing is shortlisted by a user
app.get('/api/shortlist/check', async (req, res) => {
    try {
        const { user_id, listing_id } = req.query;

        // Validate required fields
        if (!user_id || !listing_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Listing ID are required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if shortlisted
        const [rows] = await connection.execute(
            'SELECT * FROM shortlisted_listings WHERE user_id = ? AND listing_id = ?',
            [user_id, listing_id]
        );

        await connection.end();

        res.json({
            success: true,
            isShortlisted: rows.length > 0
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check shortlist status',
            error: error.message
        });
    }
});

// Get count of shortlists for a listing
// Get count of shortlists for a listing
app.get('/api/shortlist/count', async (req, res) => {
    try {
        const { listing_id } = req.query;

        if (!listing_id) {
            return res.status(400).json({
                success: false,
                message: 'Listing ID is required'
            });
        }

        console.log(`Counting shortlists for listing_id: ${listing_id}`);

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Count shortlists for this listing - ensuring we're matching the right column
        // Using debug logs to help troubleshoot
        const query = 'SELECT COUNT(*) as count FROM shortlisted_listings WHERE listing_id = ?';
        console.log('Executing query:', query);
        console.log('With parameter:', listing_id);

        const [rows] = await connection.execute(query, [listing_id]);

        console.log('Query result:', rows);

        await connection.end();

        const count = rows[0]?.count || 0;

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error counting shortlists:', error);
        res.status(500).json({
            success: false,
            message: 'Error counting shortlists',
            error: error.message
        });
    }
});

// Get all listings with shortlist counts for a specific user
app.get('/api/listings/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        console.log(`Fetching listing stats for user: ${userId}`);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Get all user's listings with shortlist counts in a single efficient query
        const [rows] = await connection.execute(`
            SELECT 
                l.listing_id,
                l.title,
                l.description,
                l.price,
                l.image_path,
                l.user_id,
                l.created_at,
                COUNT(s.id) as shortlist_count
            FROM 
                listings l
            LEFT JOIN 
                shortlisted_listings s ON l.listing_id = s.listing_id
            WHERE 
                l.user_id = ?
            GROUP BY 
                l.listing_id
            ORDER BY 
                l.created_at DESC
        `, [userId]);

        console.log(`Found ${rows.length} listings with stats for user ${userId}`);

        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching listing stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch listing statistics',
            error: error.message
        });
    }
});

// Record a new view for a listing
app.post('/api/views', async (req, res) => {
    try {
        const { listing_id, viewer_id, view_source, user_agent } = req.body;

        // Basic validation
        if (!listing_id) {
            return res.status(400).json({
                success: false,
                message: 'Listing ID is required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if the listing exists
        const [listingCheck] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [listing_id]
        );

        if (listingCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // If a viewer_id is provided, check if the user exists
        if (viewer_id) {
            const [userCheck] = await connection.execute(
                'SELECT * FROM user_accounts WHERE user_id = ?',
                [viewer_id]
            );

            if (userCheck.length === 0) {
                // User not found, continue but set viewer_id to NULL
                console.warn(`User ${viewer_id} not found, recording view as anonymous`);
            }
        }

        // Insert the view record
        const [result] = await connection.execute(
            'INSERT INTO listing_views (listing_id, viewer_id, view_source, user_agent) VALUES (?, ?, ?, ?)',
            [listing_id, viewer_id || null, view_source || 'homepage', user_agent || null]
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'View recorded successfully',
            view_id: result.insertId
        });
    } catch (error) {
        console.error('Error recording view:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record view',
            error: error.message
        });
    }
});

// Get view statistics for a listing
app.get('/api/views/listing/:listingId', async (req, res) => {
    try {
        const { listingId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);

        // Get total views
        const [totalViews] = await connection.execute(
            'SELECT COUNT(*) as total FROM listing_views WHERE listing_id = ?',
            [listingId]
        );

        // Get views for today
        const [todayViews] = await connection.execute(
            'SELECT COUNT(*) as today FROM listing_views WHERE listing_id = ? AND DATE(view_date) = CURDATE()',
            [listingId]
        );

        // Get views for this week (Sunday to Saturday)
        const [weeklyViews] = await connection.execute(
            'SELECT COUNT(*) as weekly FROM listing_views WHERE listing_id = ? AND YEARWEEK(view_date, 1) = YEARWEEK(CURDATE(), 1)',
            [listingId]
        );

        // Get views for this month
        const [monthlyViews] = await connection.execute(
            'SELECT COUNT(*) as monthly FROM listing_views WHERE listing_id = ? AND MONTH(view_date) = MONTH(CURDATE()) AND YEAR(view_date) = YEAR(CURDATE())',
            [listingId]
        );

        await connection.end();

        res.json({
            success: true,
            data: {
                listing_id: listingId,
                views: {
                    total: totalViews[0].total,
                    today: todayViews[0].today,
                    weekly: weeklyViews[0].weekly,
                    monthly: monthlyViews[0].monthly
                }
            }
        });
    } catch (error) {
        console.error('Error fetching view statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch view statistics',
            error: error.message
        });
    }
});

// Get view statistics for all listings of a user
app.get('/api/views/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const connection = await mysql2Promise.createConnection(dbConfig);

        // Get all listings for the user
        const [userListings] = await connection.execute(
            'SELECT listing_id FROM listings WHERE user_id = ?',
            [userId]
        );

        if (userListings.length === 0) {
            await connection.end();
            return res.json({
                success: true,
                data: []
            });
        }

        // Create a list of listing IDs
        const listingIds = userListings.map(listing => listing.listing_id);

        // Use a placeholder for each listing ID in the IN clause
        const placeholders = listingIds.map(() => '?').join(',');

        // Get today's views for all listings
        const [todayViews] = await connection.execute(
            `SELECT listing_id, COUNT(*) as views 
             FROM listing_views 
             WHERE listing_id IN (${placeholders}) AND DATE(view_date) = CURDATE() 
             GROUP BY listing_id`,
            [...listingIds]
        );

        // Get this week's views
        const [weeklyViews] = await connection.execute(
            `SELECT listing_id, COUNT(*) as views 
             FROM listing_views 
             WHERE listing_id IN (${placeholders}) AND YEARWEEK(view_date, 1) = YEARWEEK(CURDATE(), 1) 
             GROUP BY listing_id`,
            [...listingIds]
        );

        // Get this month's views
        const [monthlyViews] = await connection.execute(
            `SELECT listing_id, COUNT(*) as views 
             FROM listing_views 
             WHERE listing_id IN (${placeholders}) AND MONTH(view_date) = MONTH(CURDATE()) AND YEAR(view_date) = YEAR(CURDATE()) 
             GROUP BY listing_id`,
            [...listingIds]
        );

        // Get all listings with details
        const [listingsDetails] = await connection.execute(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name,
                    (SELECT COUNT(*) FROM shortlisted_listings sl WHERE sl.listing_id = l.listing_id) as shortlist_count
             FROM listings l
             JOIN user_accounts u ON l.user_id = u.user_id
             WHERE l.user_id = ?
             ORDER BY l.created_at DESC`,
            [userId]
        );

        // Build the response data combining listing details with view stats
        const responseData = listingsDetails.map(listing => {
            const listingId = listing.listing_id;

            // Find view counts for this listing
            const dayViews = todayViews.find(item => item.listing_id === listingId);
            const weekViews = weeklyViews.find(item => item.listing_id === listingId);
            const monthViews = monthlyViews.find(item => item.listing_id === listingId);

            return {
                ...listing,
                views: {
                    day: dayViews ? dayViews.views : 0,
                    week: weekViews ? weekViews.views : 0,
                    month: monthViews ? monthViews.views : 0
                }
            };
        });

        await connection.end();

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching user listing view statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch view statistics',
            error: error.message
        });
    }
});

// Get a single listing by ID
app.get('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const connection = await mysql2Promise.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
            FROM listings l
            JOIN user_accounts u ON l.user_id = u.user_id
            WHERE l.listing_id = ?
        `, [id]);
        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch listing details',
            error: error.message
        });
    }
});

// Add these booking endpoints to your server.js file

// Get availability for a provider (checks existing bookings)
app.get('/api/bookings/availability', async (req, res) => {
    try {
        const { provider_id, date } = req.query;

        // Basic validation
        if (!provider_id) {
            return res.status(400).json({
                success: false,
                message: 'Provider ID is required'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Build query based on whether a specific date was provided
        let query = `
            SELECT scheduled_date, scheduled_time 
            FROM service_bookings 
            WHERE provider_id = ? 
            AND status != 'cancelled'
        `;

        let params = [provider_id];

        // Filter by date if provided
        if (date) {
            query += ' AND scheduled_date = ?';
            params.push(date);
        } else {
            // Otherwise get bookings from today onwards
            query += ' AND scheduled_date >= CURDATE()';
        }

        // Execute the query
        const [rows] = await connection.execute(query, params);
        await connection.end();

        // Return the booked slots
        res.json({
            success: true,
            data: {
                provider_id,
                date: date || 'all',
                bookings: rows
            }
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch availability',
            error: error.message
        });
    }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { user_id, listing_id, provider_id, scheduled_date, scheduled_time, status } = req.body;

        // Basic validation
        if (!user_id || !listing_id || !provider_id || !scheduled_date || !scheduled_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields for booking'
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Validate the user exists
        const [userCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [user_id]
        );

        if (userCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate the provider exists
        const [providerCheck] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [provider_id]
        );

        if (providerCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Validate the listing exists
        const [listingCheck] = await connection.execute(
            'SELECT * FROM listings WHERE listing_id = ?',
            [listing_id]
        );

        if (listingCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        // Check if the timeslot is already booked
        const [bookingCheck] = await connection.execute(
            'SELECT * FROM service_bookings WHERE provider_id = ? AND scheduled_date = ? AND scheduled_time = ? AND status != "cancelled"',
            [provider_id, scheduled_date, scheduled_time]
        );

        if (bookingCheck.length > 0) {
            await connection.end();
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked'
            });
        }

        // Insert the new booking
        const [result] = await connection.execute(
            'INSERT INTO service_bookings (user_id, listing_id, provider_id, scheduled_date, scheduled_time, status) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, listing_id, provider_id, scheduled_date, scheduled_time, status || 'pending_approval']
        );

        await connection.end();

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: {
                booking_id: result.insertId,
                user_id,
                listing_id,
                provider_id,
                scheduled_date,
                scheduled_time,
                status: status || 'pending_approval'
            }
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
});

// Get bookings for a user
app.get('/api/bookings/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Build the query
        let query = `
            SELECT 
                b.booking_id, 
                b.scheduled_date, 
                b.scheduled_time, 
                b.status,
                l.listing_id,
                l.title AS service_title,
                l.price AS service_price, 
                l.image_path AS service_image,
                CONCAT(p.first_name, ' ', p.last_name) AS provider_name
            FROM 
                service_bookings b
            JOIN 
                listings l ON b.listing_id = l.listing_id
            JOIN 
                user_accounts p ON b.provider_id = p.user_id
            WHERE 
                b.user_id = ?
        `;

        const queryParams = [userId];

        // Add status filter if provided
        if (status) {
            query += ' AND b.status = ?';
            queryParams.push(status);
        }

        // Add order by
        query += ' ORDER BY b.scheduled_date DESC, b.scheduled_time DESC';

        // Execute the query
        const [rows] = await connection.execute(query, queryParams);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Get bookings for a provider
app.get('/api/bookings/provider/:providerId', async (req, res) => {
    try {
        const { providerId } = req.params;
        const { status } = req.query;

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Build the query
        let query = `
            SELECT 
                b.booking_id, 
                b.scheduled_date, 
                b.scheduled_time, 
                b.status,
                l.listing_id,
                l.title AS service_title,
                CONCAT(u.first_name, ' ', u.last_name) AS client_name
            FROM 
                service_bookings b
            JOIN 
                listings l ON b.listing_id = l.listing_id
            JOIN 
                user_accounts u ON b.user_id = u.user_id
            WHERE 
                b.provider_id = ?
        `;

        const queryParams = [providerId];

        // Add status filter if provided
        if (status) {
            query += ' AND b.status = ?';
            queryParams.push(status);
        }

        // Add order by
        query += ' ORDER BY b.scheduled_date ASC, b.scheduled_time ASC';

        // Execute the query
        const [rows] = await connection.execute(query, queryParams);
        await connection.end();

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching provider bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Update booking status
app.put('/api/bookings/:bookingId/status', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status, user_id } = req.body;

        // Basic validation
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status value
        const validStatuses = ['pending_approval', 'approved', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Check if booking exists
        const [bookingCheck] = await connection.execute(
            'SELECT * FROM service_bookings WHERE booking_id = ?',
            [bookingId]
        );

        if (bookingCheck.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check authorization if user_id is provided
        // Only the provider or the booking user should be able to update
        if (user_id) {
            const booking = bookingCheck[0];
            if (booking.user_id !== user_id && booking.provider_id !== user_id) {
                await connection.end();
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to update this booking'
                });
            }
        }

        // Update the booking status
        await connection.execute(
            'UPDATE service_bookings SET status = ? WHERE booking_id = ?',
            [status, bookingId]
        );

        await connection.end();

        res.json({
            success: true,
            message: 'Booking status updated successfully',
            data: {
                booking_id: parseInt(bookingId),
                status
            }
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: error.message
        });
    }
});

// Get a specific booking by ID
app.get('/api/bookings/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;

        const connection = await mysql2Promise.createConnection(dbConfig);

        // Get booking with related information
        const [rows] = await connection.execute(`
            SELECT 
                b.*,
                l.title AS service_title,
                l.description AS service_description,
                l.price AS service_price,
                l.image_path AS service_image,
                CONCAT(p.first_name, ' ', p.last_name) AS provider_name,
                CONCAT(u.first_name, ' ', u.last_name) AS client_name
            FROM 
                service_bookings b
            JOIN 
                listings l ON b.listing_id = l.listing_id
            JOIN 
                user_accounts p ON b.provider_id = p.user_id
            JOIN 
                user_accounts u ON b.user_id = u.user_id
            WHERE 
                b.booking_id = ?
        `, [bookingId]);

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        await connection.end();

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

