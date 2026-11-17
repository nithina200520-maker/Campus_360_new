import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import AuthPortal from './components/AuthPortal';
import StudentDashboard from './components/StudentDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import AdminDashboard from './components/AdminDashboard';
import CampusNavigation from './components/CampusNavigation';
import LostFound from './components/LostFound';
import SmartCanteen from './components/SmartCanteen';
import ThreeCanvasBackground from './components/ThreeCanvasBackground';
import ModuleAdminDashboard from './components/ModuleAdminDashboard';

const hasModuleAdminAccess = (user) => (
  Array.isArray(user?.admin_modules) && user.admin_modules.length > 0
);
const isMainAdmin = (user) => user?.role === 'admin' || user?.role === 'main_admin' || user?.is_main_admin === true;

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [history, setHistory] = useState(['landing']);
  const [logoutError, setLogoutError] = useState('');

  // Unauthenticated by default for security: new users must register/login to access dashboards
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('campus360_user');
      return stored && localStorage.getItem('campus360_token') ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Navigate to a new page with history tracking
  const navigateTo = (pageId) => {
    if (pageId === currentPage) return;
    setHistory((prev) => [...prev, pageId]);
    setCurrentPage(pageId);
    window.history.pushState({ page: pageId }, '', '#' + pageId);
  };

  // Dedicated back action
  const goBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // remove current page
      const prevPage = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setCurrentPage(prevPage);
      window.history.pushState({ page: prevPage }, '', '#' + prevPage);
    } else {
      // Fallback if no prior history: return to role dashboard if logged in, or landing
      const fallback = currentUser 
        ? (isMainAdmin(currentUser)
          ? 'admin-dashboard'
          : hasModuleAdminAccess(currentUser)
            ? 'module-admin-dashboard'
            : currentUser.role === 'faculty'
              ? 'faculty-dashboard'
              : 'dashboard')
        : 'landing';
      if (currentPage !== fallback) {
        setHistory([fallback]);
        setCurrentPage(fallback);
        window.history.pushState({ page: fallback }, '', '#' + fallback);
      }
    }
  };

  // Sync with browser's native back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.page) {
        setCurrentPage(e.state.page);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          setCurrentPage(hash);
        } else {
          setCurrentPage('landing');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle successful login with role-based dashboard redirection
  const handleAuthSuccess = (userData) => {
    setLogoutError('');
    const user = {
      ...userData,
      admin_modules: userData.admin_modules || userData.adminModules || [],
    };
    setCurrentUser(user);
    localStorage.setItem('campus360_user', JSON.stringify(user));

    // STEP 4: Dashboard Redirection based on verified role
    if (isMainAdmin(user)) {
      navigateTo('admin-dashboard');
    } else if (hasModuleAdminAccess(user)) {
      navigateTo('module-admin-dashboard');
    } else if (user.role === 'faculty' || user.role === 'teacher') {
      navigateTo('faculty-dashboard');
    } else {
      navigateTo('dashboard');
    }
  };

  const handleLandingStart = () => {
    if (currentUser) {
      const dashboardPage = isMainAdmin(currentUser)
        ? 'admin-dashboard'
        : hasModuleAdminAccess(currentUser)
          ? 'module-admin-dashboard'
          : currentUser.role === 'faculty' || currentUser.role === 'teacher'
            ? 'faculty-dashboard'
            : 'dashboard';
      navigateTo(dashboardPage);
      return;
    }

    navigateTo('auth');
  };

  const handleMainAdminLogin = () => {
    if (isMainAdmin(currentUser)) {
      navigateTo('admin-dashboard');
      return;
    }
    navigateTo('main-admin-auth');
  };

  // Secure logout
  const handleLogout = async () => {
    let logoutFailure = '';
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          ...(localStorage.getItem('campus360_token')
            ? { Authorization: `Bearer ${localStorage.getItem('campus360_token')}` }
            : {}),
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Logout failed (${response.status}).`);
      }
    } catch (error) {
      logoutFailure = error.message || 'Could not confirm server-side logout.';
    }

    localStorage.removeItem('campus360_token');
    localStorage.removeItem('campus360_user');
    setCurrentUser(null);
    setLogoutError(logoutFailure);
    navigateTo('landing');
  };

  const canGoBack = currentPage !== 'landing';

  // Guard for protected dashboards
  const isDashboardPage = currentPage === 'dashboard'
    || currentPage === 'faculty-dashboard'
    || currentPage === 'admin-dashboard'
    || currentPage === 'module-admin-dashboard';
  useEffect(() => {
    if (isDashboardPage && !currentUser) {
      navigateTo('auth');
    } else if (currentPage === 'module-admin-dashboard' && !hasModuleAdminAccess(currentUser)) {
      navigateTo(currentUser?.role === 'faculty' || currentUser?.role === 'teacher' ? 'faculty-dashboard' : 'dashboard');
    } else if (currentUser?.role === 'faculty' && currentPage === 'dashboard' && !hasModuleAdminAccess(currentUser)) {
      navigateTo('faculty-dashboard');
    } else if (
      currentPage === 'faculty-dashboard'
      &&       currentUser?.role !== 'faculty'
      && currentUser?.role !== 'teacher'
      && !isMainAdmin(currentUser)
    ) {
      navigateTo('dashboard');
    } else if (currentPage === 'admin-dashboard' && !isMainAdmin(currentUser)) {
      navigateTo(currentUser?.role === 'faculty' || currentUser?.role === 'teacher' ? 'faculty-dashboard' : 'dashboard');
    }
  }, [currentPage, currentUser, isDashboardPage]);

  return (
    <div className="min-h-screen bg-[#060b18] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white relative">
      {/* Subtle 3D Ambient WebGL Particle & Constellation Background */}
      <ThreeCanvasBackground />

      {/* Top Navbar with integrated Back button */}
      <Navbar 
        currentPage={currentPage}
        setCurrentPage={navigateTo}
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={goBack}
        canGoBack={canGoBack}
      />

      {/* Main Page Content */}
      <main className="flex-1 pb-6">
        {logoutError && (
          <div role="alert" className="mx-auto mt-3 max-w-7xl rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">
            Your browser session was cleared, but the server could not confirm logout: {logoutError}
          </div>
        )}
        {/* LANDING PAGE: Clicking "Get Started" redirects new users to Welcome Page */}
        {currentPage === 'landing' && (
          <LandingPage 
            onGetStarted={handleLandingStart}
            onMainAdminLogin={handleMainAdminLogin}
          />
        )}

        {/* STEP 1 & 2 & 3: WELCOME, REGISTRATION, OR LOGIN PORTAL */}
        {(currentPage === 'auth' || currentPage === 'auth-register' || currentPage === 'auth-login') && (
          <AuthPortal 
            initialMode={currentPage === 'auth-login' ? 'login' : currentPage === 'auth-register' ? 'register' : 'welcome'}
            onAuthSuccess={handleAuthSuccess}
            onBack={goBack}
          />
        )}
        {currentPage === 'main-admin-auth' && (
          <AuthPortal
            mainAdminOnly
            initialMode="login"
            onAuthSuccess={handleAuthSuccess}
            onBack={goBack}
          />
        )}

        {/* STEP 4: STUDENT DASHBOARD (Protected) */}
        {currentPage === 'dashboard' && currentUser && (
          <StudentDashboard 
            currentUser={currentUser}
            onNavigate={(pageId) => navigateTo(pageId)}
            onLogout={handleLogout}
            onBack={goBack}
          />
        )}

        {/* STEP 4: FACULTY DASHBOARD (Protected) */}
        {currentPage === 'faculty-dashboard' && currentUser && (
          <FacultyDashboard 
            currentUser={currentUser}
            onNavigate={(pageId) => navigateTo(pageId)}
            onLogout={handleLogout}
            onBack={goBack}
          />
        )}

        {/* STEP 4: ADMIN DASHBOARD (Protected) */}
        {currentPage === 'admin-dashboard' && currentUser && (
          <AdminDashboard 
            currentUser={currentUser}
            onNavigate={(pageId) => navigateTo(pageId)}
            onLogout={handleLogout}
            onBack={goBack}
          />
        )}

        {currentPage === 'module-admin-dashboard' && currentUser && hasModuleAdminAccess(currentUser) && (
          <ModuleAdminDashboard
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}

        {/* CAMPUS NAVIGATION */}
        {currentPage === 'navigation' && (
          <CampusNavigation 
            onBack={goBack}
          />
        )}

        {/* LOST & FOUND */}
        {currentPage === 'lost-found' && (
          <LostFound 
            currentUser={currentUser}
            onBack={goBack}
          />
        )}

        {/* SMART CANTEEN */}
        {currentPage === 'canteen' && (
          <SmartCanteen 
            currentUser={currentUser}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  );
}
