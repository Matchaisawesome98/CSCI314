// platformManagerStats.js - Client-side implementation
// This file will fetch and display daily revenue reports by category

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize application
    initRevenueStatsApp();
});

// Initialize the application
function initRevenueStatsApp() {
    // Set up event listeners
    setupEventListeners();

    // Load today's data by default
    const today = new Date().toISOString().split('T')[0];
    fetchDailyRevenue(today);
}

// Set up event listeners for UI interactions
function setupEventListeners() {
    // Date picker for selecting a specific date
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.value = new Date().toISOString().split('T')[0]; // Set default to today
        datePicker.addEventListener('change', function() {
            fetchDailyRevenue(this.value);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const selectedDate = document.getElementById('date-picker').value;
            fetchDailyRevenue(selectedDate);
        });
    }
}

// Fetch daily revenue data from the API
function fetchDailyRevenue(date) {
    // Show loading state
    const statsContainer = document.getElementById('revenue-stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';
    }

    // Make API request
    fetch(`/api/stats/daily-revenue?date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayRevenueStats(data);
            } else {
                throw new Error(data.message || 'Failed to fetch revenue statistics');
            }
        })
        .catch(error => {
            console.error('Error fetching revenue data:', error);
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="error">
                        Error loading revenue statistics: ${error.message}
                    </div>
                `;
            }
        });
}

// Display revenue statistics in the UI
function displayRevenueStats(data) {
    const statsContainer = document.getElementById('revenue-stats-container');
    if (!statsContainer) return;

    // Format date for display
    const displayDate = new Date(data.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Build HTML for the table
    let html = `
        <div class="stats-header">
            <h2>Daily Revenue Report - ${displayDate}</h2>
            <div class="stats-summary">
                <span>Total Revenue: $${data.total_revenue.toFixed(2)}</span>
                <span>Completed Bookings: ${data.total_completed_bookings}</span>
            </div>
        </div>
        
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Category Code</th>
                    <th>Category Name</th>
                    <th>Revenue</th>
                    <th>Bookings</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Only show categories with revenue for a cleaner view
    const categoriesWithRevenue = data.data.filter(item => item.daily_revenue > 0);

    // If there are categories with revenue, show them
    if (categoriesWithRevenue.length > 0) {
        categoriesWithRevenue.forEach(category => {
            html += `
                <tr>
                    <td>${category.category_code}</td>
                    <td>${category.category_name}</td>
                    <td class="revenue">$${category.daily_revenue.toFixed(2)}</td>
                    <td class="bookings">${category.completed_bookings}</td>
                </tr>
            `;
        });
    } else {
        // If no categories have revenue, show a message
        html += `
            <tr>
                <td colspan="4" class="no-data">No revenue recorded for this date</td>
            </tr>
        `;
    }

    // Add summary row and close table
    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>Total</strong></td>
                    <td class="revenue"><strong>$${data.total_revenue.toFixed(2)}</strong></td>
                    <td class="bookings"><strong>${data.total_completed_bookings}</strong></td>
                </tr>
            </tfoot>
        </table>
        
        <div class="all-categories-section">
            <h3>All Categories (including zero revenue)</h3>
            <table class="stats-table all-categories-table">
                <thead>
                    <tr>
                        <th>Category Code</th>
                        <th>Category Name</th>
                        <th>Revenue</th>
                        <th>Bookings</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add all categories to the second table
    if (data.data.length > 0) {
        data.data.forEach(category => {
            html += `
                <tr class="${category.daily_revenue > 0 ? 'has-revenue' : 'no-revenue'}">
                    <td>${category.category_code}</td>
                    <td>${category.category_name}</td>
                    <td class="revenue">$${category.daily_revenue.toFixed(2)}</td>
                    <td class="bookings">${category.completed_bookings}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="4" class="no-data">No categories found</td>
            </tr>
        `;
    }

    // Close the second table
    html += `
                </tbody>
            </table>
        </div>
    `;

    // Update the container with the generated HTML
    statsContainer.innerHTML = html;
}

// Add some basic CSS for styling the report
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .stats-header {
            margin-bottom: 20px;
        }
        
        .stats-summary {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            font-weight: bold;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .stats-table th, .stats-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .stats-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .revenue, .bookings {
            text-align: right;
        }
        
        .no-data {
            text-align: center;
            font-style: italic;
            color: #777;
        }
        
        .loading, .error {
            padding: 20px;
            text-align: center;
        }
        
        .error {
            color: #d32f2f;
            border: 1px solid #f5c6cb;
            background-color: #f8d7da;
            border-radius: 4px;
        }
        
        .has-revenue {
            background-color: #e8f5e9;
        }
        
        .no-revenue {
            color: #777;
        }
        
        .all-categories-section {
            margin-top: 40px;
        }
    `;
    document.head.appendChild(style);
}

// Call this to add the styles when the script loads
addStyles();