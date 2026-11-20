import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Search, 
  UploadCloud, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  X, 
  Filter, 
  Tag,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

export default function LostFound({ currentUser, onBack }) {
  // The database-backed Flask registry is the source of truth for reports,
  // images, claims, notifications, and admin actions. Keep the old React
  // preview out of the user workflow so students and faculty see real data.
  useEffect(() => {
    window.location.assign('/lost-found/');
  }, []);

  const [items, setItems] = useState([
    {
      id: 1,
      title: "Bag",
      category: "Personal Items",
      date_reported: "02 Nov",
      location: "Library Reading Hall",
      image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80",
      description: "Black waterproof Wildcraft backpack found near desk 14."
    },
    {
      id: 2,
      title: "ID Card",
      category: "ID Cards & Docs",
      date_reported: "01 Nov",
      location: "CSE Lab - 1",
      image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80",
      description: "College smart identity card found on keyboard tray."
    },
    {
      id: 3,
      title: "Watch",
      category: "Electronics",
      date_reported: "30 Oct",
      location: "Seminar Hall Lobby",
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
      description: "Noise ColorFit metallic smartwatch with black silicone strap."
    },
    {
      id: 4,
      title: "Spectacles",
      category: "Personal Items",
      date_reported: "28 Oct",
      location: "Canteen Counter 2",
      image_url: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=400&q=80",
      description: "Matte black rectangular spectacles inside a hard case."
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [claimModalItem, setClaimModalItem] = useState(null);
  const [claimProof, setClaimProof] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  // New item upload state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Personal Items');
  const [newLocation, setNewLocation] = useState('Campus Library');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  if (typeof window !== 'undefined') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-300">
        Opening the live Lost &amp; Found registry…
      </div>
    );
  }

  const filteredItems = items.filter(i => 
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReportSubmit = (e) => {
    e.preventDefault();
    const newItem = {
      id: Date.now(),
      title: newTitle || "Reported Item",
      category: newCategory,
      date_reported: "Today",
      location: newLocation,
      image_url: newImageUrl || "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
      description: newDescription || "Item reported on campus."
    };
    setItems([newItem, ...items]);
    setShowUploadModal(false);
    setNewTitle('');
    setNewDescription('');
    alert("Item reported successfully! Our visual feature extractor will compare candidate matches.");
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    setClaimSuccess(true);
    setTimeout(() => {
      setClaimSuccess(false);
      setClaimModalItem(null);
      setClaimProof('');
      alert("Claim request logged! Administrator will review your private proof statement and contact you.");
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-400">Current Module:</span>
          <span className="font-semibold text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-400/30">
            Lost &amp; Found Item Recovery Registry
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Report Lost Item Card (matching reference image) */}
        <div className="lg:col-span-1 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-400/40 p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col justify-between text-center h-[520px]">
          <div>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-cyan-950/60 border-2 border-dashed border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,242,254,0.3)]">
              <UploadCloud className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              Report Lost Item
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Upload photos and distinctive details. Our automated deep-learning visual matcher scans the registry for potential matches.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#060e20] border border-cyan-500/20 text-[11px] text-cyan-300/90 text-left space-y-1.5 mb-6">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Anti-Fraud Protection</span>
              </div>
              <p className="text-slate-400 leading-normal">
                Ownership proof statements remain confidential and visible only to system administrators.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:shadow-[0_0_35px_rgba(0,242,254,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Upload Item
          </button>
        </div>

        {/* Right Side: Search & Recently Found Items Grid (matching Page 5) */}
        <div className="lg:col-span-3 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between">
          
          {/* Search bar row */}
          <div className="mb-6">
            <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-400/90 mb-2">
              Search Lost Items
            </h4>
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by item name (e.g., Bag, ID Card, Phone)..."
                className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-[#060e20] border border-cyan-400/40 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_25px_rgba(0,242,254,0.4)] transition-all"
              />
              <button 
                className="absolute right-2.5 p-2 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors shadow-md"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section: Recently Found Items */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Recently Found Items
              </h3>
              <span className="text-xs text-slate-400">{filteredItems.length} items logged</span>
            </div>

            {/* Grid of 4 Items (matching reference image) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div 
                  key={item.id}
                  className="rounded-2xl bg-[#071124] border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Photo with category tag */}
                  <div className="relative h-40 w-full overflow-hidden bg-black/50">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
                      {item.category}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1 group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                        {item.description}
                      </p>
                      <div className="text-[10px] text-cyan-300/80 mb-3 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Found on {item.date_reported}</span>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <button
                      onClick={() => setClaimModalItem(item)}
                      className="w-full py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/50 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-blue-600 text-cyan-300 hover:text-white font-extrabold text-xs shadow-[0_0_10px_rgba(0,242,254,0.2)] hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all"
                    >
                      Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 mt-6 border-t border-cyan-500/15 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Lost belongings are deposited at Central Security Office (Ground Floor).</span>
            <span className="text-cyan-400 font-semibold">Active AI Similarity Cosine Ranker</span>
          </div>

        </div>

      </div>

      {/* Claim Modal */}
      {claimModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-[#09152b] border border-cyan-400 p-6 shadow-[0_0_40px_rgba(0,242,254,0.5)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Claim: {claimModalItem.title}</span>
              </h3>
              <button 
                onClick={() => setClaimModalItem(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {claimSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-bounce" />
                <h4 className="text-lg font-bold text-white mb-1">Claim Request Recorded</h4>
                <p className="text-xs text-slate-300">Administrative staff will verify and arrange handover.</p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20 text-xs text-slate-300">
                  <div className="font-bold text-white mb-1">Item Details</div>
                  <div>Location: {claimModalItem.location}</div>
                  <div>Reported Date: {claimModalItem.date_reported}</div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Proof Statement (Private description proving ownership)
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={claimProof}
                    onChange={(e) => setClaimProof(e.target.value)}
                    placeholder="Describe specific markings, contents, serial numbers or distinctive tags..."
                    className="w-full p-3 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimModalItem(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(0,242,254,0.5)]"
                  >
                    Submit Claim
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upload Item Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#09152b] border border-cyan-400 p-6 shadow-[0_0_40px_rgba(0,242,254,0.5)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <span>Report Lost / Found Belonging</span>
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Wireless Earbuds Case"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option>Personal Items</option>
                    <option>Electronics</option>
                    <option>ID Cards &amp; Docs</option>
                    <option>Books &amp; Stationery</option>
                    <option>Valuables</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location Reported</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. CSE Block 1st Floor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Photo Image URL</label>
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste photograph URL or use sample placeholder"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows="2"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Color, brand name, distinctive stickers..."
                  className="w-full p-3 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(0,242,254,0.5)]"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

