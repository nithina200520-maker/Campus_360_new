import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ShieldCheck, UserCheck, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onBack }) {
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [isRegister, setIsRegister] = useState(false);
  const [usnOrId, setUsnOrId] = useState(role === 'student' ? '4HG22CS045' : 'admin@gechassan.ac.in');
  const [password, setPassword] = useState('Campus@360');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDept, setRegDept] = useState('Computer Science & Engineering');
  const [regSem, setRegSem] = useState('5th Sem');

  const handleRoleToggle = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'student') {
      setUsnOrId('4HG22CS045');
      setPassword('Campus@360');
    } else {
      setUsnOrId('admin@gechassan.ac.in');
      setPassword('Admin@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: regFullName,
            usn: regUsn,
            email: regEmail,
            department: regDept,
            semester: regSem
          })
        });
        const data = await res.json();
        if (data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.message || 'Registration failed');
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usnOrId,
            password,
            role
          })
        });
        const data = await res.json();
        if (data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.message || 'Invalid credentials');
        }
      }
    } catch (err) {
      // Offline fallback
      onLoginSuccess({
        id: role === 'admin' ? 1 : 2,
        name: role === 'admin' ? "College Administrator" : "Nithin A",
        usn: usnOrId.toUpperCase(),
        email: `${usnOrId.toLowerCase()}@gechassan.ac.in`,
        role: role,
        department: "Computer Science & Engineering",
        semester: "5th Sem"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-4 overflow-hidden">
      {/* Top back navigation button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs font-bold transition-all group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      )}

      {/* Background with real campus photography and deep cyan glow */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: `url('/images/campus_bg.jpg')` }}
      >
        <div className="absolute inset-0 bg-[#060b18]/85 backdrop-blur-[3px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-transparent to-[#060b18]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none"></div>
      </div>

      {/* Main glassmorphic login card (matching reference image Page 2) */}
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-400/40 shadow-[0_0_40px_rgba(0,242,254,0.35)]">
        
        {/* Subtle neon corner accents */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-300 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-300 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-300 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-300 rounded-br-xl"></div>

        {/* Header crest and title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
          </div>
          <div className="text-xs uppercase font-bold tracking-wider text-cyan-400/90 mb-1">
            Government Engineering College
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Mosalehosahalli, Hassan
          </div>
          <h2 className="text-3xl font-black italic tracking-tight text-white mt-3 bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            Campus 360
          </h2>
          <p className="text-xs text-slate-300/80 font-medium mt-1">
            {isRegister ? 'Register New Student Account' : 'Login to Access Smart Campus Services'}
          </p>
        </div>

        {/* Tab switchers: Student Login vs Admin Login */}
        {!isRegister && (
          <div className="flex p-1 mb-6 rounded-full bg-[#060e1f] border border-cyan-500/20">
            <button
              type="button"
              onClick={() => handleRoleToggle('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold transition-all ${
                role === 'student'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student Login</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleToggle('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center">
            {error}
          </div>
        )}

        {/* Login / Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Nithin A"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">USN / Student ID</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regUsn}
                    onChange={(e) => setRegUsn(e.target.value)}
                    placeholder="e.g. 4HG22CS045"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nithin@gechassan.ac.in"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option>Computer Science & Engineering</option>
                    <option>AI & Data Science</option>
                    <option>Electronics & Communication</option>
                    <option>Mechanical Engineering</option>
                    <option>Civil Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Semester</label>
                  <select
                    value={regSem}
                    onChange={(e) => setRegSem(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option>1st Sem</option>
                    <option>3rd Sem</option>
                    <option>5th Sem</option>
                    <option>7th Sem</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* USN / ID input field */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {role === 'student' ? 'USN / Student ID' : 'Administrator Email / Username'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type="text"
                    required
                    value={usnOrId}
                    onChange={(e) => setUsnOrId(e.target.value)}
                    placeholder={role === 'student' ? 'e.g. 4HG22CS045' : 'admin@gechassan.ac.in'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
                  />
                </div>
              </div>

              {/* Password input field with toggle */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#060e20] border-cyan-500/40 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Remember Me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => alert("Demo Password for Student: Campus@360 | Admin: Admin@123")} 
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:shadow-[0_0_30px_rgba(0,242,254,0.8)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isRegister ? 'Complete Registration' : 'Login'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer link to toggle Register / Login */}
        <div className="text-center mt-6 pt-4 border-t border-cyan-500/15 text-xs text-slate-400">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-cyan-300 font-bold hover:underline"
              >
                Login Here
              </button>
            </span>
          ) : (
            <span>
              New User?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-cyan-300 font-bold hover:underline"
              >
                Register Here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

