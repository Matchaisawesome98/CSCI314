-- Create the database for all user info
CREATE DATABASE IF NOT EXISTS users;

-- Use this database
USE users;

-- Create the user_accounts table
CREATE TABLE IF NOT EXISTS user_accounts (
                                             user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    roles VARCHAR(20) DEFAULT 'home_owner'
    );

-- Add unique constraint on first_name and last_name
ALTER TABLE user_accounts
    ADD CONSTRAINT uc_person UNIQUE(first_name, last_name);

-- Create the categories table
CREATE TABLE IF NOT EXISTS categories (
                                          category_code VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Create the listings table
CREATE TABLE IF NOT EXISTS listings (
                                        listing_id INT AUTO_INCREMENT PRIMARY KEY,
                                        title VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2),
    image_path VARCHAR(255),
    user_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
    FOREIGN KEY (category_name) REFERENCES categories(category_name) ON DELETE SET NULL
    );

-- Create shortlisted_listings table
CREATE TABLE IF NOT EXISTS shortlisted_listings (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    user_id VARCHAR(20) NOT NULL,
    listing_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_shortlist (user_id, listing_id),
    FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id)
    );

-- Create listing_views table
CREATE TABLE IF NOT EXISTS listing_views (
                                             id INT AUTO_INCREMENT PRIMARY KEY,
                                             listing_id INT NOT NULL,
                                             viewer_id VARCHAR(20), -- Can be NULL for anonymous views
    view_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(255), -- Optional: Store browser/device info
    view_source VARCHAR(50) DEFAULT 'homepage', -- Where the view came from
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    FOREIGN KEY (viewer_id) REFERENCES user_accounts(user_id)
    );

-- Create indexes for listing_views
CREATE INDEX idx_listing_views_date ON listing_views(view_date);
CREATE INDEX idx_listing_views_listing ON listing_views(listing_id);

-- Create service_bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
                                                booking_id INT AUTO_INCREMENT PRIMARY KEY,
                                                user_id VARCHAR(20) NOT NULL,
    listing_id INT NOT NULL,
    provider_id VARCHAR(20) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status ENUM('pending_approval', 'approved', 'completed', 'cancelled') DEFAULT 'pending_approval',
    FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    FOREIGN KEY (provider_id) REFERENCES user_accounts(user_id)
    );

-- Create indexes for service_bookings
CREATE INDEX idx_bookings_user ON service_bookings(user_id);
CREATE INDEX idx_bookings_provider ON service_bookings(provider_id);
CREATE INDEX idx_bookings_listing ON service_bookings(listing_id);
CREATE INDEX idx_bookings_status ON service_bookings(status);

-- Create views for analytics
CREATE OR REPLACE VIEW daily_listing_views AS
SELECT
    listing_id,
    DATE(view_date) as view_day,
    COUNT(*) as daily_views
FROM
    listing_views
GROUP BY
    listing_id, DATE(view_date);

CREATE OR REPLACE VIEW weekly_listing_views AS
SELECT
    listing_id,
    CONCAT(YEAR(view_date), '-W', WEEK(view_date)) as year_week,
    COUNT(*) as weekly_views
FROM
    listing_views
GROUP BY
    listing_id, YEAR(view_date), WEEK(view_date);

CREATE OR REPLACE VIEW monthly_listing_views AS
SELECT
    listing_id,
    EXTRACT(YEAR FROM view_date) as year_part,
    EXTRACT(MONTH FROM view_date) as month_part,
    COUNT(*) as monthly_views
FROM
    listing_views
GROUP BY
    listing_id, EXTRACT(YEAR FROM view_date), EXTRACT(MONTH FROM view_date);

-- Drop the procedure if it already exists
DROP PROCEDURE IF EXISTS populate_user_accounts;

DELIMITER //
CREATE PROCEDURE populate_user_accounts()
BEGIN
    DECLARE i INT DEFAULT 1;

    -- Create temporary tables for name data
    CREATE TEMPORARY TABLE first_names (name VARCHAR(50));
INSERT INTO first_names VALUES
                            ('James'), ('Mary'), ('John'), ('Patricia'), ('Robert'), ('Jennifer'), ('Michael'), ('Linda'),
                            ('William'), ('Elizabeth'), ('David'), ('Barbara'), ('Richard'), ('Susan'), ('Joseph'), ('Jessica'),
                            ('Thomas'), ('Sarah'), ('Charles'), ('Karen'), ('Christopher'), ('Nancy'), ('Daniel'), ('Lisa'),
                            ('Matthew'), ('Betty'), ('Anthony'), ('Margaret'), ('Mark'), ('Sandra'), ('Donald'), ('Ashley'),
                            ('Steven'), ('Kimberly'), ('Paul'), ('Emily'), ('Andrew'), ('Donna'), ('Joshua'), ('Michelle'),
                            ('Kenneth'), ('Dorothy'), ('Kevin'), ('Carol'), ('Brian'), ('Amanda'), ('George'), ('Melissa'),
                            ('Edward'), ('Deborah'), ('Ronald'), ('Stephanie');

CREATE TEMPORARY TABLE last_names (name VARCHAR(50));
INSERT INTO last_names VALUES
                           ('Smith'), ('Johnson'), ('Williams'), ('Brown'), ('Jones'), ('Garcia'), ('Miller'), ('Davis'),
                           ('Rodriguez'), ('Martinez'), ('Hernandez'), ('Lopez'), ('Gonzalez'), ('Wilson'), ('Anderson'), ('Thomas'),
                           ('Taylor'), ('Moore'), ('Jackson'), ('Martin'), ('Lee'), ('Perez'), ('Thompson'), ('White'),
                           ('Harris'), ('Sanchez'), ('Clark'), ('Ramirez'), ('Lewis'), ('Robinson'), ('Walker'), ('Young'),
                           ('Allen'), ('King'), ('Wright'), ('Scott'), ('Torres'), ('Nguyen'), ('Hill'), ('Flores'),
                           ('Green'), ('Adams'), ('Nelson'), ('Baker'), ('Hall'), ('Rivera'), ('Campbell'), ('Mitchell'),
                           ('Carter'), ('Roberts'), ('Gomez'), ('Phillips'), ('Evans'), ('Turner'), ('Diaz'), ('Parker');

-- Insert 50 users
WHILE i <= 50 DO
        -- Format numbers with leading zeros for 01-09
        SET @user_num = LPAD(i, 2, '0');
        -- Get random names
        SET @first = (SELECT name FROM first_names ORDER BY RAND() LIMIT 1);
        SET @last = (SELECT name FROM last_names ORDER BY RAND() LIMIT 1);

        -- Insert the record
INSERT INTO user_accounts (user_id, email, password, first_name, last_name)
VALUES (
           CONCAT('user', @user_num),
           CONCAT('email', @user_num, '@gmail.com'),
           CONCAT('password', @user_num),
           @first,
           @last
       );

SET i = i + 1;
END WHILE;

    -- Set user roles
UPDATE user_accounts
SET roles = 'user_admin'
WHERE user_id IN ('user01', 'user02', 'user03', 'user04', 'user05');

UPDATE user_accounts
SET roles = 'home_cleaner'
WHERE user_id IN ('user06', 'user07', 'user08', 'user09', 'user10');

UPDATE user_accounts
SET roles = 'platform_manager'
WHERE user_id IN ('user11', 'user12', 'user13', 'user14', 'user15');

-- Clean up temporary tables
DROP TEMPORARY TABLE IF EXISTS first_names;
    DROP TEMPORARY TABLE IF EXISTS last_names;
END //
DELIMITER ;

CALL populate_user_accounts();