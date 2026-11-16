import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDbConnection, mockData } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || 'smart-campus-360-default-dev-secret-key-gec-hassan';
const SHARED_AUTH_API_URL = process.env.SHARED_AUTH_API_URL || 'http://127.0.0.1:5000';

app.use(cors());
app.use(express.json());

// Initialize DB check
getDbConnection().catch(() => {});

// ==========================================
// SECURITY MIDDLEWARE: JWT Token Authentication
// ==========================================
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Unauthenticated user. Please login to access this resource.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Session expired or invalid security token. Please login again.'
      });
    }
    req.user = user;
    next();
  });
};

// Role-Based Authorization Guard
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This private interface requires ${allowedRoles.join(' or ')} privileges.`
      });
    }
    next();
  };
};

// ==========================================
// 1. AUTHENTICATION & REGISTRATION APIs
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { role, fullName, usn, universityUSN, facultyId, employeeId, email, phone, phoneNumber, department, semester, currentSemester, academicDesignation, designation, password, confirmPassword } = req.body;
  if (role !== 'student' && role !== 'faculty') {
    return res.status(403).json({
      success: false,
      message: 'Only Student and Faculty accounts can be registered publicly. Admin accounts must be assigned privately.'
    });
  }

  const endpoint = role === 'student' ? '/api/students/register' : '/api/faculty/register';
  const payload = {
    fullName,
    email,
    phoneNumber: phoneNumber || phone,
    department,
    password,
    confirmPassword,
    ...(role === 'student'
      ? { universityUSN: universityUSN || usn, currentSemester: currentSemester || semester }
      : { employeeId: employeeId || facultyId, academicDesignation: academicDesignation || designation }),
  };

  try {
    const response = await fetch(`${SHARED_AUTH_API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error(`Shared registration service returned a non-JSON response (${response.status}).`);
      return res.status(502).json({
        success: false,
        message: 'Registration service returned an unexpected response. Restart the Flask auth service and try again.',
      });
    }
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Shared registration service unavailable:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Shared registration service is unavailable. Please try again shortly.',
    });
  }
});

