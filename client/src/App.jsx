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

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [history, setHistory] = useState(['landing']);

  // Unauthenticated by default for security: new users must register/login to access dashboards
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('campus360_user');
      return stored ? JSON.parse(stored) : null;
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
        ? (currentUser.role === 'faculty' ? 'faculty-dashboard' : currentUser.role === 'admin' ? 'admin-dashboard' : 'dashboard')
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
    setCurrentUser(userData);
    localStorage.setItem('campus360_user', JSON.stringify(userData));

    // STEP 4: Dashboard Redirection based on verified role
    if (userData.role === 'faculty') {
      navigateTo('faculty-dashboard');
    } else if (userData.role === 'admin') {
      navigateTo('admin-dashboard');
    } else {
      navigateTo('dashboard');
    }
  };

  // Secure logout
  const handleLogout = () => {
    localStorage.removeItem('campus360_token');
    localStorage.removeItem('campus360_user');
    setCurrentUser(null);
    navigateTo('landing');
  };

  const canGoBack = currentPage !== 'landing';

  // Guard for protected dashboards
  const isDashboardPage = currentPage === 'dashboard' || currentPage === 'faculty-dashboard' || currentPage === 'admin-dashboard';
  useEffect(() => {
    if (isDashboardPage && !currentUser) {
      navigateTo('auth');
    }
  }, [currentPage, currentUser]);

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
        {/* LANDING PAGE: Clicking "Get Started" redirects new users to Welcome Page */}
        {currentPage === 'landing' && (
          <LandingPage 
            onGetStarted={() => navigateTo('auth')}
            onLogin={() => navigateTo('auth-login')}
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
