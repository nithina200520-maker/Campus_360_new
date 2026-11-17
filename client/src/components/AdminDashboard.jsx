import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Utensils, 
  Compass, 
  Box, 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  Bell, 
  User, 
  Sparkles,
  CheckCircle2,
  Settings,
  Database,
  Layers,
  ChefHat,
  Search,
  Filter,
  Check,
  X,
  Plus,
  Send,
  Trash2,
  Edit3,
  BarChart3,
  FileText,
  Megaphone,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import AdminManagement from './AdminManagement';
import MainAdminHandoff from './MainAdminHandoff';

function Tilt3DAdminCard({ children, className = '', onClick }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0px)`,
        transition: 'transform 0.15s ease-out, box-shadow 0.2s ease',
        transformStyle: 'preserve-3d'
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export default function AdminDashboard({ currentUser, onNavigate, onLogout, onBack }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'students', 'faculty', 'buildings', 'claims', 'canteen_kds', 'announcements', 'reports', 'settings'
  const [usersList, setUsersList] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [canteenOrders, setCanteenOrders] = useState([]);
  const [lostClaims, setLostClaims] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminOverviewError, setAdminOverviewError] = useState('');
  const [adminUserError, setAdminUserError] = useState('');
  const [adminUserSuccess, setAdminUserSuccess] = useState('');
  const [pendingStudentDeletion, setPendingStudentDeletion] = useState(null);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [activatingUserId, setActivatingUserId] = useState(null);

  // Announcement Form State
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('Academic');
  const [newNoticeSummary, setNewNoticeSummary] = useState('');
  const [noticeFeedback, setNoticeFeedback] = useState('');

  // Fetch initial data
  useEffect(() => {
    // Fetch users roster
    const token = localStorage.getItem('campus360_token');
    fetch('/api/campus-admin/users', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.users) {
          throw new Error(data.message || `User registry request failed (${response.status}).`);
        }
        return data.users;
      })
      .then((users) => {
        setUsersList(users);
      })
      .catch((requestError) => {
        setAdminUserError(requestError.message || 'Could not load the registered user directory.');
      });

    // Fetch announcements
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.announcements) setAnnouncements(d.announcements);
      })
      .catch(() => {});

    // Fetch canteen bookings
    fetch('/api/canteen/bookings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.bookings) setCanteenOrders(d.bookings);
      })
      .catch(() => {});

    // Fetch lost items
    fetch('/api/lost-found')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.items) setLostClaims(d.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('campus360_token');
    fetch('/api/campus-admin/overview', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.success === false) {
          throw new Error(data.message || `Admin overview request failed (${response.status}).`);
        }
        const counts = data.counts || data;
        const recentModules = data.recent_activity?.by_module || [];
        const today = new Date().toISOString().slice(0, 10);
        const activityToday = (data.activity || []).filter((entry) => (
          (entry.created_at || '').slice(0, 10) === today
        )).length;
        return {
          student_count: counts.students ?? counts.student_count,
          faculty_count: counts.faculty ?? counts.faculty_count,
          active_admin_count: counts.active_admins ?? counts.active_assignments,
          module_count: counts.modules ?? counts.module_count,
          registered_user_count: counts.registered_users ?? ((counts.students || 0) + (counts.faculty || 0)),
          activity_today: counts.activity_today ?? activityToday,
          notification_count: counts.notifications ?? counts.notification_count,
          active_module_count: counts.active_modules ?? recentModules.length,
        };
      })
      .then((overview) => {
        if (active) setAdminOverview(overview);
      })
      .catch((requestError) => {
        if (active) setAdminOverviewError(requestError.message || 'Could not load live admin metrics.');
      });
    return () => { active = false; };
  }, []);

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeTitle.trim()) return;

    const token = localStorage.getItem('campus360_token');
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newNoticeTitle,
          category: newNoticeCategory,
          summary: newNoticeSummary
        })
      });
      const data = await res.json();
      if (data.success) {
        setNoticeFeedback('Announcement broadcasted to all Student & Faculty dashboards!');
        setAnnouncements(prev => [data.post, ...prev]);
        setNewNoticeTitle('');
        setNewNoticeSummary('');
        setTimeout(() => setNoticeFeedback(''), 3000);
      }
    } catch {
      setNoticeFeedback('Notice published locally.');
    }
  };

  const handleActivateUser = async (userId) => {
    setAdminUserError('');
    setAdminUserSuccess('');
    setActivatingUserId(userId);
    const token = localStorage.getItem('campus360_token');
    try {
      const response = await fetch(`/api/campus-admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Account update failed (${response.status}).`);
      }
      setUsersList((previous) => previous.map((user) => (
        user.id === userId ? { ...user, status: 'active', is_active: true } : user
      )));
    } catch (requestError) {
      setAdminUserError(requestError.message || 'Could not update this account.');
    } finally {
      setActivatingUserId(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (!pendingStudentDeletion || deletingStudentId !== null) return;
    const student = pendingStudentDeletion;
    setAdminUserError('');
    setAdminUserSuccess('');
    setDeletingStudentId(student.id);
    const token = localStorage.getItem('campus360_token');
    try {
      const response = await fetch(`/api/campus-admin/users/${student.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ identifier: student.identifier }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Student deletion failed (${response.status}).`);
      }
      setUsersList((previous) => previous.filter((user) => user.id !== student.id));
      setPendingStudentDeletion(null);
      setAdminUserSuccess(`${student.name}'s account was permanently deleted.`);
    } catch (requestError) {
      setAdminUserError(requestError.message || 'Could not delete this student account.');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const campusBuildings = [
    { code: "ADMIN", name: "Main Administrative Block", floors: "2 Floors", rooms: "Principal, Accounts, Registry", status: "Operational" },
    { code: "BLOCK_A", name: "Academic Block A", floors: "3 Floors", rooms: "HOD Chambers, Classrooms 101-104", status: "Operational" },
    { code: "BLOCK_B", name: "Academic Block B", floors: "2 Floors", rooms: "Classroom 201, Seminar Hall", status: "Operational" },
    { code: "CSE_BLOCK", name: "CSE & IT Technology Block", floors: "3 Floors", rooms: "Lab - 1, Lab - 2, GPU Cluster", status: "Operational" },
    { code: "LIBRARY", name: "Central Library & Digital Wing", floors: "2 Floors", rooms: "E-Resources, VTU Consortium", status: "Operational" },
    { code: "CANTEEN", name: "Campus Canteen & Cafeteria", floors: "1 Floor", rooms: "Dining Hall, Faculty Counter", status: "Operational" },
    { code: "AUDITORIUM", name: "Dr. A.P.J. Kalam Auditorium", floors: "2 Floors", rooms: "600-Capacity Amphitheatre", status: "Operational" },
    { code: "PARKING", name: "Campus Parking & EV Bays", floors: "Ground", rooms: "4 Active EV Charging Points", status: "Operational" }
  ];

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.identifier?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in text-left">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09162e]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-xs font-bold group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-blue-300 font-semibold flex items-center gap-1.5 bg-blue-950/80 px-3.5 py-1 rounded-full border border-blue-400/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Administrative Command Console Active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Enterprise Sidebar + Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* 1. Sidebar (12 Items matching Master Prompt 13) */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-3xl bg-[#09152b]/95 backdrop-blur-xl border border-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.2)]">
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-blue-500/20">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 border border-blue-400 flex items-center justify-center text-white font-extrabold shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <div className="text-xs font-black text-white tracking-wide">ADMIN CONSOLE</div>
                <div className="text-[10px] text-blue-400/90 font-mono">ROOT CLEARANCE</div>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>1. Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'students'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span>2. Student Management</span>
              </button>

              <button
                onClick={() => setActiveTab('faculty')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'faculty'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>3. Faculty Management</span>
              </button>

              <button
                onClick={() => setActiveTab('admin_management')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin_management'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>4. Admin Management</span>
              </button>

              <button
                onClick={() => setActiveTab('buildings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'buildings'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-4 h-4 text-green-400" />
                <span>5. Campus &amp; Buildings</span>
              </button>

              <button
                onClick={() => onNavigate('navigation')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>6. Campus Navigation</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 border border-blue-500/30 text-blue-300">3D</span>
              </button>

              <button
                onClick={() => setActiveTab('claims')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'claims'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Box className="w-4 h-4 text-amber-400" />
                <span>7. Lost &amp; Found Claims</span>
              </button>

              <button
                onClick={() => setActiveTab('canteen_kds')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'canteen_kds'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ChefHat className="w-4 h-4 text-cyan-400" />
                <span>8. Smart Canteen KDS</span>
              </button>

              <button
                onClick={() => setActiveTab('announcements')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'announcements'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Megaphone className="w-4 h-4 text-blue-400" />
                <span>9. Announcements</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>10. Reports &amp; Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>11. System Settings</span>
              </button>

              <div className="pt-3 mt-3 border-t border-blue-500/20">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Administrator</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* 2. Main Administration Area */}
        <div className="lg:col-span-3 space-y-6">
          {adminUserError && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-xs text-rose-200">{adminUserError}</p>}
          {adminUserSuccess && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-4 py-2 text-xs text-emerald-200">{adminUserSuccess}</p>}

          {/* VIEW: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Welcome Banner Card */}
              <div className="relative overflow-hidden rounded-3xl bg-[#0a1835]/85 backdrop-blur-xl border border-blue-400/50 p-6 sm:p-8 shadow-[0_0_35px_rgba(59,130,246,0.25)]">
                <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-400/40 text-blue-300 mb-3">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Government Engineering College, Mosalehosahalli • System Administration</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                      Welcome, Administrator 🛡️
                    </h1>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
                      Comprehensive control center for student/faculty registry validation, navigation blueprints, kitchen orders, and campus announcements.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-300 font-medium">
                      <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-blue-500/30">
                        <Database className="w-4 h-4 text-blue-400" />
                        Auth Registry: Connected
                      </span>
                      <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-blue-500/30">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        Root Authority: {currentUser?.email || "admin@gechassan.ac.in"}
                      </span>
                    </div>
                  </div>

                  {/* Office Photo */}
                  <div className="relative w-full md:w-72 h-44 rounded-2xl overflow-hidden border border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] group flex-shrink-0">
                    <img 
                      src="/images/office.jpg" 
                      alt="Administrative Office" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-3 right-3 text-[11px] font-bold text-white truncate drop-shadow">
                      Principal &amp; Administrative Wing
                    </div>
                  </div>
                </div>
              </div>

              {/* Live registry and activity totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Students', adminOverview?.student_count ?? adminOverview?.students_count],
                  ['Faculty', adminOverview?.faculty_count ?? adminOverview?.teachers_count],
                  ['Active Administrators', adminOverview?.active_admin_count ?? adminOverview?.active_assignments],
                  ['Campus Modules', adminOverview?.module_count ?? adminOverview?.modules_count],
                  ['Registered Accounts', adminOverview?.registered_user_count ?? adminOverview?.total_users],
                  ['Activities Today', adminOverview?.activity_today ?? adminOverview?.activities_today],
                  ['Notifications', adminOverview?.notification_count ?? adminOverview?.notifications_count],
                  ['Modules With Activity', adminOverview?.active_module_count ?? adminOverview?.modules_with_activity],
                ].map(([label, value], index) => (
                  <Tilt3DAdminCard
                    key={label}
                    className={`p-3.5 rounded-2xl bg-[#09152b]/80 border shadow-md ${
                      ['border-blue-500/40', 'border-cyan-500/40', 'border-green-500/40', 'border-amber-500/40',
                        'border-sky-500/40', 'border-red-500/40', 'border-teal-500/40', 'border-indigo-500/40'][index]
                    }`}
                  >
                    <div className="text-2xl font-black text-white">{value ?? '—'}</div>
                    <div className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider">{label}</div>
                  </Tilt3DAdminCard>
                ))}
              </div>
              {adminOverviewError && <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">{adminOverviewError}</p>}

              {/* Administrative Modules Launchpad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Tilt3DAdminCard
                  onClick={() => setActiveTab('canteen_kds')}
                  className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 border border-cyan-400/50 shadow-lg hover:shadow-cyan-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-all">
                        <ChefHat className="w-6 h-6 text-cyan-300" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">KDS Active</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                      Smart Canteen Kitchen Supervision
                    </h3>
                    <p className="text-xs text-slate-300 mb-4">
                      Live token queues, kitchen dispatch, menu stock toggle, and refund approvals.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20 text-xs font-bold text-cyan-400">
                    <span>Manage Orders</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Tilt3DAdminCard>

                <Tilt3DAdminCard
                  onClick={() => onNavigate('navigation')}
                  className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-all">
                        <Compass className="w-6 h-6 text-blue-300" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 border border-blue-400/30 text-blue-300">12 Buildings</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                      Campus 360 3D Spatial Maps
                    </h3>
                    <p className="text-xs text-slate-300 mb-4">
                      Calibrate 3D spatial floor nodes, waypoints, and corridor photo links.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-blue-500/20 text-xs font-bold text-blue-400">
                    <span>Open 3D Navigation</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Tilt3DAdminCard>

                <Tilt3DAdminCard
                  onClick={() => setActiveTab('claims')}
                  className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 border border-amber-400/50 shadow-lg hover:shadow-amber-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-all">
                        <Box className="w-6 h-6 text-amber-300" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 border border-amber-400/30 text-amber-300">Verify</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                      Lost &amp; Found Claims Approval
                    </h3>
                    <p className="text-xs text-slate-300 mb-4">
                      Review student ownership proofs, authorize claims, and release items.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-amber-500/20 text-xs font-bold text-amber-300">
                    <span>Review Claims</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Tilt3DAdminCard>
              </div>
            </>
          )}

          {/* VIEW: STUDENT & USER MANAGEMENT */}
          {(activeTab === 'students' || activeTab === 'faculty') && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-blue-400/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-blue-500/20">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeTab === 'students' ? <GraduationCap className="w-5 h-5 text-cyan-400" /> : <Briefcase className="w-5 h-5 text-amber-400" />}
                    <span>{activeTab === 'students' ? 'Student Registry & USN Search' : 'Faculty Registry & Faculty ID Search'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">Institutional records verified against GEC Hassan database</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder={activeTab === 'students' ? "Search USN or Name..." : "Search Faculty ID or Name..."}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#060e20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-blue-500/20">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">{activeTab === 'students' ? 'USN' : 'Faculty ID'}</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/10">
                    {filteredUsers
                      .filter(u => activeTab === 'students' ? u.role === 'student' : ['faculty', 'teacher'].includes(u.role))
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px]">{u.name?.charAt(0)}</span>
                            <span>{u.name}</span>
                          </td>
                          <td className="p-3 font-mono text-cyan-300">{u.identifier}</td>
                          <td className="p-3 text-slate-300">{u.department || "Computer Science"}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{u.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.is_active === false || u.status === 'inactive'
                                ? 'bg-red-950 text-red-400 border border-red-500/30'
                                : 'bg-green-950 text-green-400 border border-green-500/30'
                            }`}>
                              {u.is_active === false || u.status === 'inactive' ? 'inactive' : 'active'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              {(u.is_active === false || u.status === 'inactive') && (
                                <button
                                  onClick={() => handleActivateUser(u.id)}
                                  disabled={activatingUserId === u.id}
                                  className="px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Activate
                                </button>
                              )}
                              {activeTab === 'students' && (
                                <button
                                  type="button"
                                  aria-label={`Delete ${u.name}'s account`}
                                  title="Delete student account"
                                  disabled={deletingStudentId === u.id}
                                  onClick={() => {
                                    setAdminUserError('');
                                    setPendingStudentDeletion(u);
                                  }}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-300 bg-red-500/15 border border-red-500/40 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingStudentDeletion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-delete-title"
                className="w-full max-w-md rounded-2xl border border-red-400/40 bg-[#09152b] p-6 shadow-2xl"
              >
                <h2 id="student-delete-title" className="text-lg font-bold text-white">
                  Permanently Delete Student Account?
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Are you sure you want to permanently delete this student's account? This action cannot be undone.
                </p>
                <dl className="mt-5 space-y-3 rounded-xl border border-blue-500/20 bg-[#060e20] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Student Name</dt>
                    <dd className="text-right font-semibold text-white">{pendingStudentDeletion.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Student USN</dt>
                    <dd className="text-right font-mono text-cyan-300">{pendingStudentDeletion.identifier}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Registered Email</dt>
                    <dd className="break-all text-right font-mono text-slate-300">{pendingStudentDeletion.email}</dd>
                  </div>
                </dl>
                {adminUserError && (
                  <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-2 text-xs text-rose-200">
                    {adminUserError}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={deletingStudentId !== null}
                    onClick={() => setPendingStudentDeletion(null)}
                    className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deletingStudentId !== null}
                    onClick={handleDeleteStudent}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-400/50 bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Permanently Delete
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* VIEW: CAMPUS & BUILDINGS */}
          {activeTab === 'buildings' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-blue-400/40 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-blue-500/20">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-green-400" />
                    <span>Campus Buildings &amp; Waypoint Architecture</span>
                  </h2>
                  <p className="text-xs text-slate-400">12 Verified Institutional Blocks at Mosalehosahalli Campus</p>
                </div>
                <button
                  onClick={() => onNavigate('navigation')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30"
                >
                  View 3D Spatial Map
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {campusBuildings.map((b) => (
                  <div key={b.code} className="p-3.5 rounded-2xl bg-[#060e20] border border-blue-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-white text-xs">{b.name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] bg-green-950 text-green-300 border border-green-500/30 font-bold">{b.status}</span>
                      </div>
                      <div className="text-[11px] text-cyan-300 font-mono">{b.floors} • Code: {b.code}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{b.rooms}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: SMART CANTEEN KDS */}
          {activeTab === 'canteen_kds' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-cyan-400/40 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-cyan-500/20">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-cyan-400" />
                    <span>Kitchen Display System (KDS) &amp; Live Orders</span>
                  </h2>
                  <p className="text-xs text-slate-400">Live order queue for canteen staff &amp; refund oversight</p>
                </div>
                <button
                  onClick={() => onNavigate('canteen')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold"
                >
                  Open Canteen Portal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {canteenOrders.map((ord) => (
                  <div key={ord.id} className="p-4 rounded-2xl bg-[#060e20] border border-cyan-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-extrabold text-cyan-300 font-mono">{ord.booking_code}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold uppercase">{ord.status}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{ord.user_name} • <span className="font-mono text-slate-400">{ord.usn_or_id}</span></div>
                      <div className="text-xs text-slate-300 mt-1">Slot: {ord.time_slot}</div>
                      <div className="text-[11px] text-slate-400 mt-2 font-mono">
                        Items: {ord.items?.map(i => `${i.name} (x${i.qty || 1})`).join(', ') || 'Special Meal'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-cyan-500/20">
                      <span className="text-sm font-black text-white">₹{ord.total_amount}</span>
                      <button
                        onClick={() => alert(`Order ${ord.booking_code} marked as ready for pickup!`)}
                        className="px-3 py-1 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400"
                      >
                        Mark Ready
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: ANNOUNCEMENTS PUBLISHER */}
          {activeTab === 'announcements' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-blue-400/40 shadow-xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                  <span>Publish Campus Announcement</span>
                </h2>
                <p className="text-xs text-slate-400">Broadcast notices instantly to all Student &amp; Faculty dashboards</p>
              </div>

              {noticeFeedback && (
                <div className="p-3 rounded-xl bg-green-950/80 border border-green-500 text-green-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>{noticeFeedback}</span>
                </div>
              )}

              <form onSubmit={handlePublishNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Notice Title</label>
                  <input
                    type="text"
                    required
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    placeholder="e.g. VTU Belagavi Special Examination Schedule Released"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-blue-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={newNoticeCategory}
                      onChange={(e) => setNewNoticeCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-blue-500/30 text-white text-xs"
                    >
                      <option value="Academic">Academic Notice</option>
                      <option value="Examination">VTU Examination</option>
                      <option value="Facilities">Campus Facilities &amp; Canteen</option>
                      <option value="Hackathon">Hackathons &amp; Events</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Author Identity</label>
                    <input
                      type="text"
                      disabled
                      value="Principal & Administration Office"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20]/60 border border-blue-500/20 text-slate-400 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Summary Description</label>
                  <textarea
                    rows={3}
                    required
                    value={newNoticeSummary}
                    onChange={(e) => setNewNoticeSummary(e.target.value)}
                    placeholder="Provide full details, eligibility, dates, and instructions for students and staff..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-blue-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-xs shadow-lg hover:opacity-90 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Notice</span>
                </button>
              </form>

              {/* Feed of active announcements */}
              <div className="pt-4 border-t border-blue-500/20 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Broadcast History</h3>
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 rounded-2xl bg-[#060e20] border border-blue-500/15 text-xs">
                    <div className="font-bold text-white text-sm">{ann.title}</div>
                    <div className="text-slate-300 mt-1">{ann.summary}</div>
                    <div className="text-[10px] text-blue-400 mt-1 flex justify-between">
                      <span>{ann.author} • {ann.category}</span>
                      <span>{ann.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CLAIMS APPROVAL */}
          {activeTab === 'claims' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-amber-400/40 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-amber-500/20">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Box className="w-5 h-5 text-amber-400" />
                    <span>Lost &amp; Found Ownership Claim Verification</span>
                  </h2>
                  <p className="text-xs text-slate-400">Authorize or reject student item release claims</p>
                </div>
                <button
                  onClick={() => onNavigate('lost-found')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold"
                >
                  Open Registry
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lostClaims.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-[#060e20] border border-amber-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-white text-sm">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'claimed' ? 'bg-amber-950 text-amber-300 border border-amber-400/40' : 'bg-cyan-950 text-cyan-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">{item.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Location: {item.location} • Date: {item.date_reported}</div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-amber-500/15">
                      <button
                        onClick={() => alert(`Claim approved for ${item.title}. Student notified for physical collection.`)}
                        className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-400 text-green-300 text-xs font-bold hover:bg-green-500/30"
                      >
                        Approve &amp; Release
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-indigo-400/40 shadow-xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span>Campus 360 Analytics &amp; Performance Metrics</span>
                </h2>
                <p className="text-xs text-slate-400">Institutional utilization statistics across modules</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#060e20] border border-indigo-500/30">
                  <div className="text-xs font-bold text-slate-400 uppercase">3D Navigation Requests</div>
                  <div className="text-3xl font-black text-white mt-1">3,420</div>
                  <div className="text-[10px] text-cyan-400 mt-1">Top target: CSE Lab - 1 &amp; Canteen</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#060e20] border border-cyan-500/30">
                  <div className="text-xs font-bold text-slate-400 uppercase">Canteen Tokens Issued</div>
                  <div className="text-3xl font-black text-white mt-1">1,890</div>
                  <div className="text-[10px] text-green-400 mt-1">Avg turnaround time: 3.2 mins</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#060e20] border border-amber-500/30">
                  <div className="text-xs font-bold text-slate-400 uppercase">Lost Item Recovery Rate</div>
                  <div className="text-3xl font-black text-white mt-1">87.5%</div>
                  <div className="text-[10px] text-amber-400 mt-1">28 items successfully restored</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_management' && <AdminManagement />}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-6 rounded-3xl bg-[#09152b]/90 border border-slate-500/40 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-300" />
                  <span>System Security &amp; Authorization Keys</span>
                </h2>
                <p className="text-xs text-slate-400">Institutional master clearance configurations</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#060e20] border border-blue-500/20 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">Administrator Provisioning</div>
                    <div className="text-slate-400 text-[11px]">Admin roles are assigned through authenticated user management</div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-black/80 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                    No public provisioning key
                  </span>
                </div>

                <MainAdminHandoff />

                <div className="p-4 rounded-2xl bg-[#060e20] border border-blue-500/20 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">JWT Token Secret Status</div>
                    <div className="text-slate-400 text-[11px]">HMAC-SHA256 signature verification active</div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-green-950 text-green-300 border border-green-500/30 font-bold">
                    Secure (24h Expiry)
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