/**
 * STEP 3: Role-Specific User Login
 * Authenticates Student, Faculty, or Admin against database records.
 * Uses bcrypt verification & returns signed JWT token.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, identifier, usnOrId, password } = req.body;
    const loginIdentifier = identifier || usnOrId;

    if (!role || !loginIdentifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide role, identifier, and password.' 
      });
    }

    if (role === 'student' || role === 'faculty') {
      const endpoint = role === 'student' ? '/api/students/login' : '/api/faculty/login';
      const response = await fetch(`${SHARED_AUTH_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password }),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Unsupported account type.' });
    }

    const cleanIdentifier = loginIdentifier.trim();

    // Validation for Student role: Check USN format if identifier looks like a USN
    if (role === 'student') {
      const isUsnCandidate = /^[0-9]/.test(cleanIdentifier) || cleanIdentifier.toUpperCase().startsWith('4');
      if (isUsnCandidate) {
        if (!cleanIdentifier.toUpperCase().startsWith('4HG')) {
          return res.status(400).json({
            success: false,
            message: 'Student USN must start with authorized college code 4HG (e.g. 4HG22CS010).'
          });
        }
        const vtuRegex = /^4HG\d{2}[A-Za-z]{2}\d{3}$/i;
        if (!vtuRegex.test(cleanIdentifier)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Student USN format. Must follow standard VTU pattern (e.g. 4HG22CS010).'
          });
        }
      }
    }

    let matchedUser = null;

    // Check MySQL database first (supports Student Name, USN/ID, or institutional email)
    const pool = await getDbConnection();
    if (pool) {
      try {
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE (LOWER(full_name) = LOWER(?) OR LOWER(usn_or_id) = LOWER(?) OR LOWER(email) = LOWER(?)) AND role = ? LIMIT 1',
          [cleanIdentifier, cleanIdentifier, cleanIdentifier, role]
        );
        if (rows.length > 0) {
          matchedUser = rows[0];
        }
      } catch (err) {
        console.error('MySQL login query error:', err.message);
      }
    }

    // Fallback to in-memory dataset
    if (!matchedUser) {
      matchedUser = mockData.users.find(u => 
        (u.full_name.toLowerCase() === cleanIdentifier.toLowerCase() ||
         u.usn_or_id.toLowerCase() === cleanIdentifier.toLowerCase() ||
         u.email.toLowerCase() === cleanIdentifier.toLowerCase()) &&
        u.role === role
      );
    }

    // If no user found for this role
    if (!matchedUser) {
      return res.status(401).json({
        success: false,
        message: `Authentication Failed: No registered ${role} account found matching identifier "${cleanIdentifier}". Please check your credentials or register first.`
      });
    }

    // Verify hashed password with bcrypt
    const passwordMatch = await bcrypt.compare(password, matchedUser.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Authentication Failed: Invalid password. Please check your credentials.'
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: matchedUser.id,
        name: matchedUser.full_name,
        usnOrId: matchedUser.usn_or_id,
        role: matchedUser.role,
        department: matchedUser.department
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: `${matchedUser.role.toUpperCase()} Login Successful!`,
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.full_name,
        usn: matchedUser.usn_or_id,
        usnOrId: matchedUser.usn_or_id,
        email: matchedUser.email,
        phone: matchedUser.phone,
        role: matchedUser.role,
        department: matchedUser.department,
        semester: matchedUser.semester
      }
    });

  } catch (err) {
    console.error('Login handler error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login authentication.' });
  }
});

/**
 * Forgot Password Endpoint
 * Verifies identifier and returns recovery instructions
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier, role } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide your registered USN, Faculty ID, or Email.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const user = mockData.users.find(u => 
      u.usn_or_id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    ) || mockData.authorizedRecords.find(r => r.id.toLowerCase() === cleanId || r.email?.toLowerCase() === cleanId);

    if (user) {
      const email = user.email || `${cleanId}@gechassan.ac.in`;
      return res.json({
        success: true,
        message: `Password reset verification token dispatched to ${email}. For development testing, your instant OTP is: 360360`,
        testOtp: '360360'
      });
    }

    return res.status(404).json({
      success: false,
      message: `No active institutional record found for "${identifier}". Please register first or verify your USN/Faculty ID.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error processing password recovery.' });
  }
});

/**
 * Current user profile endpoint
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = mockData.users.find(u => u.usn_or_id === req.user.usnOrId) || req.user;
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.full_name || user.name,
      usn: user.usn_or_id || user.usnOrId,
      usnOrId: user.usn_or_id || user.usnOrId,
      email: user.email,
      role: user.role,
      department: user.department,
      semester: user.semester
    }
  });
});

// ==========================================
// 2. DASHBOARD DATA (Protected Endpoints)
// ==========================================

// Global Campus Stats
app.get('/api/stats', (req, res) => {
  res.json({ success: true, stats: mockData.stats });
});

// Student Dashboard Private Endpoint
app.get('/api/dashboard/student', authenticateToken, requireRole(['student']), (req, res) => {
  res.json({
    success: true,
    role: 'student',
    profile: req.user,
    stats: mockData.stats,
    activeBookingsCount: mockData.bookings.filter(b => b.usn_or_id === req.user.usnOrId).length
  });
});

// Faculty Dashboard Private Endpoint
app.get('/api/dashboard/faculty', authenticateToken, requireRole(['faculty', 'admin']), (req, res) => {
  res.json({
    success: true,
    role: 'faculty',
    profile: req.user,
    teachingDepartment: req.user.department || 'Computer Science & Engineering',
    assignedClassrooms: ['Seminar Hall A', 'Lab - 1 (CSE Block)', 'Classroom 201'],
    canteenPriorityActive: true,
    activeVouchers: 2
  });
});

// Admin Dashboard Private Endpoint
app.get('/api/dashboard/admin', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    role: 'admin',
    totalRegisteredUsers: mockData.users.length,
    studentsCount: mockData.users.filter(u => u.role === 'student').length,
    facultyCount: mockData.users.filter(u => u.role === 'faculty').length,
    adminCount: mockData.users.filter(u => u.role === 'admin').length,
    systemIntegrity: 'Optimal (100% Operational)',
    campusLocationsCount: mockData.destinations.length
  });
});

// ==========================================
// 3. CAMPUS NAVIGATION APIs
// ==========================================
app.get('/api/navigation/destinations', (req, res) => {
  res.json({ success: true, destinations: mockData.destinations });
});

app.post('/api/navigation/route', (req, res) => {
  const { startId, destinationId } = req.body;
  const dest = mockData.destinations.find(d => d.id === Number(destinationId)) || mockData.destinations[2];
  res.json({
    success: true,
    route: {
      destination: dest.name,
      building: dest.building,
      floor: dest.floor,
      distance: dest.distance,
      estimatedTime: dest.time,
      coordinates: [
        [12.8844, 76.1663], // Entrance portico
        [12.8846, 76.1665], // Main corridor
        [12.8848, 76.1668], // Department foyer
        [dest.lat, dest.lng] // Target room
      ]
    }
  });
});

// ==========================================
// 4. LOST & FOUND APIs
// ==========================================
app.get('/api/lost-found', (req, res) => {
  const { q } = req.query;
  let items = [...mockData.lostFound];
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(i => 
      i.title.toLowerCase().includes(query) || 
      i.description.toLowerCase().includes(query) || 
      i.location.toLowerCase().includes(query)
    );
  }
  res.json({ success: true, items });
});

app.post('/api/lost-found/report', (req, res) => {
  const { title, category, location, description, image_url } = req.body;
  const newItem = {
    id: Date.now(),
    title: title || 'Reported Item',
    category: category || 'General',
    date_reported: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    location: location || 'Campus Premises',
    image_url: image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    description: description || 'Reported lost/found on campus.',
    status: 'found'
  };
  mockData.lostFound.unshift(newItem);
  res.json({ success: true, message: 'Item reported successfully!', item: newItem });
});

app.post('/api/lost-found/:id/claim', (req, res) => {
  const { id } = req.params;
  const { proofStatement, contactPhone } = req.body;
  const item = mockData.lostFound.find(i => i.id === Number(id));
  if (item) {
    item.status = 'claimed';
    item.claim_proof = proofStatement;
  }
  res.json({ success: true, message: 'Claim submitted successfully! Administration has been notified.' });
});

// ==========================================
// 5. SMART CANTEEN APIs
// ==========================================
app.get('/api/canteen/menu', (req, res) => {
  const { category } = req.query;
  let menu = mockData.canteenMenu;
  if (category && category !== 'All') {
    menu = menu.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }
  res.json({ success: true, menu });
});

app.post('/api/canteen/book', (req, res) => {
  const { items, totalAmount, date, timeSlot, userName, usn } = req.body;
  const bookingCode = `CAN-${Math.floor(1000 + Math.random() * 9000)}`;
  const booking = {
    id: Date.now(),
    booking_code: bookingCode,
    user_name: userName || 'Student',
    usn_or_id: usn || '4HG22CS045',
    items: items || [],
    total_amount: totalAmount || 0,
    booking_date: date || '14 Oct 2026',
    time_slot: timeSlot || '12:30 PM - 01:00 PM',
    status: 'confirmed',
    created_at: new Date().toISOString()
  };
  mockData.bookings.unshift(booking);
  res.json({ success: true, message: 'Canteen slot reserved successfully!', booking });
});

app.get('/api/canteen/bookings', (req, res) => {
  res.json({ success: true, bookings: mockData.bookings });
});

app.post('/api/canteen/refund', (req, res) => {
  const { bookingCode, reason } = req.body;
  const booking = mockData.bookings.find(b => b.booking_code === bookingCode);
  if (booking) {
    booking.status = 'refund_requested';
    booking.refund_reason = reason;
  }
  res.json({ success: true, message: 'Refund request submitted for verification.' });
});

// ==========================================
// 6. ANNOUNCEMENTS & CAMPUS FEEDS
// ==========================================
app.get('/api/announcements', (req, res) => {
  res.json({ success: true, announcements: mockData.announcements || [] });
});

app.post('/api/admin/announcements', authenticateToken, requireRole(['admin']), (req, res) => {
  const { title, category, summary } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Announcement title is required.' });
  }
  const newPost = {
    id: Date.now(),
    title,
    category: category || 'Campus General',
    author: req.user.name || 'Campus 360 Admin',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    summary: summary || ''
  };
  mockData.announcements.unshift(newPost);
  res.json({ success: true, message: 'Announcement published successfully to Campus 360 network.', post: newPost });
});

// ==========================================
// 7. USER MANAGEMENT & ADMIN ROSTER
// ==========================================
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
  const { role, q } = req.query;
  let list = mockData.users.map(u => ({
    id: u.id,
    name: u.full_name,
    identifier: u.usn_or_id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    department: u.department,
    semester: u.semester,
    status: u.status || 'active',
    created_at: u.created_at
  }));

  if (role) {
    list = list.filter(u => u.role === role);
  }
  if (q) {
    const query = q.toLowerCase();
    list = list.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.identifier.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query)
    );
  }

  res.json({ success: true, users: list, total: list.length });
});

app.post('/api/admin/users/:id/status', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = mockData.users.find(u => u.id === Number(id));
  if (user) {
    user.status = status;
    return res.json({ success: true, message: `Account status updated to ${status}.` });
  }
  res.status(404).json({ success: false, message: 'User account not found.' });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out securely. Session ended.' });
});

app.listen(PORT, () => {
  console.log(`[Campus 360 Server] Running on http://localhost:${PORT}`);
});
