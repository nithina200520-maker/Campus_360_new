import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  CheckCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Key, 
  Phone,
  Building,
  Layers,
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle,
  LogIn,
  UserPlus,
  HelpCircle,
  X,
  Send
} from 'lucide-react';

export default function AuthPortal({ initialTab, initialMode = 'register', onAuthSuccess, onBack }) {
  // Tabs: 'login' or 'register' - defaults based on initialTab or initialMode
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    if (initialMode === 'login') return 'login';
    return 'register';
  });

  // Common Selected Role: 'student', 'faculty', 'admin' (persists across tab switches)
  const [selectedRole, setSelectedRole] = useState('student');

  // Form Fields State - initialized blank for a clean authentication experience (no demo prefill)
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState(''); // USN / Student Name for student, Faculty ID for faculty, Email for admin
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('1st Semester');
  const [academicDesignation, setAcademicDesignation] = useState('Assistant Professor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Remember Me & Forgot Password State
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('campus360_remember') === 'true';
  });
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // UI Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load remembered identifier on mount if Remember Me was selected
  useEffect(() => {
    const saved = localStorage.getItem('campus360_saved_id');
    if (saved && activeTab === 'login') {
      setIdentifier(saved);
    }
  }, [activeTab]);

  // Update values when switching roles - keep inputs clean without demo credentials
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrorMessage('');
    setSuccessMessage('');
    setIdentifier('');
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setConfirmPassword('');
    setSemester('1st Semester');
    setAcademicDesignation('Assistant Professor');
  };

  // Switch Tab while keeping selected role
  const handleTabSwitch = (tab) => {
    if (tab === 'register' && selectedRole === 'admin') {
      setSelectedRole('student');
    }
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const parseJsonResponse = async (response) => {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      if (/<\s*(?:!doctype|html|head|body|title|meta|script|div|span)/i.test(text)) {
        return {
          success: false,
          message: 'The registration service is unavailable or rejected the request. Please try again.'
        };
      }

      return {
        success: false,
        message: text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200) || 'The server returned an unexpected response.'
      };
    }
  };

  // Handle Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (selectedRole !== 'student' && selectedRole !== 'faculty') {
      setErrorMessage('Only student and faculty accounts can be registered here.');
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMessage('Password must contain at least 8 characters, one letter, and one number.');
      return;
    }

    if (!confirmPassword || password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password must match.');
      return;
    }

    if (!fullName.trim() || !identifier.trim() || !email.trim() || !department) {
      setErrorMessage('Please complete all required registration fields.');
      return;
    }

    if (selectedRole === 'student' && !semester) {
      setErrorMessage('Please select your current semester.');
      return;
    }

    if (selectedRole === 'faculty' && !academicDesignation) {
      setErrorMessage('Please select your academic designation.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phone.trim(),
        department,
        universityUSN: selectedRole === 'student' ? identifier.trim().toUpperCase() : undefined,
        currentSemester: selectedRole === 'student' ? semester : undefined,
        employeeId: selectedRole === 'faculty' ? identifier.trim().toUpperCase() : undefined,
        academicDesignation: selectedRole === 'faculty' ? academicDesignation : undefined,
        password,
        confirmPassword
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          role: selectedRole
        })
      });

      const data = await parseJsonResponse(res);

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Registration failed. Please check your details.');
        return;
      }

      setActiveTab('login');
      setIdentifier(identifier.trim().toUpperCase());
      setPassword('');
      setConfirmPassword('');
      setSuccessMessage(data.message || 'Registration complete. Please log in.');
    } catch {
      setErrorMessage('Could not reach the registration service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier || !password) {
      const missingMessage = selectedRole === 'student'
        ? 'Please provide your registered student name and password.'
        : 'Please provide your registered ID or email and password.';
      setErrorMessage(missingMessage);
      return;
    }

    if (rememberMe) {
      localStorage.setItem('campus360_remember', 'true');
      localStorage.setItem('campus360_saved_id', identifier);
    } else {
      localStorage.removeItem('campus360_remember');
      localStorage.removeItem('campus360_saved_id');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          identifier: identifier.trim(),
          password
        })
      });

      const data = await parseJsonResponse(res);

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Invalid credentials. Access denied.');
        return;
      }
      if (data.token) {
        localStorage.setItem('campus360_token', data.token);
        localStorage.setItem('campus360_user', JSON.stringify(data.user));
      }
      onAuthSuccess(data.user);
    } catch {
      setErrorMessage('Could not reach the sign-in service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier) return;
    setForgotLoading(true);
    setForgotMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier, role: selectedRole })
      });
      const data = await parseJsonResponse(res);
      setForgotMessage(data.message || 'Password reset instructions dispatched to registered institutional email.');
    } catch {
      setForgotMessage('Could not reach the password reset service. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const passwordLengthValid = password.length >= 8;
  const passwordLettersAndNumbersValid = /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordConfirmationEntered = confirmPassword.length > 0;
  const passwordsMatch = passwordConfirmationEntered && password === confirmPassword;
  const renderPasswordIndicator = (valid, active) => {
    if (valid) return <CheckCircle className="w-4 h-4 text-emerald-400 transition-colors" />;
    if (active) return <X className="w-4 h-4 text-red-400 transition-colors" />;
    return <span className="w-3.5 h-3.5 rounded-full border border-slate-500 transition-colors" aria-hidden="true" />;
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background with real campus photography and deep cyan glow */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10 scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/images/campus_bg.jpg')` }}
      >
        <div className="absolute inset-0 bg-[#060b18]/85 backdrop-blur-[3px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-[#060b18]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none"></div>
      </div>

      {/* Top back navigation button */}
      <div className="absolute top-6 left-6 z-20">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs font-bold transition-all group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Landing Page</span>
          </button>
        )}
      </div>

      {/* Main Glassmorphic Card (Hosting Tabs, Role Cards, and Dynamic Form) */}
      <div className="relative w-full max-w-xl p-6 sm:p-10 rounded-3xl bg-[#09152b]/95 backdrop-blur-2xl border border-cyan-400/40 shadow-[0_0_50px_rgba(0,242,254,0.35)] animate-fade-in my-8">
        
        {/* Subtle neon corner accents */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-300 rounded-tl-xl pointer-events-none"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-300 rounded-tr-xl pointer-events-none"></div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-300 rounded-bl-xl pointer-events-none"></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-300 rounded-br-xl pointer-events-none"></div>

        {/* 1. Header Section */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.6)]">
            <span className="font-black text-white text-2xl tracking-tighter">360°</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            Welcome to Campus 360
          </h1>
          <p className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 mt-1">
            Smart Campus Management System
          </p>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Government Engineering College, Mosalehosahalli, Hassan
          </div>
        </div>

        {/* 2. Two Separate Tabs: LOGIN & REGISTER (On the same page) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 mb-6 rounded-2xl bg-[#060e1f] border border-cyan-500/30">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.6)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>LOGIN</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.6)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>REGISTER</span>
          </button>
        </div>

        {/* 3. Common Role Selection: Display 3 Role Cards on BOTH Tabs */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 text-left flex items-center justify-between">
            <span>Select Your Campus Role:</span>
            <span className="text-cyan-400 text-[10px] font-normal">Active: {selectedRole.toUpperCase()}</span>
          </div>

          <div className={`grid gap-3 ${activeTab === 'login' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {/* Card 1: Student */}
            <div
              onClick={() => handleRoleSelect('student')}
              className={`relative cursor-pointer p-3 sm:p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1.5 ${
                selectedRole === 'student'
                  ? 'bg-gradient-to-tr from-cyan-950/80 to-blue-900/40 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)] scale-[1.02]'
                  : 'bg-[#060e20] border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#08152e]'
              }`}
            >
              {selectedRole === 'student' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                selectedRole === 'student' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-slate-400'
              }`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold ${selectedRole === 'student' ? 'text-white' : 'text-slate-300'}`}>
                Student
              </span>
            </div>

            {/* Card 2: Faculty */}
            <div
              onClick={() => handleRoleSelect('faculty')}
              className={`relative cursor-pointer p-3 sm:p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1.5 ${
                selectedRole === 'faculty'
                  ? 'bg-gradient-to-tr from-cyan-950/80 to-blue-900/40 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)] scale-[1.02]'
                  : 'bg-[#060e20] border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#08152e]'
              }`}
            >
              {selectedRole === 'faculty' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                selectedRole === 'faculty' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-slate-400'
              }`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold ${selectedRole === 'faculty' ? 'text-white' : 'text-slate-300'}`}>
                Faculty
              </span>
            </div>

            {activeTab === 'login' && (
              <div
                onClick={() => handleRoleSelect('admin')}
                className={`relative cursor-pointer p-3 sm:p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1.5 ${
                  selectedRole === 'admin'
                    ? 'bg-gradient-to-tr from-cyan-950/80 to-blue-900/40 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)] scale-[1.02]'
                    : 'bg-[#060e20] border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#08152e]'
                }`}
              >
                {selectedRole === 'admin' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selectedRole === 'admin' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-slate-400'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold ${selectedRole === 'admin' ? 'text-white' : 'text-slate-300'}`}>
                  Admin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 mb-4 text-left animate-shake shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-green-950/70 border border-green-500/60 text-green-200 text-xs flex items-center gap-2 mb-4 text-left animate-fade-in shadow-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. DYNAMIC FORMS: Render ONLY fields for (activeTab + selectedRole)        */}
        {/* ========================================================================= */}

        {/* ----------------- REGISTER TAB FORMS ----------------- */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} autoComplete="off" className="space-y-4 text-left animate-fade-in">

            {/* STUDENT REGISTRATION */}
            {selectedRole === 'student' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter student full name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="personal.email@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department / Branch *</label>
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Information Science & Engineering">Information Science & Engineering</option>
                      <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                      <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9845012345"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">University USN *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                      placeholder="e.g. 4HG22CS010"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs uppercase focus:outline-none focus:border-cyan-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Current Semester *</label>
                    <select
                      required
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                    >
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="3rd Semester">3rd Semester</option>
                      <option value="4th Semester">4th Semester</option>
                      <option value="5th Semester">5th Semester</option>
                      <option value="6th Semester">6th Semester</option>
                      <option value="7th Semester">7th Semester</option>
                      <option value="8th Semester">8th Semester</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* FACULTY REGISTRATION */}
            {selectedRole === 'faculty' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter faculty full name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="faculty@gechassan.ac.in"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department / Branch *</label>
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Information Science & Engineering">Information Science & Engineering</option>
                      <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                      <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9845054321"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Official Employee ID *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                      placeholder="EMP-CSE-042"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs uppercase focus:outline-none focus:border-cyan-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Academic Designation *</label>
                    <select
                      required
                      value={academicDesignation}
                      onChange={(e) => setAcademicDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-300"
                    >
                      <option>Assistant Professor</option>
                      <option>Associate Professor</option>
                      <option>Professor</option>
                      <option>Head of Department (HOD)</option>
                      <option>Lecturer</option>
                      <option>Senior Assistant Professor</option>
                      <option>Visiting Faculty</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Common Password & Confirm Password (Shared across register roles) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-cyan-500/25 bg-[#060e20]/80 px-3.5 py-3 text-[11px]" aria-live="polite">
              <span className={`inline-flex items-center gap-2 ${passwordLengthValid ? 'text-emerald-300' : password ? 'text-red-300' : 'text-slate-400'}`}>
                {renderPasswordIndicator(passwordLengthValid, password.length > 0)}
                8+ chars
              </span>
              <span className={`inline-flex items-center gap-2 ${passwordLettersAndNumbersValid ? 'text-emerald-300' : password ? 'text-red-300' : 'text-slate-400'}`}>
                {renderPasswordIndicator(passwordLettersAndNumbersValid, password.length > 0)}
                Letters &amp; numbers
              </span>
              <span className={`inline-flex items-center gap-2 ${passwordsMatch ? 'text-emerald-300' : passwordConfirmationEntered ? 'text-red-300' : 'text-slate-400'}`}>
                {renderPasswordIndicator(passwordsMatch, passwordConfirmationEntered)}
                {passwordConfirmationEntered && !passwordsMatch ? 'Passwords do not match' : 'Passwords match'}
              </span>
            </div>

            {/* Dynamic Register Button per Role */}
            <button
              type="submit"
              disabled={loading || !passwordLengthValid || !passwordLettersAndNumbersValid || !passwordsMatch}
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-xs tracking-wider shadow-[0_0_25px_rgba(0,242,254,0.6)] hover:shadow-[0_0_35px_rgba(0,242,254,0.9)] hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50 uppercase"
            >
              {loading
                ? 'Verifying College Records...'
                : selectedRole === 'student'
                ? 'CREATE STUDENT ACCOUNT'
                : selectedRole === 'faculty'
                ? 'CREATE FACULTY ACCOUNT'
                : 'CREATE ADMINISTRATOR ACCOUNT'}
            </button>
          </form>
        )}

        {/* ----------------- LOGIN TAB FORMS ----------------- */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left animate-fade-in">

            {/* STUDENT LOGIN */}
            {selectedRole === 'student' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex justify-between">
                  <span>Student Name</span>
                  <span className="text-[10px] text-cyan-400">Government Engineering College</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your registered student name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>
              </div>
            )}

            {/* FACULTY LOGIN */}
            {selectedRole === 'faculty' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex justify-between">
                  <span>Employee ID or Email</span>
                  <span className="text-[10px] text-cyan-400">Institutional Faculty ID</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. EMP-CSE-042 or faculty email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs uppercase focus:outline-none focus:border-cyan-300 font-mono"
                  />
                </div>
              </div>
            )}

            {/* ADMIN LOGIN */}
            {selectedRole === 'admin' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex justify-between">
                  <span>Admin Username / Email</span>
                  <span className="text-[10px] text-blue-400">Administrative Portal</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@gechassan.ac.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>
              </div>
            )}

            {/* Common Password Field */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me and Forgot Password (Matching Reference Image) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#060e20] border-cyan-500/40 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px]">Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(identifier);
                  setForgotMessage('');
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {/* Dynamic Login Button per Role */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-xs tracking-wider shadow-[0_0_25px_rgba(0,242,254,0.6)] hover:shadow-[0_0_35px_rgba(0,242,254,0.9)] hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50 uppercase"
            >
              {loading
                ? 'Authenticating Credentials...'
                : selectedRole === 'student'
                ? 'LOGIN AS STUDENT'
                : selectedRole === 'faculty'
                ? 'LOGIN AS FACULTY'
                : 'LOGIN AS ADMINISTRATOR'}
            </button>
          </form>
        )}

        {/* Footer switch prompt */}
        <div className="mt-6 pt-4 border-t border-cyan-500/20 text-center text-xs text-slate-400">
          {activeTab === 'login' ? (
            <span>
              New User?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Register Here
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Login Here
              </button>
            </span>
          )}
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#09152b] border border-cyan-400/50 shadow-[0_0_40px_rgba(0,242,254,0.4)] text-left">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Account Password</h3>
                <p className="text-[11px] text-slate-400">Campus 360 Institutional Verification</p>
              </div>
            </div>

            {forgotMessage ? (
              <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-xs space-y-2 mb-4">
                <p>{forgotMessage}</p>
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs shadow-lg hover:bg-cyan-400"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Enter your registered USN, Faculty ID, or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. 4HG22CS045 or GEC-FAC-101"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold text-xs shadow-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {forgotLoading ? 'Verifying...' : 'Request Reset OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
