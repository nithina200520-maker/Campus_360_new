import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  GraduationCap, 
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
  HelpCircle,
  LogOut,
  LayoutDashboard,
  Megaphone,
  CheckCircle2,
  FileText,
  X,
  Phone,
  Shield,
  Activity
} from 'lucide-react';

function Tilt3DCard({ children, className = '', onClick }) {
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

export default function StudentDashboard({ currentUser, onNavigate, onLogout, onBack }) {
  const [activeSidebar, setActiveSidebar] = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(3);

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.announcements) setAnnouncements(d.announcements);
      })
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Buildings", count: 12, icon: Building2, color: "text-cyan-400", border: "border-cyan-500/40" },
    { label: "Classrooms", count: 48, icon: GraduationCap, color: "text-blue-400", border: "border-blue-500/40" },
    { label: "Labs", count: 6, icon: FlaskConical, color: "text-cyan-300", border: "border-cyan-400/40" },
    { label: "Canteen", count: 1, icon: Utensils, color: "text-sky-400", border: "border-sky-500/40" },
  ];

  const studentActivities = [
    { id: 1, title: "Canteen Fast-Track Pre-Booking", detail: "Token #CAN-4821 Confirmed (12:30 PM slot)", time: "25 mins ago", status: "Active" },
    { id: 2, title: "Navigation to CSE Lab - 1", detail: "Ground Floor route completed (120 m)", time: "2 hours ago", status: "Completed" },
    { id: 3, title: "Lost Item Claim Submitted", detail: "Noise ColorFit Smart Watch verification in progress", time: "Yesterday", status: "Pending" }
  ];

  const notificationsList = [
    { id: 1, title: "Canteen Token #CAN-4821 Ready", text: "Your lunch order is now being dispatched at Counter 1.", time: "10m ago" },
    { id: 2, title: "Lab 1 Equipment Calibrated", text: "CSE Department GPU clusters are online for afternoon lab sessions.", time: "1h ago" },
    { id: 3, title: "VTU Exam Seating Matrix", text: "Examination hall allocation has been synced to your profile.", time: "3h ago" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Top Breadcrumb & User Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#09162e]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-xs font-bold group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Portal Home</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1.5 bg-cyan-950/80 px-3.5 py-1 rounded-full border border-cyan-400/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Student Active Session</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Sidebar + Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* 1. Futuristic 3D Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-3xl bg-[#09152b]/90 backdrop-blur-xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-cyan-500/20">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 border border-cyan-400 flex items-center justify-center text-white font-extrabold shadow-[0_0_15px_rgba(0,242,254,0.5)]">
                360°
              </div>
              <div>
                <div className="text-xs font-black text-white tracking-wide">STUDENT HUB</div>
                <div className="text-[10px] text-cyan-400/90 font-mono">USN: {currentUser?.usn || currentUser?.usnOrId || "4HG22CS045"}</div>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveSidebar('overview')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSidebar === 'overview'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/25 border border-cyan-400 text-white shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => onNavigate('navigation')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Campus Navigation</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">3D</span>
              </button>

              <button
                onClick={() => onNavigate('lost-found')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Box className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Lost &amp; Found</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">AI</span>
              </button>

              <button
                onClick={() => onNavigate('canteen')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Utensils className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Smart Canteen</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">Fast</span>
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-cyan-400" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => setShowNotifModal(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>Notifications</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500 text-black font-bold">3</span>
              </button>

              <button
                onClick={() => setShowHelpModal(true)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Help &amp; Support</span>
              </button>

              <div className="pt-3 mt-3 border-t border-cyan-500/20">
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

          {/* Quick Emergency / Help Widget */}
          <div className="p-4 rounded-3xl bg-[#09152b]/80 border border-cyan-500/20 text-xs space-y-2">
            <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Campus Security Desk</span>
            </div>
            <div className="text-[10px] text-slate-400">Main Gate Post: +91 8172 245001</div>
            <div className="text-[10px] text-slate-400">IT Support: itdesk@gechassan.ac.in</div>
          </div>
        </aside>

        {/* 2. Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">

          {/* Welcome Banner Card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0a1835]/90 backdrop-blur-xl border border-cyan-400/40 p-6 sm:p-8 shadow-[0_0_35px_rgba(6,182,212,0.25)]">
            <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 text-left">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Government Engineering College, Mosalehosahalli, Hassan</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                  Welcome, {currentUser?.name || "Nithin A"} 👋
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
                  Explore your campus with Campus 360 — 3D spatial turn-by-turn navigation, AI image-matched lost property recovery, and zero-wait priority canteen pre-booking.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-cyan-300 font-medium">
                  <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-cyan-500/20">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    {currentUser?.department || "Computer Science & Engineering"}
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#060e20] px-3 py-1.5 rounded-lg border border-cyan-500/20">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    {currentUser?.semester || "5th Semester"} • USN: <strong className="text-white font-mono">{currentUser?.usn || currentUser?.usnOrId || "4HG22CS045"}</strong>
                  </span>
                </div>
              </div>

              {/* Embedded Campus Photo */}
              <div className="relative w-full md:w-72 h-44 rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_20px_rgba(0,242,254,0.3)] group flex-shrink-0">
                <img 
                  src="/images/campus_bg.jpg" 
                  alt="GEC Mosalehosahalli Campus" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-transparent"></div>
                <div className="absolute bottom-2 left-3 right-3 text-[11px] font-semibold text-white truncate drop-shadow">
                  Main Academic Block &amp; Quadrangle
                </div>
              </div>
            </div>
          </div>

          {/* 4 Stat Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <Tilt3DCard 
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
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Icon className="w-5 h-5" />
                  </div>
                </Tilt3DCard>
              );
            })}
          </div>

          {/* 6 Main 3D Dashboard Cards (Master Prompt Requirement 11) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-left">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Core Smart Campus Services</span>
              </h2>
              <span className="text-xs text-slate-400">Select any card to launch module</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: Campus Navigation */}
              <Tilt3DCard
                onClick={() => onNavigate('navigation')}
                className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
                      <Compass className="w-6 h-6 text-cyan-300" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                      3D WebGL
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    1. Campus Navigation
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    Interactive 3D building models, turn-by-turn routing to CSE Labs, Principal Office, and Library.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-cyan-500/15 text-xs font-bold text-cyan-400">
                  <span>Open 3D Map</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Tilt3DCard>

              {/* Card 2: Lost & Found */}
              <Tilt3DCard
                onClick={() => onNavigate('lost-found')}
                className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
                      <Box className="w-6 h-6 text-cyan-300" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                      AI Registry
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    2. Lost &amp; Found
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    Report misplaced valuables, upload photos, search recovered IDs, and claim items with ownership proof.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-cyan-500/15 text-xs font-bold text-cyan-400">
                  <span>Report / Claim Item</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Tilt3DCard>

              {/* Card 3: Smart Canteen */}
              <Tilt3DCard
                onClick={() => onNavigate('canteen')}
                className="group cursor-pointer p-5 rounded-3xl bg-[#09162e]/85 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
                      <Utensils className="w-6 h-6 text-cyan-300" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                      Pre-Booking
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    3. Smart Canteen
                  </h3>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    Online meal booking, breakfast/lunch ordering, time-slot selection, and QR priority counter queue.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-cyan-500/15 text-xs font-bold text-cyan-400">
                  <span>Order Food Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Tilt3DCard>
            </div>

            {/* Row 2: Activities, Notifications, Announcements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 4: My Activities */}
              <div className="p-5 rounded-3xl bg-[#09152b]/85 backdrop-blur-md border border-cyan-500/30 text-left">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>4. My Activities</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">Live Sync</span>
                </div>
                <div className="space-y-3">
                  {studentActivities.map((act) => (
                    <div key={act.id} className="p-2.5 rounded-xl bg-[#060e20] border border-cyan-500/10 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{act.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">{act.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{act.detail}</div>
                      <div className="text-[9px] text-slate-500 mt-1">{act.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Notifications */}
              <div className="p-5 rounded-3xl bg-[#09152b]/85 backdrop-blur-md border border-cyan-500/30 text-left">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span>5. Notifications</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Recent Alerts</span>
                </div>
                <div className="space-y-2.5">
                  {notificationsList.map((notif) => (
                    <div key={notif.id} className="p-2.5 rounded-xl bg-[#060e20] border border-cyan-500/10 text-xs">
                      <div className="font-bold text-cyan-300 text-[11px] flex justify-between">
                        <span>{notif.title}</span>
                        <span className="text-[9px] text-slate-500">{notif.time}</span>
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">{notif.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 6: Campus Announcements */}
              <div className="p-5 rounded-3xl bg-[#09152b]/85 backdrop-blur-md border border-cyan-500/30 text-left">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Megaphone className="w-4 h-4 text-cyan-400" />
                    <span>6. Campus Notices</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Institutional</span>
                </div>
                <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-2.5 rounded-xl bg-[#060e20] border border-cyan-500/10 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-white mb-0.5">
                        <span className="truncate">{ann.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">{ann.summary}</div>
                      <div className="flex items-center justify-between text-[9px] text-cyan-400/80 mt-1">
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
      </div>

      {/* Modal: Student Profile Details */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-cyan-400/50 shadow-[0_0_40px_rgba(0,242,254,0.4)] text-left">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-lg">
                {currentUser?.name?.charAt(0) || "S"}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{currentUser?.name || "Nithin A"}</h3>
                <p className="text-xs text-cyan-400 font-mono">USN: {currentUser?.usn || currentUser?.usnOrId || "4HG22CS045"}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300 border-t border-cyan-500/20 pt-3">
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Institutional Email:</span>
                <span className="text-white font-mono">{currentUser?.email || "nithin@gechassan.ac.in"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Registered Department:</span>
                <span className="text-white">{currentUser?.department || "Computer Science & Engineering"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Academic Semester:</span>
                <span className="text-white">{currentUser?.semester || "5th Semester"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Campus Verification:</span>
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  VTU Authorized Record
                </span>
              </div>
            </div>
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Help & Support */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-cyan-400/50 shadow-[0_0_40px_rgba(0,242,254,0.4)] text-left">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Help &amp; Campus Assistance</h3>
                <p className="text-[11px] text-slate-400">Government Engineering College, Hassan</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20">
                <div className="font-bold text-cyan-300">Campus Emergency Hotline</div>
                <div className="text-[11px] text-slate-400 mt-0.5">+91 8172 245001 (Available 24x7)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20">
                <div className="font-bold text-cyan-300">IT &amp; Smart Portal Helpdesk</div>
                <div className="text-[11px] text-slate-400 mt-0.5">support.campus360@gechassan.ac.in</div>
              </div>
              <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20">
                <div className="font-bold text-cyan-300">Student Welfare &amp; Proctorial Board</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Main Administrative Block, Room 104</div>
              </div>
            </div>
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notifications Drawer */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-cyan-400/50 shadow-[0_0_40px_rgba(0,242,254,0.4)] text-left">
            <button
              onClick={() => setShowNotifModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Live Campus Alerts</h3>
                <p className="text-[11px] text-slate-400">All recent system notifications</p>
              </div>
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {notificationsList.map(n => (
                <div key={n.id} className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20 text-xs">
                  <div className="font-bold text-cyan-300 flex justify-between">
                    <span>{n.title}</span>
                    <span className="text-[9px] text-slate-500">{n.time}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] mt-1">{n.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <button
                onClick={() => setUnreadNotifs(0)}
                className="text-cyan-400 hover:underline"
              >
                Mark all as read
              </button>
              <button
                onClick={() => setShowNotifModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black font-bold"
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
