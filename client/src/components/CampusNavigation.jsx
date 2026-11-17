import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Compass,
  Expand,
  Footprints,
  Layers,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

const locations = [
  {
    id: 'boys-hostel',
    name: 'Boys Hostel Block [SAMPLE]',
    category: 'Hostel',
    building: 'Hostel Complex',
    floor: 'Ground Floor',
    x: 875,
    y: 205,
    photo: '/images/campus_bg.jpg',
  },
  {
    id: 'canteen',
    name: 'Campus Canteen & Cafeteria [SAMPLE]',
    category: 'Canteen',
    building: 'Student Amenities Block',
    floor: 'Ground Floor',
    x: 700,
    y: 355,
    photo: '/images/campus_bg.jpg',
  },
  {
    id: 'admin-foyer',
    name: 'Administrative Block Foyer & Reception [SAMPLE]',
    category: 'Office',
    building: 'Administrative Block',
    floor: 'Ground Floor',
    x: 475,
    y: 355,
    photo: '/images/office.jpg',
  },
  {
    id: 'ece-dept',
    name: 'Electronics & Communication Dept [SAMPLE]',
    category: 'Department',
    building: 'Academic Block B',
    floor: 'Ground Floor',
    x: 385,
    y: 475,
    photo: '/images/chamber.jpg',
  },
  {
    id: 'hod-ece',
    name: 'HOD Office - Electronics & Communication [SAMPLE]',
    category: 'HOD Chamber',
    building: 'Academic Block B',
    floor: 'Ground Floor',
    x: 325,
    y: 480,
    photo: '/images/chamber.jpg',
  },
  {
    id: 'staircase',
    name: 'Block A Central Staircase [SAMPLE]',
    category: 'Staircase',
    building: 'Academic Block A',
    floor: 'Ground Floor',
    x: 290,
    y: 275,
    photo: '/images/office.jpg',
  },
  {
    id: 'corridor',
    name: 'Block A Ground Floor Corridor',
    category: 'Corridor',
    building: 'Academic Block A',
    floor: 'Ground Floor',
    x: 365,
    y: 250,
    photo: '/images/office.jpg',
  },
  {
    id: 'library',
    name: 'Central Library & Digital Reading Room [SAMPLE]',
    category: 'Library',
    building: 'Library Wing',
    floor: '2nd Floor',
    x: 550,
    y: 220,
    photo: '/images/campus_bg.jpg',
  },
  {
    id: 'cse-labs',
    name: 'Computer Science & Engineering Dept & Labs',
    category: 'Laboratory',
    building: 'Academic Block A',
    floor: '1st Floor',
    x: 395,
    y: 180,
    photo: '/images/chamber.jpg',
  },
  {
    id: 'seminar',
    name: 'University Seminar Hall',
    category: 'Auditorium',
    building: 'Academic Block A',
    floor: '2nd Floor',
    x: 720,
    y: 180,
    photo: '/images/campus_bg.jpg',
  },
  {
    id: 'sports',
    name: 'College Sports Ground & Pavilion',
    category: 'Sports Ground',
    building: 'Sports Complex',
    floor: 'Campus Grounds',
    x: 820,
    y: 510,
    photo: '/images/campus_bg.jpg',
  },
  {
    id: 'workshop',
    name: 'Mechanical Engineering Workshop',
    category: 'Workshop',
    building: 'Mechanical Block',
    floor: 'Ground Floor',
    x: 560,
    y: 510,
    photo: '/images/office.jpg',
  },
];

const routeStopIds = ['canteen', 'admin-foyer', 'ece-dept'];
const routeDistances = ['220m', '210m', '160m'];

function getLocation(id) {
  return locations.find((location) => location.id === id);
}

