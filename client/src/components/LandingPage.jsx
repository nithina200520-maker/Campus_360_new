import React, { useState } from 'react';
import { MapPin, Box, UtensilsCrossed, ArrowRight, Sparkles, Shield, Compass } from 'lucide-react';

function TiltCard({ children, onClick, className = '' }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
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
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
        transition: 'transform 0.15s ease-out',
        transformStyle: 'preserve-3d'
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export default function LandingPage({ onGetStarted, onLogin }) {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* Background with real GEC Hassan campus photograph and neon gradient overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10 scale-105 transition-transform duration-1000"
        style={{ 
          backgroundImage: `url('/images/campus_bg.jpg')`,
        }}
      >
        {/* Dark radial glass overlays for high contrast and futuristic feel */}
        <div className="absolute inset-0 bg-[#060b18]/75 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#060b18] via-[#060b18]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#060b18]/80 via-transparent to-[#060b18]/80"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      {/* Hero content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-6 text-center flex-1 flex flex-col items-center justify-center">
        {/* College title badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1f3d]/80 border border-cyan-400/40 text-cyan-300 text-xs sm:text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-6 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>Government Engineering College, Mosalehosahalli, Hassan</span>
        </div>

        {/* Main Branding: Campus 360 with glowing neon effect */}
        <div className="relative inline-block mb-3">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black italic tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(0,242,254,0.6)]">
            Campus 360°
          </h1>
          <div className="absolute -top-3 -right-6 w-12 h-12 rounded-full border-2 border-dashed border-cyan-400/60 animate-spin" style={{ animationDuration: '15s' }}></div>
        </div>

        {/* Subtitle & Tagline */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wide mb-3 drop-shadow-md">
          Smart Campus Management System
        </h2>
        <p className="max-w-2xl text-slate-300 text-sm sm:text-base font-normal mb-10 leading-relaxed">
          AI-Powered Campus Navigation, Lost &amp; Found and Smart Canteen Booking
        </p>

        {/* 3 Main Feature Cards (matching reference image with 3D tilt effects) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full mb-10">
          {/* Card 1: Navigation */}
          <TiltCard 
            onClick={onGetStarted}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0a1832]/80 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all duration-300 hover:-translate-y-1.5"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
              <MapPin className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
              Campus Navigation
            </h3>
            <p className="text-xs text-slate-300/80 tracking-wide font-medium">
              Find Rooms • Get Directions
            </p>
          </TiltCard>

          {/* Card 2: Lost & Found */}
          <TiltCard 
            onClick={onGetStarted}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0a1832]/80 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all duration-300 hover:-translate-y-1.5"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
              <Box className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
              Lost &amp; Found
            </h3>
            <p className="text-xs text-slate-300/80 tracking-wide font-medium">
              Report • Search • Claim
            </p>
          </TiltCard>

          {/* Card 3: Smart Canteen */}
          <TiltCard 
            onClick={onGetStarted}
            className="group cursor-pointer p-6 rounded-2xl bg-[#0a1832]/80 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(0,242,254,0.45)] transition-all duration-300 hover:-translate-y-1.5"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all">
              <UtensilsCrossed className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
              Smart Canteen
            </h3>
            <p className="text-xs text-slate-300/80 tracking-wide font-medium">
              Pre-Book • Priority • Refund
            </p>
          </TiltCard>
        </div>

        {/* Call to action button (matching reference image) */}
        <div className="pb-8">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-base tracking-wide shadow-[0_0_25px_rgba(0,242,254,0.65)] hover:shadow-[0_0_40px_rgba(0,242,254,0.95)] hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

