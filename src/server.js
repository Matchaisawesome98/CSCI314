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
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Sandman@9139', //please change if needed
    database: 'users'
};



// MySQL connection pool for authentication
const pool = mysql.createPool({
    connectionLimit: 10,
    ...dbConfig
});


const promisePool = pool.promise();

// Authentication endpoint
app.post('/api/authenticate', (req, res) => {
    const { username, password } = req.body;

    // IMPORTANT: In production, use parameterized queries to prevent SQL injection
    // Also, passwords should be hashed, not stored in plain text
    const query = 'SELECT * FROM user_accounts WHERE user_id = ? AND password = ?';

    pool.query(query, [username, password], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
            return;
        }

        if (results.length > 0) {
            const userRole = results[0].roles || 'home_owner';
            res.json({
                success: true,
                authenticated: true,
                userRole: userRole
            });
        } else {
            res.json({
                success: true,
                authenticated: false
            });
        }
    });
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
        const [rows] = await connection.execute(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as provider_name 
             FROM listings l
             JOIN user_accounts u ON l.user_id = u.user_id
             WHERE l.user_id = ?
             ORDER BY l.created_at DESC`,
            [userId]
        );
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
        const { title, description, price, image_path, user_id } = req.body;

        // Validate required fields
        if (!title || !description || !price || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
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

        // Insert the listing
        const [result] = await connection.execute(
            'INSERT INTO listings (title, description, price, image_path, user_id) VALUES (?, ?, ?, ?, ?)',
            [title, description, price, image_path || null, user_id]
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
                listing_id: result.insertId,
                title,
                description,
                price,
                image_path,
                user_id,
                provider_name: userDetails[0].provider_name,
                created_at: new Date()
            }
        });
    } catch (error) {
        console.error('Database error:', error);
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






// Update user suspension status endpoint
app.post('/update-suspension-status', async (req, res) => {
    try {
        const { userId, isSuspended } = req.body;
        
        // Basic validation
        if (userId === undefined || isSuspended === undefined) {
            return res.status(400).json({
                success: false,
                message: 'User ID and suspension status are required'
            });
        }
        
        // Connect to the database
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [userId]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update the suspension status
        await connection.execute(
            'UPDATE user_accounts SET isSuspended = ? WHERE user_id = ?',
            [isSuspended, userId]
        );
        
        await connection.end();
        
        console.log(`User ${userId} suspension status updated to: ${isSuspended}`);
        res.json({
            success: true,
            message: `User has been ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
        });
    } catch (error) {
        console.error('Error in update-suspension-status endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user suspension status: ' + error.message
        });
    }
});

// Add a duplicate endpoint with the /api/ prefix for consistency
app.post('/api/update-suspension-status', async (req, res) => {
    try {
        const { userId, isSuspended } = req.body;
        
        // Basic validation
        if (userId === undefined || isSuspended === undefined) {
            return res.status(400).json({
                success: false,
                message: 'User ID and suspension status are required'
            });
        }
        
        // Connect to the database
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Check if user exists
        const [existingUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE user_id = ?',
            [userId]
        );
        
        if (existingUser.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Update the suspension status
        await connection.execute(
            'UPDATE user_accounts SET isSuspended = ? WHERE user_id = ?',
            [isSuspended, userId]
        );
        
        await connection.end();
        
        console.log(`User ${userId} suspension status updated to: ${isSuspended}`);
        res.json({
            success: true,
            message: `User has been ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
        });
    } catch (error) {
        console.error('Error in api/update-suspension-status endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user suspension status: ' + error.message
        });
    }
});



app.put('/update-user/:id', async (req, res) => {
    const userId = req.params.id;
    const userData = req.body;
    
    try {
        // Validate input
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        if (Object.keys(userData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data provided for update'
            });
        }
        
        // Create connection
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Handle field name mapping
        const fieldMap = {
            // Map frontend field names to database field names if needed
            firstName: 'first_name',
            lastName: 'last_name'
        };
        
        // Build update query with mapped fields
        const mappedUserData = {};
        for (const [key, value] of Object.entries(userData)) {
            // Use the mapped field name if available, otherwise use the original key
            const fieldName = fieldMap[key] || key;
            mappedUserData[fieldName] = value;
        }
        
        // Build update query dynamically
        const fields = Object.keys(mappedUserData);
        const values = Object.values(mappedUserData);
        
        // Construct SET clause
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        // Determine which column to use as primary key
        // Try to use 'id' first, if not present, assume 'user_id'
        const idField = await determineIdField(connection);
        
        // Construct and execute the query
        const query = `UPDATE user_accounts SET ${setClause} WHERE ${idField} = ?`;
        const [result] = await connection.execute(query, [...values, userId]);
        
        await connection.end();
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or no changes made'
            });
        }
        
        res.json({
            success: true,
            message: 'User updated successfully',
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
});

// New endpoint for user creation
app.post('/api/users', async (req, res) => {
    const userData = req.body;
    
    try {
        // Validate input
        if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: email, password, first_name, last_name'
            });
        }
        
        // Create connection
        const connection = await mysql2Promise.createConnection(dbConfig);
        
        // Generate a user_id if not provided
        const userId = userData.user_id || `user${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;
        
        // Insert the new user
        const query = `
            INSERT INTO user_accounts 
            (user_id, email, password, first_name, last_name, roles, isSuspended) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await connection.execute(query, [
            userId,
            userData.email,
            userData.password,
            userData.first_name,
            userData.last_name,
            userData.roles || 'home_owner',
            userData.isSuspended || false
        ]);
        
        await connection.end();
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user_id: userId
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
});

































// Helper function to determine which ID field is present in the table
async function determineIdField(connection) {
    try {
        // Get table structure
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_accounts'
        `, [dbConfig.database]);
        
        const columnNames = columns.map(col => col.COLUMN_NAME);
        
        // Check if 'id' exists
        if (columnNames.includes('id')) {
            return 'id';
        } 
        // Otherwise use 'user_id'
        else if (columnNames.includes('user_id')) {
            return 'user_id';
        }
        // Default to 'id' if neither is found
        else {
            return 'id';
        }
    } catch (error) {
        console.error('Error determining ID field:', error);
        return 'id'; // Default to 'id'
    }
}














// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
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





// Add a static file server for the HTML page
app.use(express.static('public'));

// Make sure to handle any route pointing to the user management interface
app.get('/user-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-management.html'));
});