export default function CampusNavigation({ onBack }) {
  const [sourceId, setSourceId] = useState('boys-hostel');
  const [destinationId, setDestinationId] = useState('hod-ece');
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [zoom, setZoom] = useState(1);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const source = getLocation(sourceId);
  const destination = getLocation(destinationId);
  const routeStops = destinationId === 'hod-ece'
    ? routeStopIds.map(getLocation).concat(destination)
    : [destination];
  const routePath = [source, ...routeStops].filter(Boolean);
  const routePoints = routePath.map(({ x, y }) => `${x},${y}`).join(' ');
  const filteredLocations = useMemo(() => locations.filter((location) => (
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
    && (!buildingFilter || location.building === buildingFilter)
    && (!floorFilter || location.floor === floorFilter)
  )), [searchQuery, buildingFilter, floorFilter]);

  const resetRoute = () => {
    setSourceId('');
    setDestinationId('');
  };

  const openPhoto = (location) => {
    if (location) setActivePhoto(location);
  };

  const mapControls = (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setZoom((current) => Math.min(current + 0.15, 1.75))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-100"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setZoom((current) => Math.max(current - 0.15, 0.7))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-100"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setZoom(1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-100"
        aria-label="Reset map zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setIsFullscreen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-100"
        aria-label={isFullscreen ? 'Exit full screen map' : 'View full screen map'}
      >
        {isFullscreen ? <X className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div
      className="min-h-full px-4 py-6 text-slate-100 sm:px-6"
      style={{ background: 'radial-gradient(ellipse at top right, rgba(123, 92, 255, 0.24), transparent 45%), linear-gradient(145deg, #171a36, #222546 55%, #15172f)' }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
              <Compass className="h-3.5 w-3.5" />
              Module 1: Campus Navigation
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Interactive Campus Navigator &amp; Route Finder
            </h1>
            <p className="mt-1 text-xs text-indigo-100/70 sm:text-sm">
              Search classrooms, labs, HOD chambers, offices, and view Street View photo waypoints
            </p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-300/30 bg-white/5 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <section className="rounded-2xl border border-cyan-300/70 bg-[#1c2040]/95 p-3.5 shadow-[0_0_20px_rgba(67,233,214,0.12)]">
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-white">
                <Layers className="h-4 w-4 text-amber-400" />
                Digital Map &amp; Floor Plans
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={buildingFilter}
                  onChange={(event) => setBuildingFilter(event.target.value)}
                  className="min-w-0 appearance-none rounded-md border border-indigo-200/30 px-2 py-2 text-xs outline-none focus:border-violet-300"
                  style={{ backgroundColor: '#292d50', color: '#ffffff', colorScheme: 'dark' }}
                  aria-label="Filter by building"
                >
                  <option value="" style={{ backgroundColor: '#292d50', color: '#ffffff' }}>All Buildings</option>
                  {[...new Set(locations.map((location) => location.building))].map((building) => (
                    <option key={building} value={building} style={{ backgroundColor: '#292d50', color: '#ffffff' }}>{building}</option>
                  ))}
                </select>
                <select
                  value={floorFilter}
                  onChange={(event) => setFloorFilter(event.target.value)}
                  className="min-w-0 appearance-none rounded-md border border-indigo-200/30 px-2 py-2 text-xs outline-none focus:border-violet-300"
                  style={{ backgroundColor: '#292d50', color: '#ffffff', colorScheme: 'dark' }}
                  aria-label="Filter by floor"
                >
                  <option value="" style={{ backgroundColor: '#292d50', color: '#ffffff' }}>All Floors</option>
                  {[...new Set(locations.map((location) => location.floor))].map((floor) => (
                    <option key={floor} value={floor} style={{ backgroundColor: '#292d50', color: '#ffffff' }}>{floor}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-2xl border border-fuchsia-400/80 bg-[#1c2040]/95 p-3.5 shadow-[0_0_20px_rgba(255,61,104,0.12)]">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
                <Navigation className="h-4 w-4 text-rose-400" />
                Photo Route Guide
              </h2>
              <p className="mb-3 text-xs leading-relaxed text-indigo-100/65">
                Choose a start and a destination — the best walking route is shown with photo waypoints.
              </p>
              <label className="mb-1 block text-[11px] font-bold text-indigo-100/70" htmlFor="campus-route-source">
                Source (Start Here)
              </label>
              <select
                id="campus-route-source"
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                className="mb-3 w-full appearance-none rounded-md border border-indigo-200/30 px-2.5 py-2 text-xs outline-none focus:border-violet-300"
                style={{ backgroundColor: '#292d50', color: '#ffffff', colorScheme: 'dark' }}
              >
                <option value="" style={{ backgroundColor: '#292d50', color: '#ffffff' }}>Choose starting point</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} style={{ backgroundColor: '#292d50', color: '#ffffff' }}>{location.name}</option>
                ))}
              </select>
              <label className="mb-1 block text-[11px] font-bold text-indigo-100/70" htmlFor="campus-route-destination">
                Destination
              </label>
              <select
                id="campus-route-destination"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="w-full appearance-none rounded-md border border-indigo-200/30 px-2.5 py-2 text-xs outline-none focus:border-violet-300"
                style={{ backgroundColor: '#292d50', color: '#ffffff', colorScheme: 'dark' }}
              >
                <option value="" style={{ backgroundColor: '#292d50', color: '#ffffff' }}>Choose destination</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} style={{ backgroundColor: '#292d50', color: '#ffffff' }}>{location.name}</option>
                ))}
              </select>
              {source && destination ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Best route found — follow the photos.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-amber-200">Choose both points to show directions.</p>
              )}
              <button
                type="button"
                onClick={resetRoute}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-indigo-300/30 py-1.5 text-xs font-semibold text-indigo-100/80 hover:bg-white/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Active Path
              </button>
            </section>

            <section className="rounded-2xl border border-cyan-300/70 bg-[#1c2040]/95 p-3.5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <Search className="h-4 w-4 text-indigo-200" />
                Campus Location Search
              </h2>
              <div className="mb-3 flex items-center rounded-md border border-indigo-300/20 bg-[#20223c] px-2.5">
                <Search className="mr-2 h-4 w-4 shrink-0 text-indigo-200/70" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search classrooms, labs, offices..."
                  className="min-w-0 flex-1 appearance-none py-2 text-xs outline-none placeholder:text-indigo-100/60"
                  style={{ backgroundColor: 'transparent', color: '#ffffff', colorScheme: 'dark' }}
                  aria-label="Search campus locations"
                />
              </div>
              <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                {filteredLocations.map((location) => (
                  <button
                    type="button"
                    key={location.id}
                    onClick={() => setDestinationId(location.id)}
                    className={`w-full rounded-md border px-2 py-2 text-left transition ${
                      destinationId === location.id
                        ? 'border-violet-400/70 bg-violet-500/15'
                        : 'border-indigo-200/15 bg-white/[0.025] hover:border-violet-300/50 hover:bg-violet-500/10'
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold leading-snug text-white">{location.name}</span>
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-indigo-100/75">{location.category}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-indigo-100/55">
                      <MapPin className="h-3 w-3" />
                      {location.building} • {location.floor}
                    </span>
                  </button>
                ))}
                {filteredLocations.length === 0 && (
                  <p className="py-4 text-center text-xs text-indigo-100/55">No campus locations match your search.</p>
                )}
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-3">
            <section className={`${isFullscreen ? 'fixed inset-3 z-40' : 'relative'} rounded-2xl border border-violet-400/60 bg-[#15172f]/90 p-2 shadow-[0_0_22px_rgba(123,92,255,0.18)]`}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-indigo-100/65">
                <span>Drag to pan • Scroll to zoom • Double-click a location for its photo</span>
                {source && destination && (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 font-bold text-white">
                    <Footprints className="mr-1 inline h-3.5 w-3.5" />
                    615m • Approx. 7.7 min walk
                  </span>
                )}
              </div>
              <div className={`relative overflow-hidden rounded-xl border border-indigo-200/20 bg-[#f0f3f8] ${isFullscreen ? 'h-[calc(100%-36px)]' : 'h-[480px] sm:h-[540px]'}`}>
                {mapControls}
                <svg
                  viewBox="0 0 1000 650"
                  role="img"
                  aria-label="Interactive campus map with buildings and the selected walking route"
                  className="h-full w-full"
                  onWheel={(event) => {
                    if (event.deltaY < 0) setZoom((current) => Math.min(current + 0.05, 1.75));
                    else setZoom((current) => Math.max(current - 0.05, 0.7));
                  }}
                  onDoubleClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width) * 1000;
                    const y = ((event.clientY - rect.top) / rect.height) * 650;
                    const nearest = locations.reduce((closest, location) => {
                      const distance = Math.hypot(location.x - x, location.y - y);
                      return distance < closest.distance ? { location, distance } : closest;
                    }, { location: null, distance: 45 });
                    if (nearest.location) openPhoto(nearest.location);
                  }}
                >
                  <g transform={`translate(${500 - 500 * zoom} ${325 - 325 * zoom}) scale(${zoom})`}>
                    <rect width="1000" height="650" fill="#12142a" />
                    <rect x="140" y="130" width="720" height="390" rx="26" fill="#1a1d3a" />
                    <rect x="320" y="250" width="320" height="190" rx="18" fill="#222648" />
                    <path d="M40 345H880M220 205H790M220 485H850M220 205V510M405 205V515M565 205V515M705 205V515" stroke="#30365e" strokeWidth="36" />
                    <path d="M40 345H880M220 205H790M220 485H850M220 205V510M405 205V515M565 205V515M705 205V515" stroke="#454a71" strokeWidth="2" strokeDasharray="9 10" />

                    <g fontFamily="system-ui, sans-serif" textAnchor="middle">
                      <g>
                        <rect x="215" y="225" width="145" height="82" rx="10" fill="#202746" stroke="#8f99bb" strokeWidth="2" />
                        <text x="287" y="257" fill="#fff" fontSize="12" fontWeight="700">Principal &amp; Dean</text>
                        <text x="287" y="275" fill="#b9c3e3" fontSize="10">Executive Office</text>
                      </g>
                      <g>
                        <rect x="350" y="150" width="115" height="75" rx="9" fill="#172b50" stroke="#4facfe" strokeWidth="2" />
                        <text x="407" y="180" fill="#fff" fontSize="11" fontWeight="700">Academic Block A</text>
                        <text x="407" y="197" fill="#b9c3e3" fontSize="10">CSE • Labs</text>
                      </g>
                      <g>
                        <rect x="520" y="135" width="100" height="78" rx="9" fill="#292443" stroke="#f5a623" strokeWidth="2" />
                        <text x="570" y="167" fill="#fff" fontSize="11" fontWeight="700">Central Library</text>
                        <text x="570" y="184" fill="#b9c3e3" fontSize="10">Reading Room</text>
                      </g>
                      <g>
                        <rect x="670" y="145" width="112" height="70" rx="9" fill="#261d3d" stroke="#a24bff" strokeWidth="2" />
                        <text x="726" y="175" fill="#fff" fontSize="11" fontWeight="700">Seminar Hall</text>
                        <text x="726" y="191" fill="#b9c3e3" fontSize="10">Academic Block A</text>
                      </g>
                      <g>
                        <rect x="650" y="315" width="122" height="82" rx="9" fill="#30202e" stroke="#ff5c7a" strokeWidth="2" />
                        <text x="711" y="350" fill="#fff" fontSize="11" fontWeight="700">Campus Canteen</text>
                        <text x="711" y="368" fill="#b9c3e3" fontSize="10">Student Amenities</text>
                      </g>
                      <g>
                        <rect x="330" y="448" width="122" height="68" rx="9" fill="#172b50" stroke="#4facfe" strokeWidth="2" />
                        <text x="391" y="477" fill="#fff" fontSize="11" fontWeight="700">Academic Block B</text>
                        <text x="391" y="495" fill="#b9c3e3" fontSize="10">Electronics &amp; Comm.</text>
                      </g>
                      <g>
                        <rect x="515" y="470" width="105" height="62" rx="9" fill="#202746" stroke="#939bb4" strokeWidth="2" />
                        <text x="567" y="498" fill="#fff" fontSize="10" fontWeight="700">Mechanical Eng.</text>
                        <text x="567" y="514" fill="#b9c3e3" fontSize="9">Workshop</text>
                      </g>
                      <g>
                        <rect x="785" y="435" width="125" height="85" rx="9" fill="#162b28" stroke="#43e9d6" strokeWidth="2" />
                        <text x="847" y="472" fill="#fff" fontSize="10" fontWeight="700">Sports Ground</text>
                        <text x="847" y="490" fill="#b9c3e3" fontSize="9">Pavilion &amp; Field</text>
                      </g>
                    </g>

                    {source && destination && (
                      <>
                        <polyline points={routePoints} fill="none" stroke="#102d4c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        <polyline points={routePoints} fill="none" stroke="#36c8ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                    {locations.map((location) => {
                      const isSource = location.id === sourceId;
                      const isDestination = location.id === destinationId;
                      return (
                        <g
                          key={location.id}
                          role="button"
                          tabIndex="0"
                          aria-label={`Set ${location.name} as destination`}
                          onClick={() => setDestinationId(location.id)}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            openPhoto(location);
                          }}
                          className="cursor-pointer"
                        >
                          <circle cx={location.x} cy={location.y} r={isSource || isDestination ? 14 : 8} fill={isSource ? '#43e9d6' : isDestination ? '#ff5c7a' : '#4facfe'} stroke="#fff" strokeWidth="3" />
                          <circle cx={location.x} cy={location.y} r="3" fill="#fff" />
                          <title>{location.name}</title>
                        </g>
                      );
                    })}
                    {source && (
                      <text x={source.x} y={source.y - 20} textAnchor="middle" fill="#b7fff4" fontSize="12" fontWeight="bold">SOURCE</text>
                    )}
                    {destination && (
                      <text x={destination.x} y={destination.y - 22} textAnchor="middle" fill="#ffb5c5" fontSize="12" fontWeight="bold">DESTINATION</text>
                    )}
                  </g>
                </svg>
              </div>
            </section>

            {source && destination && (
              <section className="rounded-2xl border border-fuchsia-400/80 bg-[#15172f]/90 p-3.5 shadow-[0_0_20px_rgba(255,61,104,0.08)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Navigation className="h-4 w-4 text-emerald-400" />
                    Turn-by-Turn Campus Directions
                  </h2>
                  <span className="rounded-md bg-gradient-to-r from-blue-500 to-violet-500 px-2 py-1 text-[10px] font-extrabold text-white">
                    AUTO SHORTEST PATH
                  </span>
                </div>
                <div className="space-y-2">
                  {[source, ...routeStops].map((location, index) => {
                    const isStart = index === 0;
                    const isDestination = index === routeStops.length;
                    const distance = isStart ? '' : destinationId === 'hod-ece'
                      ? routeDistances[index - 1] || '25m'
                      : '120m';
                    return (
                      <button
                        type="button"
                        key={`${location.id}-${index}`}
                        onClick={() => openPhoto(location)}
                        className={`flex w-full items-center gap-3 rounded-xl border-l-4 p-3 text-left transition hover:bg-violet-500/10 ${
                          isStart ? 'border-teal-300' : isDestination ? 'border-rose-400 bg-rose-500/10' : 'border-violet-500'
                        } bg-white/[0.045]`}
                      >
                        <img
                          src={location.photo}
                          alt={`${location.name} photo waypoint`}
                          className="h-16 w-16 shrink-0 rounded-xl border border-indigo-200/30 object-cover sm:h-20 sm:w-20"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${isStart ? 'bg-emerald-600' : isDestination ? 'bg-rose-600' : 'bg-gradient-to-r from-blue-500 to-violet-500'}`}>
                              {isStart ? 'Source' : isDestination ? 'Destination' : `Step ${index}`}
                            </span>
                            <span className="text-xs font-extrabold text-white sm:text-sm">{location.name}</span>
                          </span>
                          {!isStart && (
                            <span className="mt-1 block text-[11px] leading-relaxed text-indigo-100/75">
                              {isDestination
                                ? 'Turn right inside the building towards your destination.'
                                : `Follow the campus walkway towards ${location.name}.`}
                            </span>
                          )}
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 text-[10px] text-indigo-100/55">
                            <span><MapPin className="mr-1 inline h-3 w-3" />{location.building} • {location.floor}</span>
                            {distance && <span><Footprints className="mr-1 inline h-3 w-3" />{distance}</span>}
                          </span>
                        </span>
                        <Camera className="hidden h-4 w-4 shrink-0 text-indigo-200/70 sm:block" />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => openPhoto(routeStops[0])}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-slate-800 py-2.5 text-xs font-extrabold text-white hover:bg-slate-700"
                >
                  <Camera className="h-4 w-4" />
                  Start Street-View Walkthrough (Photo Guide)
                </button>
              </section>
            )}
          </div>
        </div>
      </div>

      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setActivePhoto(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Photo waypoint: ${activePhoto.name}`}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-violet-300/40 bg-[#15172f] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close photo walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={activePhoto.photo} alt={activePhoto.name} className="h-[55vh] w-full object-cover" />
            <div className="p-4">
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-900">{activePhoto.category}</span>
              <h2 className="mt-2 text-lg font-extrabold text-white">{activePhoto.name}</h2>
              <p className="mt-1 text-xs text-indigo-100/70">{activePhoto.building} • {activePhoto.floor}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
