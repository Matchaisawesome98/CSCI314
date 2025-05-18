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


--Populates the user_accounts table
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

    -- Insert 150 users
    WHILE i <= 150 DO
        -- Format numbers with leading zeros for 001-150
        SET @user_num = LPAD(i, 3, '0');
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

    -- Set user roles: 25 of each special role plus the default role (home_owner)

    -- First 25 users (1-25) as user_admin
    UPDATE user_accounts
    SET roles = 'user_admin'
    WHERE CAST(SUBSTRING(user_id, 5) AS UNSIGNED) BETWEEN 1 AND 25;

    -- Next 25 users (26-50) as home_cleaner
    UPDATE user_accounts
    SET roles = 'home_cleaner'
    WHERE CAST(SUBSTRING(user_id, 5) AS UNSIGNED) BETWEEN 26 AND 50;

    -- Next 25 users (51-75) as platform_manager
    UPDATE user_accounts
    SET roles = 'platform_manager'
    WHERE CAST(SUBSTRING(user_id, 5) AS UNSIGNED) BETWEEN 51 AND 75;

    -- The remaining users (76-150) will keep the default 'home_owner' role

    -- Clean up temporary tables
    DROP TEMPORARY TABLE IF EXISTS first_names;
    DROP TEMPORARY TABLE IF EXISTS last_names;
END //
DELIMITER ;

CALL populate_user_accounts();

//adds a column is suspended in user_accounts default is false
ALTER TABLE user_accounts
ADD COLUMN isSuspended BOOLEAN DEFAULT FALSE;

--POPULATION OF DATABASE

-- Use the users database
USE users;

-- Skip categories population as requested
-- We assume categories already exist in the database

-- Populate listings
DROP PROCEDURE IF EXISTS populate_listings;

DELIMITER //
CREATE PROCEDURE populate_listings()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE total_listings INT DEFAULT 200;
    DECLARE random_user_id VARCHAR(20);
    DECLARE random_category VARCHAR(50);
    DECLARE price_value DECIMAL(10, 2);

    -- Clear existing listings first (because other tables reference this)
    DELETE FROM listing_views;
    DELETE FROM shortlisted_listings;
    DELETE FROM service_bookings;
    DELETE FROM listings;

    -- Generate random listings
    WHILE i <= total_listings DO
        -- Get a random user_id from service providers (home_cleaner) or home_owners
        SELECT user_id INTO random_user_id
        FROM user_accounts
        WHERE roles IN ('home_cleaner', 'home_owner')
        ORDER BY RAND() LIMIT 1;

        -- Get a random category
        SELECT category_name INTO random_category
        FROM categories
        ORDER BY RAND() LIMIT 1;

        -- Generate random price between $25 and $250
        SET price_value = 25 + RAND() * 225;

        -- Insert the listing
        INSERT INTO listings (
            title,
            description,
            price,
            image_path,
            user_id,
            category_name,
            created_at
        ) VALUES (
            CONCAT('Service Listing #', i, ' - ', random_category),
            CONCAT('This is a detailed description for service listing #', i, ' in the category of ', random_category, '. The service is provided by user ', random_user_id, '.'),
            ROUND(price_value, 2),
            CONCAT('/images/listings/', i, '.jpg'),
            random_user_id,
            random_category,
            -- Random date within last 6 months
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY)
        );

        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

-- Populate shortlisted listings
DROP PROCEDURE IF EXISTS populate_shortlisted_listings;

DELIMITER //
CREATE PROCEDURE populate_shortlisted_listings()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE total_shortlists INT DEFAULT 300;
    DECLARE random_user_id VARCHAR(20);
    DECLARE random_listing_id INT;

    -- Clear existing shortlisted_listings
    DELETE FROM shortlisted_listings;

    -- Generate random shortlisted listings
    WHILE i <= total_shortlists DO
        -- Get a random user (home_owner)
        SELECT user_id INTO random_user_id
        FROM user_accounts
        WHERE roles = 'home_owner'
        ORDER BY RAND() LIMIT 1;

        -- Get a random listing
        SELECT listing_id INTO random_listing_id
        FROM listings
        ORDER BY RAND() LIMIT 1;

        -- Insert the shortlisted_listing (with try-catch for unique constraint)
        BEGIN
            DECLARE CONTINUE HANDLER FOR 1062 BEGIN END; -- Ignore duplicate key errors

            INSERT INTO shortlisted_listings (
                user_id,
                listing_id,
                created_at
            ) VALUES (
                random_user_id,
                random_listing_id,
                -- Random date within last 3 months
                DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 90) DAY)
            );
        END;

        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

-- Populate service bookings (all completed)
DROP PROCEDURE IF EXISTS populate_service_bookings;

DELIMITER //
CREATE PROCEDURE populate_service_bookings()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE total_bookings INT DEFAULT 400;
    DECLARE random_user_id VARCHAR(20);
    DECLARE random_listing_id INT;
    DECLARE random_provider_id VARCHAR(20);
    DECLARE booking_date_value TIMESTAMP;
    DECLARE scheduled_date_value DATE;
    DECLARE scheduled_time_value TIME;

    -- Clear existing service_bookings
    DELETE FROM service_bookings;

    -- Generate random service bookings
    WHILE i <= total_bookings DO
        -- Get a random user (home_owner)
        SELECT user_id INTO random_user_id
        FROM user_accounts
        WHERE roles = 'home_owner'
        ORDER BY RAND() LIMIT 1;

        -- Get a random listing
        SELECT listing_id, user_id INTO random_listing_id, random_provider_id
        FROM listings
        ORDER BY RAND() LIMIT 1;

        -- Generate random booking date (within last 3 months)
        SET booking_date_value = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 90) DAY);

        -- Scheduled date is 1-14 days after booking
        SET scheduled_date_value = DATE_ADD(booking_date_value, INTERVAL FLOOR(1 + RAND() * 14) DAY);

        -- Random time between 8 AM and 6 PM
        SET scheduled_time_value = MAKETIME(FLOOR(8 + RAND() * 10), FLOOR(RAND() * 60), 0);

        -- Insert the service booking
        INSERT INTO service_bookings (
            user_id,
            listing_id,
            provider_id,
            booking_date,
            scheduled_date,
            scheduled_time,
            status
        ) VALUES (
            random_user_id,
            random_listing_id,
            random_provider_id,
            booking_date_value,
            scheduled_date_value,
            scheduled_time_value,
            'completed'  -- All set to completed as requested
        );

        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

-- Create a master procedure to run all population procedures
DROP PROCEDURE IF EXISTS populate_all_data;

DELIMITER //
CREATE PROCEDURE populate_all_data()
BEGIN
    -- CALL populate_categories(); -- Skipped as requested
    CALL populate_listings();
    CALL populate_shortlisted_listings();
    CALL populate_service_bookings();

    -- Print summary
    SELECT 'Database population complete!' AS message;
    SELECT 'Listings created:' AS table_name, COUNT(*) AS record_count FROM listings
    UNION ALL
    SELECT 'Shortlisted listings created:', COUNT(*) FROM shortlisted_listings
    UNION ALL
    SELECT 'Service bookings created:', COUNT(*) FROM service_bookings;
END //
DELIMITER ;

-- Run all population procedures
CALL populate_all_data();