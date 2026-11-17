import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Briefcase, 
  FlaskConical, 
  Utensils, 
  Compass, 
  Box, 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  Bell, 
  User, 
  BookOpen, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Coffee,
  CheckCircle2,
  Megaphone,
  LogOut,
  LayoutDashboard,
  HelpCircle,
  X,
  FileCheck
} from 'lucide-react';

function Tilt3DFacultyCard({ children, className = '', onClick }) {
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

export default function FacultyDashboard({ currentUser, onNavigate, onLogout, onBack }) {
  const [activeSidebar, setActiveSidebar] = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.announcements) setAnnouncements(d.announcements);
      })
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Assigned Labs", count: 2, icon: FlaskConical, color: "text-amber-400", border: "border-amber-500/40" },
    { label: "Classes Today", count: 3, icon: BookOpen, color: "text-cyan-400", border: "border-cyan-500/40" },
    { label: "Canteen Fast-Track", count: "Active", icon: Utensils, color: "text-green-400", border: "border-green-500/40" },
    { label: "Consultations", count: 4, icon: Calendar, color: "text-blue-400", border: "border-blue-500/40" },
  ];

  const assignedClasses = [
    { time: "09:30 AM - 10:30 AM", subject: "Compiler Design (CS501)", room: "Classroom 201 • Academic Block B" },
    { time: "11:00 AM - 01:00 PM", subject: "Operating Systems Lab (CS507)", room: "CSE Block • Lab 1 (Ground Floor)" },
    { time: "02:30 PM - 03:30 PM", subject: "Software Engineering & Architecture", room: "Seminar Hall A • Academic Block A" }
  ];

  const facultyNotifications = [
    { id: 1, title: "Lab 1 Reservation Confirmed", text: "High-performance nodes prepped for 5th Sem practicals.", time: "15m ago" },
    { id: 2, title: "Faculty Priority Dining Pass Ready", text: "Executive lounge high-tea order code: CAN-9134.", time: "45m ago" },
    { id: 3, title: "Departmental Meeting at 4 PM", text: "HOD Chamber meeting regarding VTU accreditation documentation.", time: "2h ago" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      
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
          <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5 bg-amber-950/80 px-3.5 py-1 rounded-full border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Faculty Executive Portal Active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* 1. Futuristic Faculty Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-3xl bg-[#09152b]/90 backdrop-blur-xl border border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-amber-500/20">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-700 border border-amber-400 flex items-center justify-center text-white font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                360°
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white tracking-wide">FACULTY DESK</div>
                <div className="text-[10px] text-amber-400/90 font-mono">ID: {currentUser?.usnOrId || "GEC-FAC-101"}</div>
              </div>
            </div>

            <nav className="space-y-1 text-left">
              <button
                onClick={() => setActiveSidebar('overview')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSidebar === 'overview'
                    ? 'bg-gradient-to-r from-amber-500/30 to-orange-600/25 border border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => onNavigate('navigation')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Campus Navigation</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-300">3D</span>
              </button>

              <button
                onClick={() => onNavigate('canteen')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Smart Canteen</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-300">Priority</span>
              </button>

              <button
                onClick={() => onNavigate('lost-found')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Box className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Lost &amp; Found Review</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-300">Verify</span>
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>Faculty Profile</span>
              </button>

              <button
                onClick={() => setShowNotifModal(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Notifications</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-bold">3</span>
              </button>

              <div className="pt-3 mt-3 border-t border-amber-500/20">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Session</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* 2. Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">

          {/* Welcome Banner Card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0a1835]/85 backdrop-blur-xl border border-amber-400/40 p-6 sm:p-8 shadow-[0_0_35px_rgba(245,158,11,0.2)] text-left">
            <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-400/40 text-amber-300 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Government Engineering College, Mosalehosahalli • Faculty Services</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                  Welcome, {currentUser?.name || "Dr. Baby H.T."} 👨‍🏫
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
                  Manage assigned labs, schedule student consultations, access fast-track executive dining, and navigate campus waypoints.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-amber-300 font-medium">
                  <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-amber-500/30">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    {currentUser?.department || "Computer Science & Engineering"}
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-amber-500/30">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Faculty ID: <strong className="text-white font-mono">{currentUser?.usnOrId || "GEC-FAC-101"}</strong>
                  </span>
                </div>
              </div>

              {/* Chamber Photo */}
              <div className="relative w-full md:w-72 h-44 rounded-2xl overflow-hidden border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] group flex-shrink-0">
                <img 
                  src="/images/chamber.jpg" 
                  alt="Faculty Chambers"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent"></div>
                <div className="absolute bottom-2 left-3 right-3 text-[11px] font-bold text-white truncate drop-shadow">
                  Faculty Chambers &amp; HOD Wing
                </div>
              </div>
            </div>
          </div>

          {/* 4 Stat Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <Tilt3DFacultyCard
                  key={idx}
                  className={`p-4 rounded-2xl bg-[#09152b]/80 backdrop-blur-md border ${s.border} shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-between text-left`}
                >
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-0.5">
                      {s.count}
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {s.label}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <Icon className="w-5 h-5" />
                  </div>
                </Tilt3DFacultyCard>
              );
            })}
          </div>

          {/* Quick Access Modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Tilt3DFacultyCard
              onClick={() => onNavigate('canteen')}
              className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-amber-400/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-all">
                    <Coffee className="w-6 h-6 text-amber-300" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 border border-amber-400/30 text-amber-300">
                    Express Dining
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                  Faculty Priority Dining
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Fast-track kitchen queue, staff lounge delivery, and high-tea pre-orders with zero wait times.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-amber-500/20 text-xs font-bold text-amber-300">
                <span>Order Priority Meal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Tilt3DFacultyCard>

            <Tilt3DFacultyCard
              onClick={() => onNavigate('navigation')}
              className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(0,242,254,0.4)] transition-all flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-all">
                    <Compass className="w-6 h-6 text-cyan-300" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                    3D Campus
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                  Classroom Waypoints
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Turn-by-turn directions to HOD Chamber, CSE Labs, Seminar Halls, and administrative buildings.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20 text-xs font-bold text-cyan-400">
                <span>Open Campus Map</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Tilt3DFacultyCard>

            <Tilt3DFacultyCard
              onClick={() => onNavigate('lost-found')}
              className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-blue-400/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-all">
                    <Box className="w-6 h-6 text-blue-300" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 border border-blue-400/30 text-blue-300">
                    ID Verification
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                  Lost &amp; Found Review
                </h3>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Review reported student identity cards, verify department ownership, and authenticate claims.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-blue-500/20 text-xs font-bold text-blue-400">
                <span>Review Registry</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Tilt3DFacultyCard>
          </div>

          {/* Assigned Classes Schedule & Faculty Announcements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            
            {/* Assigned Classes */}
            <div className="p-5 rounded-3xl bg-[#09152b]/85 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Today's Academic Schedule</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">3 Sessions</span>
              </div>
              <div className="space-y-2.5">
                {assignedClasses.map((cls, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#060e20] border border-amber-500/10 text-xs">
                    <div className="font-bold text-amber-300">{cls.subject}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{cls.room}</div>
                    <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{cls.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Notices */}
            <div className="p-5 rounded-3xl bg-[#09152b]/85 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>Faculty Notices</span>
                </div>
                <span className="text-[10px] text-slate-400">HOD Office</span>
              </div>
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-2.5 rounded-xl bg-[#060e20] border border-amber-500/10 text-xs">
                    <div className="font-bold text-white text-[11px]">{ann.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ann.summary}</div>
                    <div className="text-[9px] text-amber-400/80 mt-1 flex justify-between">
                      <span>{ann.author}</span>
                      <span>{ann.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Modal: Faculty Profile */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.4)] text-left">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 font-bold text-lg">
                F
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{currentUser?.name || "Dr. Baby H.T."}</h3>
                <p className="text-xs text-amber-400 font-mono">Faculty ID: {currentUser?.usnOrId || "GEC-FAC-101"}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300 border-t border-amber-500/20 pt-3">
              <div className="flex justify-between py-1 border-b border-amber-500/10">
                <span className="text-slate-400">Department:</span>
                <span className="text-white">{currentUser?.department || "Computer Science & Engineering"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-500/10">
                <span className="text-slate-400">Institutional Email:</span>
                <span className="text-white font-mono">{currentUser?.email || "babyht@gechassan.ac.in"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-500/10">
                <span className="text-slate-400">Faculty Priority Dining:</span>
                <span className="text-green-400 font-bold">Authorized (Active)</span>
              </div>
            </div>
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notifications */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.4)] text-left">
            <button
              onClick={() => setShowNotifModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Faculty Notifications</h3>
                <p className="text-[11px] text-slate-400">Department &amp; Campus Dispatch</p>
              </div>
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {facultyNotifications.map(n => (
                <div key={n.id} className="p-3 rounded-xl bg-[#060e20] border border-amber-500/20 text-xs">
                  <div className="font-bold text-amber-300 flex justify-between">
                    <span>{n.title}</span>
                    <span className="text-[9px] text-slate-500">{n.time}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">{n.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowNotifModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
