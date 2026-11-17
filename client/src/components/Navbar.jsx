import React, { useState } from 'react';
import { Compass, Box, UtensilsCrossed, Bell, User, LogOut, Shield, ChevronRight, ArrowLeft, LayoutDashboard, Briefcase, X, CheckCircle2, MapPin } from 'lucide-react';

export default function Navbar({ currentPage, setCurrentPage, currentUser, onLogout, onBack, canGoBack }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCollegeLocation, setShowCollegeLocation] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifications = [
    { id: 1, title: 'VTU Exam Schedule Announced', body: '5th & 7th semester theoretical examinations commence Dec 18.', time: '10m ago' },
    { id: 2, title: 'Smart Canteen NFC Priority Active', body: 'Fast-track counter 2 open for online orders.', time: '1h ago' },
    { id: 3, title: 'Annual AI & IoT Hackathon 2026', body: 'Registration open for 36-hour sprint at CSE Block.', time: '3h ago' }
  ];
  const adminModules = currentUser?.admin_modules || currentUser?.adminModules || [];
  const adminModuleSlugs = adminModules.map((module) => (
    typeof module === 'string' ? module : module.slug || module.module_slug
  ));
  const isScopedAdmin = adminModuleSlugs.length > 0;
  const isMainAdmin = currentUser?.role === 'admin' || currentUser?.role === 'main_admin' || currentUser?.is_main_admin === true;
  const getDashboardTarget = () => {
    if (!currentUser) return 'landing';
    if (isMainAdmin) return 'admin-dashboard';
    if (isScopedAdmin) return 'module-admin-dashboard';
    if (currentUser.role === 'faculty' || currentUser.role === 'teacher') return 'faculty-dashboard';
    return 'dashboard';
  };

  const getDashboardLabel = () => {
    if (isMainAdmin) return 'Main Admin Dashboard';
    if (isScopedAdmin) return 'Module Admin Dashboard';
    if (currentUser?.role === 'faculty' || currentUser?.role === 'teacher') return 'Faculty Dashboard';
    return 'Student Dashboard';
  };

  const getRoleBadgeStyle = (role) => {
    if (isMainAdmin) return 'bg-blue-950/80 border-blue-400/50 text-blue-300';
    if (isScopedAdmin) return 'bg-violet-950/80 border-violet-400/50 text-violet-300';
    if (role === 'faculty' || role === 'teacher') return 'bg-amber-950/80 border-amber-400/50 text-amber-300';
    return 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300';
  };

  const dashboardTarget = getDashboardTarget();
  const isDashboardActive = currentPage === 'dashboard'
    || currentPage === 'faculty-dashboard'
    || currentPage === 'admin-dashboard'
    || currentPage === 'module-admin-dashboard';
  const canAccessModule = (slugs) => !isScopedAdmin || slugs.some((slug) => adminModuleSlugs.includes(slug));

  return (
    <header className="sticky top-0 z-50 bg-[#060b18]/85 backdrop-blur-md border-b border-cyan-500/20">
      {/* Top institutional strip */}
      <div className="bg-[#040814] px-4 py-1 border-b border-cyan-500/10 text-xs flex justify-between items-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[9px] text-cyan-300 font-bold">
            G
          </div>
          <span className="tracking-wide uppercase font-semibold text-slate-300">
            Government Engineering College, Mosalehosahalli, Hassan
          </span>
          <span className="hidden md:inline text-cyan-500/60">• Smart Campus 360 Unified System</span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border uppercase font-bold tracking-wider ${getRoleBadgeStyle(currentUser.role)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              {isMainAdmin ? 'Main Admin' : isScopedAdmin ? 'Module Admin' : currentUser.role}
            </span>
          )}
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left side: Back Button + Brand logo */}
        <div className="flex items-center gap-3">
          {canGoBack && (currentPage === 'auth' || currentPage === 'auth-login' || currentPage === 'auth-register') && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 hover:text-white hover:bg-cyan-500/30 hover:border-cyan-300 shadow-[0_0_18px_rgba(0,242,254,0.35)] transition-all text-xs font-bold group cursor-pointer"
              title="Go Back to previous page"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
          )}

          <div 
            onClick={() => setCurrentPage(currentUser ? dashboardTarget : 'landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] transition-all">
              <span className="font-extrabold text-white text-base tracking-tighter">360°</span>
              <span className="absolute -inset-0.5 rounded-xl border border-cyan-400/50 animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent italic">
                  Campus 360°
                </span>
              </div>
              <div className="text-[10px] tracking-wider text-cyan-400/80 uppercase font-medium -mt-0.5">
                Smart Campus Management
              </div>
            </div>
          </div>
        </div>

        {/* Center navigation links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {currentUser && (
            <>
              <button
                onClick={() => setCurrentPage(dashboardTarget)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isDashboardActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>{getDashboardLabel()}</span>
              </button>
              {canAccessModule(['navigation', 'campus_navigation']) && <button
                onClick={() => setCurrentPage('navigation')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentPage === 'navigation'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                Campus Navigation
              </button>}
              {canAccessModule(['lost_found']) && <button
                onClick={() => setCurrentPage('lost-found')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentPage === 'lost-found'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Box className="w-4 h-4 text-cyan-400" />
                Lost & Found
              </button>}
              {canAccessModule(['canteen', 'smart_canteen']) && <button
                onClick={() => setCurrentPage('canteen')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  currentPage === 'canteen'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-cyan-400" />
                Smart Canteen
              </button>}
            </>
          )}
        </nav>

        {/* Right side user / login action */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowCollegeLocation(!showCollegeLocation)}
              className="flex items-center justify-center p-2 rounded-xl bg-[#0c1830] border border-cyan-500/20 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-950/60 transition-all cursor-pointer"
              title="College location"
              aria-label="Show college location"
              aria-expanded={showCollegeLocation}
            >
              <MapPin className="w-4 h-4" />
            </button>

            {showCollegeLocation && (
              <div
                role="dialog"
                aria-label="College location"
                className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-[#08152e] border border-cyan-400/40 shadow-[0_0_35px_rgba(0,242,254,0.25)] z-50"
              >
                <img
                  src="/images/gec-campus-location.png"
                  alt="Government Engineering College, Mosalehosahalli campus entrance"
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Government Engineering College
                      </h2>
                      <p className="mt-1 text-xs text-slate-300">
                        Mosalehosahalli, Hassan District - 573212, Karnataka, India
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCollegeLocation(false)}
                      className="p-1 text-slate-400 hover:text-white"
                      aria-label="Close college location"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <a
                    href="https://maps.app.goo.gl/JJK7ZtEin9gwYk7V8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition"
                  >
                    <MapPin className="w-4 h-4" />
                    Open exact location in Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-center gap-3 relative">
              {/* Notification Bell Button */}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl bg-[#0c1830] border border-cyan-500/20 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40 transition-all cursor-pointer"
                title="View Campus Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-[10px] text-black font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-[#08152e]/98 backdrop-blur-xl border border-cyan-400/50 shadow-[0_0_35px_rgba(0,242,254,0.35)] p-4 z-50 text-left animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Campus Notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => setUnreadCount(0)}
                          className="text-[10px] text-cyan-300 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-[#040e22] border border-cyan-500/20 hover:border-cyan-400/40 transition-all">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white mb-0.5">
                          <span>{n.title}</span>
                          <span className="text-[9px] text-cyan-400 font-normal">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Source of Truth for Logged-in User Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0c1a35] border border-cyan-400/30 text-sm">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${
                  currentUser.role === 'faculty' 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
                    : currentUser.role === 'admin'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                }`}>
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-xs text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-cyan-400/80 leading-tight font-mono">{currentUser.usn || currentUser.usnOrId}</div>
                </div>
              </div>

              {/* Secure Session Logout */}
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-900/60 transition-all cursor-pointer"
                title="Logout from Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : currentPage === 'landing' ? (
            <button
              onClick={() => setCurrentPage('auth-login')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
