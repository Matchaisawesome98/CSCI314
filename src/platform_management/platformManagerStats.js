// Platform Manager Statistics Module
// This script handles the Report functionality for platform managers

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Platform Manager stats functionality
    const platformStats = new PlatformManagerStats();
    platformStats.initialize();

    // Add specific event listener for the Reports tab
    const reportsTab = document.getElementById('reports-tab');
    if (reportsTab) {
        reportsTab.addEventListener('click', function() {
            // Make sure categories are fetched if they haven't been already
            if (platformStats.categories.length === 0) {
                platformStats.fetchCategories();
            }

            // Additional initialization for report view if needed
            platformStats.prepareReportView();
        });
    }
});

class PlatformManagerStats {
    constructor() {
        this.reportOptions = {
            'daily-report': {
                title: 'Daily Report',
                dateRange: 'single',
                endpoint: '/api/reports/daily'
            },
            'weekly-report': {
                title: 'Weekly Report',
                dateRange: 'range',
                endpoint: '/api/reports/weekly'
            },
            'monthly-report': {
                title: 'Monthly Report',
                dateRange: 'range',
                endpoint: '/api/reports/monthly'
            }
        };

        this.currentReport = null;
        this.categories = [];
        this.initialized = false;
    }

    initialize() {
        // Initialize DOM elements
        this.initElements();

        // Set up event listeners
        this.setupEventListeners();

        // Fetch categories for later use
        this.fetchCategories();
    }

    initElements() {
        // Navigation tabs
        this.categoriesTab = document.getElementById('categories-tab');
        this.reportsTab = document.getElementById('reports-tab');
        this.categoriesContent = document.getElementById('categories-content');
        this.reportsContent = document.getElementById('reports-content');

        // Report sections
        this.reportOptionsSection = document.getElementById('report-options-section');
        this.reportResultsSection = document.getElementById('report-results-section');

        // Report options
        this.dailyReportOption = document.getElementById('daily-report');
        this.weeklyReportOption = document.getElementById('weekly-report');
        this.monthlyReportOption = document.getElementById('monthly-report');
        this.backToOptions = document.getElementById('back-to-options');

        // Report results
        this.reportTitle = document.getElementById('report-title');
        this.startDate = document.getElementById('start-date');
        this.endDate = document.getElementById('end-date');
        this.endDateLabel = document.getElementById('end-date-label');
        this.updateReportBtn = document.getElementById('update-report-btn');
        this.reportStats = document.getElementById('report-stats');
        this.reportTable = document.getElementById('report-table');

        // Error container
        this.errorContainer = document.getElementById('error-container');
    }

    setupEventListeners() {
        // Tab navigation
        this.categoriesTab.addEventListener('click', () => this.switchTab('categories'));
        this.reportsTab.addEventListener('click', () => {
            this.switchTab('reports');
            this.prepareReportView();
        });

        // Report options
        this.dailyReportOption.addEventListener('click', () => this.showReport('daily-report'));
        this.weeklyReportOption.addEventListener('click', () => this.showReport('weekly-report'));
        this.monthlyReportOption.addEventListener('click', () => this.showReport('monthly-report'));
        this.backToOptions.addEventListener('click', () => this.showReportOptions());

        // Update report button
        this.updateReportBtn.addEventListener('click', () => this.updateReport());

        // Set default date in date fields
        const today = new Date();
        const todayFormatted = today.toISOString().split('T')[0];

        // Set default dates
        this.startDate.value = todayFormatted;
        this.endDate.value = todayFormatted;

        // When date input changes, enable the update button
        this.startDate.addEventListener('change', () => this.enableUpdateButton());
        this.endDate.addEventListener('change', () => this.enableUpdateButton());
    }

    enableUpdateButton() {
        this.updateReportBtn.disabled = false;
        this.updateReportBtn.classList.remove('disabled');
    }

    switchTab(tabName) {
        if (tabName === 'categories') {
            this.categoriesTab.classList.add('active');
            this.reportsTab.classList.remove('active');
            this.categoriesContent.classList.add('active');
            this.reportsContent.classList.remove('active');
        } else {
            this.categoriesTab.classList.remove('active');
            this.reportsTab.classList.add('active');
            this.categoriesContent.classList.remove('active');
            this.reportsContent.classList.add('active');
        }
    }

