import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// In-memory fallback dataset matching the institutional reference design
export const mockData = {
  // Authorized institutional records for registration validation
  authorizedRecords: [
    { type: 'student', id: '4HG22CS045', name: 'Nithin A', dept: 'Computer Science & Engineering', email: 'nithin@gechassan.ac.in' },
    { type: 'student', id: '4HG22CS010', name: 'Ananya Sharma', dept: 'Computer Science & Engineering', email: 'ananya@gechassan.ac.in' },
    { type: 'student', id: '4HG22EC018', name: 'Praveen Kumar', dept: 'Electronics & Communication', email: 'praveen@gechassan.ac.in' },
    { type: 'student', id: '4HG22ME025', name: 'Darshan Gowda', dept: 'Mechanical Engineering', email: 'darshan@gechassan.ac.in' },
    { type: 'student', id: '4HG22CV008', name: 'Kavya R', dept: 'Civil Engineering', email: 'kavya@gechassan.ac.in' },
    { type: 'faculty', id: 'GEC-FAC-101', name: 'Dr. Baby H.T.', dept: 'Computer Science & Engineering', email: 'babyht@gechassan.ac.in' },
    { type: 'faculty', id: 'GEC-FAC-102', name: 'Prof. Ramesh K', dept: 'Electronics & Communication', email: 'rameshk@gechassan.ac.in' },
    { type: 'faculty', id: 'GEC-FAC-103', name: 'Dr. Manjunath B', dept: 'Mechanical Engineering', email: 'manjunath@gechassan.ac.in' },
    { type: 'faculty', id: 'GEC-FAC-104', name: 'Prof. Sowmya V', dept: 'Civil Engineering', email: 'sowmya@gechassan.ac.in' }
  ],
  users: [
    {
      id: 1,
      full_name: "Nithin A",
      usn_or_id: "4HG22CS045",
      email: "nithin@gechassan.ac.in",
      phone: "9845012345",
      // Bcrypt hash for password: 'Campus@360'
      password_hash: "$2a$10$.a11BXiNvIqM2sUvJT1Rheq9CrBcawlcyyERXuN.lXFI9Y.i9mPP.",
      role: "student",
      department: "Computer Science & Engineering",
      semester: "5th Sem",
      status: "active"
    },
    {
      id: 2,
      full_name: "Dr. Baby H.T.",
      usn_or_id: "GEC-FAC-101",
      email: "babyht@gechassan.ac.in",
      phone: "9845054321",
      // Bcrypt hash for password: 'Faculty@360'
      password_hash: "$2a$10$vPciga.dGKWvlBUYET/pseibIIhpAG5AGoRs03DUciuB.6mvm1qQS",
      role: "faculty",
      department: "Computer Science & Engineering",
      semester: null,
      status: "active"
    },
    {
      id: 3,
      full_name: "College Administrator",
      usn_or_id: "admin@gechassan.ac.in",
      email: "admin@gechassan.ac.in",
      phone: "9845099999",
      // Bcrypt hash for password: 'Admin@Campus360'
      password_hash: "$2a$10$qTVzLYRhWINBkBCCTC7s3OYuSJWd3xEprP9wLwA6JUuKY0AfCOgfq",
      role: "admin",
      department: "College Administration",
      semester: null,
      status: "active"
    }
  ],
  stats: {
    buildings: 12,
    classrooms: 48,
    labs: 6,
    canteens: 1
  },
  destinations: [
    { id: 1, name: "Principal Room", category: "Office", building: "Main Admin Block", floor: "Ground Floor", distance: "45 m", time: "1 min", lat: 12.8845, lng: 76.1664 },
    { id: 2, name: "HOD - CSE", category: "HOD Chamber", building: "Academic Block A", floor: "1st Floor", distance: "90 m", time: "1.5 min", lat: 12.8848, lng: 76.1667 },
    { id: 3, name: "Lab - 1 (CSE Block)", category: "Laboratory", building: "CSE Block", floor: "Ground Floor", distance: "120 m", time: "2 min", lat: 12.8851, lng: 76.1670 },
    { id: 4, name: "Lab - 2", category: "Laboratory", building: "CSE Block", floor: "1st Floor", distance: "135 m", time: "2.5 min", lat: 12.8852, lng: 76.1671 },
    { id: 5, name: "Classroom 201", category: "Classroom", building: "Academic Block B", floor: "2nd Floor", distance: "160 m", time: "3 min", lat: 12.8842, lng: 76.1669 },
    { id: 6, name: "Central Library", category: "Library", building: "Library & Digital Wing", floor: "Ground Floor", distance: "80 m", time: "1.5 min", lat: 12.8840, lng: 76.1662 },
    { id: 7, name: "Campus Canteen", category: "Canteen", building: "Cafeteria Block", floor: "Ground Floor", distance: "210 m", time: "3.5 min", lat: 12.8837, lng: 76.1675 },
    { id: 8, name: "Boys Washroom", category: "Facility", building: "Block A & B", floor: "Each Floor", distance: "30 m", time: "0.5 min", lat: 12.8846, lng: 76.1665 },
    { id: 9, name: "Girls Washroom", category: "Facility", building: "Block A & B", floor: "Each Floor", distance: "35 m", time: "0.5 min", lat: 12.8847, lng: 76.1666 }
  ],
  lostFound: [
    {
      id: 1,
      title: "Black Backpack",
      category: "Personal Items",
      date_reported: "02 Nov 2026",
      location: "Library Reading Hall",
      image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80",
      description: "Black waterproof Wildcraft backpack with engineering notebook inside.",
      status: "found"
    },
    {
      id: 2,
      title: "College ID Card",
      category: "ID Cards & Docs",
      date_reported: "01 Nov 2026",
      location: "CSE Lab - 1",
      image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80",
      description: "VTU Smart ID card belonging to 5th semester CSE student.",
      status: "found"
    },
    {
      id: 3,
      title: "Smart Watch",
      category: "Electronics",
      date_reported: "30 Oct 2026",
      location: "Seminar Hall Lobby",
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
      description: "Noise ColorFit dark titanium smart watch with black silicon strap.",
      status: "found"
    },
    {
      id: 4,
      title: "Black Frame Spectacles",
      category: "Personal Items",
      date_reported: "28 Oct 2026",
      location: "Canteen Counter 2",
      image_url: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=400&q=80",
      description: "Matte black rectangular specs left on tray counter table.",
      status: "found"
    }
  ],
  canteenMenu: [
    {
      id: 1,
      name: "Idli (2 pcs)",
      category: "Breakfast",
      price: 20,
      image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
      is_available: true
    },
    {
      id: 2,
      name: "Masala Dosa",
      category: "Breakfast",
      price: 40,
      image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80",
      is_available: true
    },
    {
      id: 3,
      name: "Special Veg Rice Meal",
      category: "Lunch",
      price: 60,
      image_url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80",
      is_available: true
    },
    {
      id: 4,
      name: "Masala Chai / Tea",
      category: "Beverages",
      price: 10,
      image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
      is_available: true
    },
    {
      id: 5,
      name: "Filter Coffee",
      category: "Beverages",
      price: 15,
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
      is_available: true
    },
    {
      id: 6,
      name: "Vegetable Samosa (2 pcs)",
      category: "Snacks",
      price: 25,
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80",
      is_available: true
    }
  ],
  bookings: [
    {
      id: 101,
      booking_code: "CAN-4821",
      user_name: "Nithin A",
      usn_or_id: "4HG22CS045",
      items: [
        { id: 2, name: "Masala Dosa", price: 40, qty: 1 },
        { id: 4, name: "Masala Chai / Tea", price: 10, qty: 1 }
      ],
      total_amount: 50,
      booking_date: "14 Oct 2026",
      time_slot: "12:30 PM - 01:00 PM",
      status: "confirmed",
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      booking_code: "CAN-9134",
      user_name: "Dr. Baby H.T.",
      usn_or_id: "GEC-FAC-101",
      items: [
        { id: 5, name: "Filter Coffee", price: 15, qty: 2 },
        { id: 6, name: "Vegetable Samosa (2 pcs)", price: 25, qty: 1 }
      ],
      total_amount: 55,
      booking_date: "14 Oct 2026",
      time_slot: "01:00 PM - 01:30 PM",
      status: "confirmed",
      created_at: new Date().toISOString()
    }
  ],
  announcements: [
    {
      id: 1,
      title: "VTU 5th & 7th Semester Examination Schedules Announced",
      category: "Academic",
      author: "Principal Office",
      date: "12 Nov 2026",
      summary: "VTU Belagavi theoretical examinations commence on 18th December. Hall tickets and seating matrices will be distributed through Campus 360 portal."
    },
    {
      id: 2,
      title: "Annual Hackathon & Innovation Expo 2026",
      category: "Innovation",
      author: "CSE Department",
      date: "10 Nov 2026",
      summary: "36-hour Smart Campus AI & IoT Hackathon registration open for all engineering disciplines. Cash prizes and industry mentorship."
    },
    {
      id: 3,
      title: "Canteen Fast-Track Counter Upgraded with NFC Scanners",
      category: "Facilities",
      author: "Canteen Administration",
      date: "08 Nov 2026",
      summary: "Students and Faculty can now present QR codes from Campus 360 for zero-wait kitchen priority dispatch."
    }
  ]
};

let pool = null;

export async function getDbConnection() {
  if (pool) return pool;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_campus_360',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('[MySQL] Connected to MySQL database.');
    return pool;
  } catch (err) {
    console.warn('[MySQL Fallback] Could not connect to MySQL server (' + err.message + '). Using instant zero-friction mock dataset.');
    pool = null;
    return null;
  }
}
