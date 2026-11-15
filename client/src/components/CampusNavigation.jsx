import React, { useState, useEffect, useRef } from 'react';
import ThreeCampusMap3D from './ThreeCampusMap3D';
import {
  Search,
  Mic,
  MapPin,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  Camera,
  Footprints,
  Clock,
  ChevronRight,
  ArrowLeft,
  X,
  Sparkles,
  Eye,
  Box,
  Compass
} from 'lucide-react';

export default function CampusNavigation({ onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState({
    id: 3,
    name: "Lab - 1 (CSE Block)",
    category: "Laboratory",
    building: "CSE Block",
    floor: "Ground Floor",
    distance: "120 m",
    time: "~ 2 min",
    photo: "/images/office.jpg"
  });
  const [navMode, setNavMode] = useState('3d'); // '3d' (WebGL) or 'blueprint' (Isometric)
  const [is3DMode, setIs3DMode] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showStreetView, setShowStreetView] = useState(false);
  const [activePhoto, setActivePhoto] = useState('/images/office.jpg');

  const destinations = [
    { id: 1, name: "Principal Room", category: "Office", building: "Main Admin Block", floor: "Ground Floor", distance: "45 m", time: "~ 1 min", photo: "/images/office.jpg" },
    { id: 2, name: "HOD - CSE", category: "HOD Chamber", building: "Academic Block A", floor: "1st Floor", distance: "90 m", time: "~ 1.5 min", photo: "/images/chamber.jpg" },
    { id: 3, name: "Lab - 1", fullName: "CSE Block (Lab - 1)", category: "Laboratory", building: "CSE Block", floor: "Ground Floor", distance: "120 m", time: "~ 2 min", photo: "/images/office.jpg" },
    { id: 4, name: "Lab - 2", category: "Laboratory", building: "CSE Block", floor: "1st Floor", distance: "135 m", time: "~ 2.5 min", photo: "/images/office.jpg" },
    { id: 5, name: "Classroom 201", category: "Classroom", building: "Academic Block B", floor: "2nd Floor", distance: "160 m", time: "~ 3 min", photo: "/images/campus_bg.jpg" },
    { id: 6, name: "Library", category: "Library", building: "Library & Digital Wing", floor: "Ground Floor", distance: "80 m", time: "~ 1.5 min", photo: "/images/office.jpg" },
    { id: 7, name: "Canteen", category: "Canteen", building: "Cafeteria Block", floor: "Ground Floor", distance: "210 m", time: "~ 3.5 min", photo: "/images/campus_bg.jpg" },
    { id: 8, name: "Boys Washroom", category: "Facility", building: "Block A & B", floor: "Each Floor", distance: "30 m", time: "~ 0.5 min", photo: "/images/office.jpg" },
    { id: 9, name: "Girls Washroom", category: "Facility", building: "Block A & B", floor: "Each Floor", distance: "35 m", time: "~ 0.5 min", photo: "/images/office.jpg" },
  ];

  const filteredDestinations = destinations.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (dest) => {
    setSelectedDestination(dest);
    setActivePhoto(dest.photo);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Top Header Strip with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#09162e]/90 border border-cyan-400/50 text-cyan-300 hover:text-white hover:bg-cyan-500/25 hover:border-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all text-xs font-bold group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>← Back to Dashboard</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-400">Current Module:</span>
          <span className="font-semibold text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-400/30">
            Interactive Campus Navigation &amp; 3D Floor Maps
          </span>
        </div>
      </div>

      {/* Top Search bar (matching reference image) */}
      <div className="mb-6">
        <div className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, lab, department (e.g., Lab-1, HOD, 201)..."
              className="w-full pl-12 pr-12 py-3.5 rounded-full bg-[#0a1836]/90 backdrop-blur-xl border border-cyan-400/50 text-white placeholder-slate-400 text-sm shadow-[0_0_25px_rgba(6,182,212,0.3)] focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_35px_rgba(0,242,254,0.6)] transition-all"
            />
            <button
              type="button"
              onClick={() => alert("Voice assistant ready: Speak destination (e.g., 'Take me to CSE Lab 1')")}
              className="absolute right-4 text-cyan-400 hover:text-cyan-200 transition-colors"
              title="Voice Search"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation workspace: Sidebar + Map Canvas (matching Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Destination Selector List */}
        <div className="lg:col-span-1 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-5 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col h-[560px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Select Destination</span>
            </h3>
            <span className="text-[11px] text-cyan-300/80 font-medium">
              {filteredDestinations.length} Points
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scroll">
            {filteredDestinations.map((dest) => {
              const isSelected = selectedDestination?.id === dest.id;
              return (
                <div
                  key={dest.id}
                  onClick={() => handleSelect(dest)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between ${isSelected
                      ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/20 border border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)] text-white'
                      : 'bg-[#060e20]/60 border border-cyan-500/10 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-cyan-500 text-black' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/20'
                      }`}>
                      {dest.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{dest.name}</div>
                      <div className="text-[10px] text-slate-400">{dest.building} • {dest.floor}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
              );
            })}
          </div>

          {/* Start Location preview */}
          <div className="pt-3 mt-3 border-t border-cyan-500/20 text-xs">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Origin (Your Location)</div>
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Main College Entrance &amp; Porch</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Map Canvas (matching reference design) */}
        <div className="lg:col-span-3 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-400/40 p-4 shadow-[0_0_35px_rgba(6,182,212,0.25)] flex flex-col justify-between relative overflow-hidden h-[560px]">

          {/* Map canvas container */}
          <div className="relative w-full flex-1 rounded-2xl overflow-hidden bg-[#050a16] border border-cyan-500/20">

            {/* Mode Switcher Pills (3D WebGL vs 2D Isometric Blueprint) */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#060e20]/90 backdrop-blur-md border border-cyan-500/30">
              <button
                type="button"
                onClick={() => setNavMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  navMode === '3d'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.6)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D WebGL Scene</span>
              </button>
              <button
                type="button"
                onClick={() => setNavMode('blueprint')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  navMode === 'blueprint'
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.6)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>2D Blueprint Layout</span>
              </button>
            </div>

            {/* Render 3D WebGL Model */}
            {navMode === '3d' ? (
              <ThreeCampusMap3D 
                selectedBuilding={selectedDestination}
                onSelectBuilding={(b) => {
                  const match = destinations.find(d => 
                    d.id === b.id || 
                    d.name.toLowerCase().includes(b.name.toLowerCase()) ||
                    d.building.toLowerCase().includes(b.name.toLowerCase())
                  );
                  if (match) {
                    handleSelect(match);
                  } else {
                    setSelectedDestination({
                      id: b.id,
                      name: b.name,
                      category: b.category,
                      building: b.name,
                      floor: "Campus Waypoint",
                      distance: "140 m",
                      time: "~ 2 min",
                      photo: "/images/office.jpg"
                    });
                  }
                }}
                destinations={destinations}
              />
            ) : (
              /* 3D Isometric campus visualization view or 2D floor vector */
              <div
                className="absolute inset-0 transition-all duration-700 flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel}) ${is3DMode ? 'perspective(900px) rotateX(25deg) rotateZ(-4deg)' : 'perspective(none)'}`,
                  transformOrigin: 'center center'
                }}
              >
                {/* High-tech grid background */}
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]"></div>

                {/* Campus architectural layout rendering */}
                <div className="relative w-[650px] h-[380px] bg-[#0c1a35]/60 rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] p-6">

                  {/* Building Blocks */}
                  <div className="absolute top-8 left-10 w-44 h-24 rounded-xl bg-gradient-to-br from-[#122b54] to-[#0c1b36] border border-cyan-400/50 shadow-[0_8px_20px_rgba(0,0,0,0.5)] p-2">
                    <div className="text-[10px] font-bold text-cyan-300">Academic Block A</div>
                    <div className="text-[9px] text-slate-400">Classrooms &amp; HOD Cabin</div>
                  </div>

                  <div className="absolute top-8 right-12 w-52 h-28 rounded-xl bg-gradient-to-br from-[#13305c] to-[#0c1b36] border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)] p-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-extrabold text-cyan-200">CSE Block (Lab - 1)</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/80 text-white font-bold">Target</span>
                    </div>
                    <div className="text-[9px] text-cyan-400/90 mt-1">Ground Floor • Advanced Labs</div>
                  </div>

                  <div className="absolute bottom-10 left-12 w-48 h-20 rounded-xl bg-gradient-to-br from-[#0f2447] to-[#0a1529] border border-cyan-500/30 p-2">
                    <div className="text-[10px] font-bold text-slate-300">Main Admin Block</div>
                    <div className="text-[9px] text-slate-400">Principal &amp; Accounts</div>
                  </div>

                  <div className="absolute bottom-10 right-14 w-40 h-20 rounded-xl bg-gradient-to-br from-[#0f2447] to-[#0a1529] border border-cyan-500/30 p-2">
                    <div className="text-[10px] font-bold text-slate-300">Campus Canteen</div>
                    <div className="text-[9px] text-slate-400">Cafeteria &amp; Dining</div>
                  </div>

                  {/* Walkable pathway & Neon cyan route line (SVG) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Dashed guide path */}
                    <path
                      d="M 120 280 L 220 280 L 260 160 L 420 160 L 480 80"
                      fill="none"
                      stroke="#00f2fe"
                      strokeWidth="4"
                      strokeDasharray="8 6"
                      className="animate-pulse"
                      filter="drop-shadow(0 0 8px #00f2fe)"
                    />
                    {/* Shadow glow line */}
                    <path
                      d="M 120 280 L 220 280 L 260 160 L 420 160 L 480 80"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="8"
                      opacity="0.3"
                    />
                  </svg>

                  {/* Start Location Pin (Blue) */}
                  <div className="absolute left-[105px] top-[260px] flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.8)] animate-bounce">
                      <Navigation className="w-4 h-4 text-white -rotate-45" />
                    </div>
                    <span className="mt-1 px-2 py-0.5 rounded bg-black/80 text-[9px] text-white font-bold whitespace-nowrap border border-blue-400">
                      Entrance
                    </span>
                  </div>

                  {/* Target Destination Pin (Red neon beacon matching reference image) */}
                  <div className="absolute right-[115px] top-[40px] flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-pulse">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="mt-1 px-2.5 py-1 rounded-md bg-black/90 border border-red-400 text-white text-[10px] font-extrabold whitespace-nowrap shadow-lg">
                      {selectedDestination?.name || "CSE Block (Lab - 1)"}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Map Canvas Floating Controls (+, -, Reset, 3D toggle) in Blueprint mode */}
            {navMode === 'blueprint' && (
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
                  className="w-9 h-9 rounded-xl bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 flex items-center justify-center hover:bg-cyan-500 hover:text-black shadow-lg transition-all"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.7))}
                  className="w-9 h-9 rounded-xl bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 flex items-center justify-center hover:bg-cyan-500 hover:text-black shadow-lg transition-all"
                  title="Zoom Out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setZoomLevel(1); setIs3DMode(true); }}
                  className="w-9 h-9 rounded-xl bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 flex items-center justify-center hover:bg-cyan-500 hover:text-black shadow-lg transition-all"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIs3DMode(!is3DMode)}
                  className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shadow-lg transition-all ${is3DMode
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.6)]'
                      : 'bg-[#09152b]/90 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500 hover:text-black'
                    }`}
                  title="Toggle Isometric 3D"
                >
                  3D
                </button>
              </div>
            )}
          </div>

          {/* Bottom Route Information Bar (matching reference image) */}
          <div className="mt-4 p-3.5 rounded-2xl bg-[#071124] border border-cyan-400/40 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
                <Footprints className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Route to {selectedDestination?.name || "Lab - 1"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">Optimal Walking Path</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
                  <span><strong>Distance:</strong> {selectedDestination?.distance || "120 m"}</span>
                  <span>•</span>
                  <span><strong>Time:</strong> {selectedDestination?.time || "~ 2 min"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStreetView(true)}
                className="px-4 py-2 rounded-xl bg-[#0a1835] border border-cyan-400/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Street View Photo</span>
              </button>
              <button
                onClick={() => setShowStreetView(true)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-xs tracking-wide shadow-[0_0_20px_rgba(0,242,254,0.6)] hover:shadow-[0_0_30px_rgba(0,242,254,0.9)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Navigate</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Street View Photographic Walkthrough Modal */}
      {showStreetView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#09152b] border border-cyan-400 shadow-[0_0_50px_rgba(0,242,254,0.4)] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-500/20 bg-[#060e20]">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Street View Walkthrough • {selectedDestination?.name}</span>
              </div>
              <button
                onClick={() => setShowStreetView(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Viewport */}
            <div className="relative h-96 w-full bg-black overflow-hidden group">
              <img
                src={activePhoto}
                alt="Corridor Photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>

              {/* Photo Waypoint HUD */}
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-black uppercase">
                    {selectedDestination?.category}
                  </span>
                  <h4 className="text-xl font-black text-white mt-1 drop-shadow-md">
                    {selectedDestination?.name}
                  </h4>
                  <p className="text-xs text-slate-300 drop-shadow">
                    {selectedDestination?.building} • {selectedDestination?.floor}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePhoto('/images/office.jpg')}
                    className="px-3 py-1.5 rounded-lg bg-black/70 border border-cyan-400/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500 hover:text-black transition-all"
                  >
                    Office Corridor
                  </button>
                  <button
                    onClick={() => setActivePhoto('/images/chamber.jpg')}
                    className="px-3 py-1.5 rounded-lg bg-black/70 border border-cyan-400/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500 hover:text-black transition-all"
                  >
                    Faculty Wing
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#060e20] border-t border-cyan-500/20 flex justify-between items-center text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Verified high-resolution photographic waypoint for Government Engineering College.</span>
              </div>
              <button
                onClick={() => setShowStreetView(false)}
                className="px-4 py-1.5 rounded-full bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors"
              >
                Close Walkthrough
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