    async fetchCategories() {
        try {
            console.log('Fetching categories...');
            const response = await fetch('http://localhost:3000/api/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const result = await response.json();
            if (result.success && result.data) {
                this.categories = result.data;
                console.log('Categories fetched:', this.categories.length);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            this.showError('Failed to fetch categories. Please try again later.');
        }
    }

    // Method to prepare the report view - called when switching to Reports tab
    prepareReportView() {
        console.log('Preparing report view...');

        // If we haven't shown any report yet, let's show default stats
        if (!this.initialized) {
            this.initialized = true;

            // Prepare summary stats on the Report Options page
            this.prepareSummaryStats();
        }
    }

    // Display summary statistics on the report options page
    async prepareSummaryStats() {
        try {
            console.log('Preparing summary statistics...');

            // Create a container for summary stats if it doesn't exist
            let summaryContainer = document.querySelector('.summary-stats-container');
            if (!summaryContainer) {
                const welcomeSection = document.querySelector('#reports-content .welcome-section');
                if (welcomeSection) {
                    summaryContainer = document.createElement('div');
                    summaryContainer.className = 'summary-stats-container stats-container';
                    welcomeSection.parentNode.insertBefore(summaryContainer, welcomeSection.nextSibling);
                }
            }

            if (!summaryContainer) return;

            // Show loading state
            summaryContainer.innerHTML = '<div class="loading-indicator">Loading summary statistics...</div>';

            // Fetch or generate summary data
            const summaryData = await this.fetchSummaryStats();

            // Create stat cards
            let statsHTML = '';
            for (const [key, value] of Object.entries(summaryData)) {
                const label = this.formatStatLabel(key);
                statsHTML += `
                    <div class="stat-card">
                        <div class="stat-value">${value}</div>
                        <div class="stat-label">${label}</div>
                    </div>
                `;
            }

            summaryContainer.innerHTML = statsHTML;

        } catch (error) {
            console.error('Error preparing summary stats:', error);
        }
    }

    async fetchSummaryStats() {
        // In a real implementation, fetch from an API
        // For now, generate mock data
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            totalCategories: this.categories.length || 5,
            activeServices: Math.floor(Math.random() * 100) + 50,
            totalBookings: Math.floor(Math.random() * 500) + 100,
            totalViews: Math.floor(Math.random() * 5000) + 1000,
            conversionRate: (Math.random() * 15 + 5).toFixed(2) + '%'
        };
    }

    showReport(reportType) {
        // Store current report type
        this.currentReport = reportType;

        // Configure the date inputs based on report type
        const reportConfig = this.reportOptions[reportType];
        this.reportTitle.textContent = reportConfig.title;

        // Configure date range UI
        if (reportConfig.dateRange === 'single') {
            this.endDate.style.display = 'none';
            this.endDateLabel.style.display = 'none';
        } else {
            this.endDate.style.display = '';
            this.endDateLabel.style.display = '';
        }

        // Show report results section
        this.reportOptionsSection.style.display = 'none';
        this.reportResultsSection.style.display = 'block';

        // Fetch and display report data
        this.fetchReportData(reportType);
    }

    showReportOptions() {
        this.reportOptionsSection.style.display = 'block';
        this.reportResultsSection.style.display = 'none';
        this.currentReport = null;
    }

    updateReport() {
        if (this.currentReport) {
            this.fetchReportData(this.currentReport);
        }
    }

    async fetchReportData(reportType) {
        try {
            // Display loading state
            this.displayLoading();

            // Get date range
            const startDate = this.startDate.value;
            const endDate = this.endDate.value;

            // For actual implementation, use the API endpoint
            // const response = await fetch(`${this.reportOptions[reportType].endpoint}?startDate=${startDate}&endDate=${endDate}`);

            // Since we don't have real endpoints yet, we'll simulate fetching data
            const data = await this.getMockReportData(reportType, startDate, endDate);

            // Display the data
            this.displayReportData(reportType, data);

        } catch (error) {
            console.error('Error fetching report data:', error);
            this.showError('Failed to fetch report data. Please try again later.');
        }
    }

    displayLoading() {
        // Show loading state in stats and table
        this.reportStats.innerHTML = '<div class="loading-indicator">Loading stats...</div>';
        this.reportTable.innerHTML = '<tr><td colspan="5" class="loading-indicator">Loading data...</td></tr>';
    }

    displayReportData(reportType, data) {
        // Display overall stats cards
        this.displayStatsCards(data.summary);

        // Display detailed data table
        this.displayDetailsTable(reportType, data.details);
    }

    displayStatsCards(summaryData) {
        let statsHTML = '';

        // Create a stat card for each summary metric
        for (const [key, value] of Object.entries(summaryData)) {
            const label = this.formatStatLabel(key);
            statsHTML += `
                <div class="stat-card">
                    <div class="stat-value">${value}</div>
                    <div class="stat-label">${label}</div>
                </div>
            `;
        }

        this.reportStats.innerHTML = statsHTML;
    }

    formatStatLabel(key) {
        // Convert camelCase or snake_case to Title Case With Spaces
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    displayDetailsTable(reportType, detailsData) {
        // Determine table columns based on report type
        let columns = this.getTableColumns(reportType);

        // Create table header
        let tableHTML = `
            <thead>
                <tr>
                    ${columns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        // Create table rows
        if (detailsData.length === 0) {
            tableHTML += `<tr><td colspan="${columns.length}" class="no-data">No data available for the selected period</td></tr>`;
        } else {
            for (const row of detailsData) {
                tableHTML += `
                    <tr>
                        ${columns.map(col => `<td>${row[col.key] !== undefined ? row[col.key] : 'N/A'}</td>`).join('')}
                    </tr>
                `;
            }
        }

        tableHTML += '</tbody>';
        this.reportTable.innerHTML = tableHTML;
    }

    getTableColumns(reportType) {
        // Define columns for each report type
        const columnSets = {
            'daily-report': [
                { key: 'category_name', label: 'Category' },
                { key: 'views', label: 'Views' },
                { key: 'bookings', label: 'Bookings' },
                { key: 'conversion_rate', label: 'Conversion Rate' }
            ],
            'weekly-report': [
                { key: 'category_name', label: 'Category' },
                { key: 'week', label: 'Week' },
                { key: 'views', label: 'Views' },
                { key: 'bookings', label: 'Bookings' },
                { key: 'revenue', label: 'Revenue ($)' }
            ],
            'monthly-report': [
                { key: 'category_name', label: 'Category' },
                { key: 'month', label: 'Month' },
                { key: 'views', label: 'Views' },
                { key: 'bookings', label: 'Bookings' },
                { key: 'revenue', label: 'Revenue ($)' },
                { key: 'growth', label: 'Growth (%)' }
            ]
        };

        return columnSets[reportType] || columnSets['daily-report'];
    }

    showError(message) {
        if (this.errorContainer) {
            this.errorContainer.textContent = message;
            this.errorContainer.style.display = 'block';

            // Hide after 5 seconds
            setTimeout(() => {
                this.errorContainer.style.display = 'none';
            }, 5000);
        }
    }

    // Mock data generation for testing
    async getMockReportData(reportType, startDate, endDate) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Get list of categories to use in mock data
        const categoryNames = this.categories.length > 0
            ? this.categories.map(cat => cat.category_name)
            : ['Residential Cleaning', 'Commercial Cleaning', 'Carpet Cleaning', 'Window Cleaning', 'Deep Cleaning'];

        let details = [];
        let summary = {};

        switch (reportType) {
            case 'daily-report':
                details = this.generateDailyReportData(categoryNames);
                summary = {
                    totalViews: details.reduce((sum, item) => sum + item.views, 0),
                    totalBookings: details.reduce((sum, item) => sum + item.bookings, 0),
                    avgConversionRate: (details.reduce((sum, item) => sum + parseFloat(item.conversion_rate), 0) / details.length).toFixed(2) + '%',
                    topCategory: details.sort((a, b) => b.bookings - a.bookings)[0].category_name
                };
                break;

            case 'weekly-report':
                details = this.generateWeeklyReportData(categoryNames, startDate, endDate);
                summary = {
                    totalViews: details.reduce((sum, item) => sum + item.views, 0),
                    totalBookings: details.reduce((sum, item) => sum + item.bookings, 0),
                    totalRevenue: '$' + details.reduce((sum, item) => sum + item.revenue, 0).toFixed(2),
                    topWeek: details.sort((a, b) => b.bookings - a.bookings)[0].week
                };
                break;

            case 'monthly-report':
                details = this.generateMonthlyReportData(categoryNames, startDate, endDate);
                summary = {
                    totalViews: details.reduce((sum, item) => sum + item.views, 0),
                    totalBookings: details.reduce((sum, item) => sum + item.bookings, 0),
                    totalRevenue: '$' + details.reduce((sum, item) => sum + item.revenue, 0).toFixed(2),
                    avgGrowth: (details.reduce((sum, item) => sum + parseFloat(item.growth), 0) / details.length).toFixed(2) + '%'
                };
                break;
        }

        return { details, summary };
    }

    generateDailyReportData(categories) {
        return categories.map(category => ({
            category_name: category,
            views: Math.floor(Math.random() * 100) + 10,
            bookings: Math.floor(Math.random() * 20) + 1,
            conversion_rate: (Math.random() * 15 + 5).toFixed(2) + '%' // Between 5% and 20%
        }));
    }

    generateWeeklyReportData(categories, startDate, endDate) {
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

        const result = [];
        for (const category of categories) {
            for (const week of weeks) {
                result.push({
                    category_name: category,
                    week: week,
                    views: Math.floor(Math.random() * 300) + 50,
                    bookings: Math.floor(Math.random() * 40) + 5,
                    revenue: parseFloat((Math.random() * 2000 + 500).toFixed(2))
                });
            }
        }

        return result;
    }

    generateMonthlyReportData(categories, startDate, endDate) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June'];

        const result = [];
        for (const category of categories) {
            for (const month of months) {
                result.push({
                    category_name: category,
                    month: month,
                    views: Math.floor(Math.random() * 1000) + 200,
                    bookings: Math.floor(Math.random() * 150) + 20,
                    revenue: parseFloat((Math.random() * 8000 + 1000).toFixed(2)),
                    growth: (Math.random() * 30 - 10).toFixed(2) + '%' // Between -10% and +20%
                });
            }
        }

        return result;
    }
}