-- Campus 360 - Smart Campus Management System
-- Database Schema for Government Engineering College, Mosalehosahalli, Hassan
CREATE DATABASE IF NOT EXISTS smart_campus_360;
USE smart_campus_360;

-- 1. Authorized Institutional Master Records (For validation before activation)
CREATE TABLE IF NOT EXISTS authorized_college_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_type ENUM('student', 'faculty') NOT NULL,
  authorized_id VARCHAR(50) NOT NULL UNIQUE, -- USN or Faculty ID
  expected_full_name VARCHAR(120) NOT NULL,
  expected_department VARCHAR(100) NOT NULL,
  expected_email VARCHAR(120),
  is_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Authorized Master Records
INSERT IGNORE INTO authorized_college_records (record_type, authorized_id, expected_full_name, expected_department, expected_email) VALUES
('student', '4HG22CS045', 'Nithin A', 'Computer Science & Engineering', 'nithin@gechassan.ac.in'),
('student', '4HG22CS010', 'Ananya Sharma', 'Computer Science & Engineering', 'ananya@gechassan.ac.in'),
('student', '4HG22EC018', 'Praveen Kumar', 'Electronics & Communication', 'praveen@gechassan.ac.in'),
('student', '4HG22ME025', 'Darshan Gowda', 'Mechanical Engineering', 'darshan@gechassan.ac.in'),
('student', '4HG22CV008', 'Kavya R', 'Civil Engineering', 'kavya@gechassan.ac.in'),
('faculty', 'GEC-FAC-101', 'Dr. Baby H.T.', 'Computer Science & Engineering', 'babyht@gechassan.ac.in'),
('faculty', 'GEC-FAC-102', 'Prof. Ramesh K', 'Electronics & Communication', 'rameshk@gechassan.ac.in'),
('faculty', 'GEC-FAC-103', 'Dr. Manjunath B', 'Mechanical Engineering', 'manjunath@gechassan.ac.in'),
('faculty', 'GEC-FAC-104', 'Prof. Sowmya V', 'Civil Engineering', 'sowmya@gechassan.ac.in');

-- 2. User Accounts Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  usn_or_id VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'faculty', 'admin') NOT NULL DEFAULT 'student',
  department VARCHAR(100) DEFAULT 'Computer Science & Engineering',
  semester VARCHAR(20) DEFAULT '5th Sem',
  status ENUM('active', 'pending', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed pre-authorized accounts with bcrypt hashes (Password: Campus@360, Faculty@360, Admin@Campus360)
INSERT IGNORE INTO users (full_name, usn_or_id, email, phone, password_hash, role, department, semester, status) VALUES
('Nithin A', '4HG22CS045', 'nithin@gechassan.ac.in', '9845012345', '$2a$10$.a11BXiNvIqM2sUvJT1Rheq9CrBcawlcyyERXuN.lXFI9Y.i9mPP.', 'student', 'Computer Science & Engineering', '5th Sem', 'active'),
('Dr. Baby H.T.', 'GEC-FAC-101', 'babyht@gechassan.ac.in', '9845054321', '$2a$10$vPciga.dGKWvlBUYET/pseibIIhpAG5AGoRs03DUciuB.6mvm1qQS', 'faculty', 'Computer Science & Engineering', NULL, 'active'),
('College Administrator', 'admin@gechassan.ac.in', 'admin@gechassan.ac.in', '9845099999', '$2a$10$qTVzLYRhWINBkBCCTC7s3OYuSJWd3xEprP9wLwA6JUuKY0AfCOgfq', 'admin', 'Administration', NULL, 'active');

-- 3. Campus Locations (Floor plans & Waypoints)
CREATE TABLE IF NOT EXISTS campus_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  building VARCHAR(100) NOT NULL,
  floor VARCHAR(50) DEFAULT 'Ground Floor',
  category VARCHAR(50) DEFAULT 'Classroom',
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  x_coord INT DEFAULT 0,
  y_coord INT DEFAULT 0,
  photo_url VARCHAR(255),
  description TEXT
);

-- 4. Lost & Found
CREATE TABLE IF NOT EXISTS lost_found_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status ENUM('lost', 'found', 'claimed') NOT NULL DEFAULT 'found',
  location VARCHAR(150) NOT NULL,
  date_reported DATE NOT NULL,
  image_url VARCHAR(255),
  description TEXT,
  claimed_by VARCHAR(120),
  claim_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Canteen Items
CREATE TABLE IF NOT EXISTS canteen_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category ENUM('Breakfast', 'Lunch', 'Snacks', 'Beverages') NOT NULL,
  price DECIMAL(8, 2) NOT NULL,
  image_url VARCHAR(255),
  is_available BOOLEAN DEFAULT TRUE,
  stock INT DEFAULT 50
);

-- 6. Canteen Bookings
CREATE TABLE IF NOT EXISTS canteen_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(50) NOT NULL UNIQUE,
  user_name VARCHAR(120) NOT NULL,
  usn_or_id VARCHAR(50) NOT NULL,
  items_json TEXT NOT NULL,
  total_amount DECIMAL(8, 2) NOT NULL,
  booking_date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  status ENUM('confirmed', 'ready', 'collected', 'refund_requested', 'refunded') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
