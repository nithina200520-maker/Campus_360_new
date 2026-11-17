import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  X, 
  CheckCircle, 
  RotateCcw, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  CreditCard,
  Wallet,
  ChefHat,
  AlertCircle,
  Receipt,
  ChevronRight,
  Flame,
  Leaf,
  RefreshCw,
  Bell,
  Coffee,
  Check
} from 'lucide-react';

export default function SmartCanteen({ currentUser, onBack }) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'bookings', 'priority', 'refunds', 'history', 'kds'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('all'); // 'all', 'veg', 'specials'
  const [walletBalance, setWalletBalance] = useState(340); // Student RFID smart card balance in ₹

  // Full Canteen Menu with realistic South Indian & campus favorites
  const [menuItems, setMenuItems] = useState([
    {
      id: 1,
      name: "Idli (2 pcs)",
      category: "Breakfast",
      price: 20,
      image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
      description: "Steamed fluffy rice cakes served with hot drumstick sambar and coconut chutney.",
      prepTime: "2 min",
      calories: "160 kcal",
      isSpecial: false,
      counter: "Counter 2 (South Indian)",
      stockLeft: 34
    },
    {
      id: 2,
      name: "Masala Dosa",
      category: "Breakfast",
      price: 40,
      image_url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80",
      description: "Crispy golden crepe filled with spiced potato palya, served with red chutney & sambar.",
      prepTime: "4 min",
      calories: "320 kcal",
      isSpecial: true,
      counter: "Counter 2 (South Indian)",
      stockLeft: 22
    },
    {
      id: 3,
      name: "Veg Rice / Pulao",
      category: "Lunch",
      price: 60,
      image_url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80",
      description: "Aromatic basmati pulao cooked with garden fresh carrots, beans, peas, served with cucumber raita.",
      prepTime: "3 min",
      calories: "440 kcal",
      isSpecial: true,
      counter: "Counter 1 (Meals & Rice)",
      stockLeft: 18
    },
    {
      id: 4,
      name: "Ginger Cardamom Tea",
      category: "Beverages",
      price: 10,
      image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
      description: "Freshly brewed hot milk tea infused with grated ginger, crushed green cardamom & Assam leaves.",
      prepTime: "1 min",
      calories: "80 kcal",
      isSpecial: false,
      counter: "Counter 3 (Beverages)",
      stockLeft: 85
    },
    {
      id: 5,
      name: "Filter Coffee",
      category: "Beverages",
      price: 15,
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
      description: "Traditional Karnataka chicory decoction brewed filter coffee with velvety frothed milk.",
      prepTime: "2 min",
      calories: "95 kcal",
      isSpecial: true,
      counter: "Counter 3 (Beverages)",
      stockLeft: 60
    },
    {
      id: 6,
      name: "Vegetable Samosa (2 pcs)",
      category: "Snacks",
      price: 20,
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80",
      description: "Crispy fried golden triangular pastry stuffed with spicy cumin potatoes, green peas and mint dip.",
      prepTime: "2 min",
      calories: "280 kcal",
      isSpecial: false,
      counter: "Counter 1 (Snacks)",
      stockLeft: 40
    },
    {
      id: 7,
      name: "Poori Saagu (3 pcs)",
      category: "Breakfast",
      price: 40,
      image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80",
      description: "Puffed golden wheat pooris served with mild mixed vegetable potato saagu & coconut chutney.",
      prepTime: "5 min",
      calories: "380 kcal",
      isSpecial: false,
      counter: "Counter 2 (South Indian)",
      stockLeft: 16
    },
    {
      id: 8,
      name: "Curd Rice with Pomegranate",
      category: "Lunch",
      price: 35,
      image_url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=80",
      description: "Cooling creamy tempered curd rice seasoned with mustard, curry leaves, ginger & fresh pomegranate.",
      prepTime: "2 min",
      calories: "250 kcal",
      isSpecial: false,
      counter: "Counter 1 (Meals & Rice)",
      stockLeft: 25
    },
    {
      id: 9,
      name: "Fresh Mosambi Juice",
      category: "Beverages",
      price: 30,
      image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80",
      description: "100% natural cold pressed sweet lime juice with a pinch of black salt and roasted cumin.",
      prepTime: "3 min",
      calories: "110 kcal",
      isSpecial: true,
      counter: "Counter 3 (Beverages)",
      stockLeft: 30
    }
  ]);

  // Cart quantities state: default starting cart has 1 Idli and 1 Tea
  const [quantities, setQuantities] = useState({
    1: 1, // 1 Idli
    4: 1  // 1 Tea
  });

  // Advance booking form state
  const [bookingDate, setBookingDate] = useState('2026-11-14');
  const [timeSlot, setTimeSlot] = useState('12:30 PM - 01:00 PM (Lunch Break A)');
  const [isTeacherPriority, setIsTeacherPriority] = useState(currentUser?.role === 'teacher' || currentUser?.role === 'faculty');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('rfid'); // 'rfid', 'upi', 'cash'
  
  // Modals state
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [qrModalBooking, setQrModalBooking] = useState(null);
  const [receiptModalBooking, setReceiptModalBooking] = useState(null);

  // Active & Past Bookings State
  const [bookingsHistory, setBookingsHistory] = useState([
    {
      code: "CAN-8492",
      tokenNumber: "TK-42",
      date: "12 Nov 2026",
      slot: "12:30 PM - 01:00 PM (Lunch Break A)",
      itemsList: [
        { name: "Idli (2 pcs)", quantity: 1, price: 20 },
        { name: "Ginger Cardamom Tea", quantity: 1, price: 10 }
      ],
      items: "1x Idli (2 pcs), 1x Ginger Cardamom Tea",
      amount: 30,
      status: "Ready for Pickup", // 'Confirmed', 'Cooking', 'Ready for Pickup', 'Collected', 'Cancelled'
      pickupCounter: "Counter 2 (South Indian)",
      userName: currentUser?.name || "Nithin A",
      usn: currentUser?.usn || "4HG22CS045",
      isTeacher: false,
      paymentMethod: "College Smart Card RFID",
      qrToken: "SC360-TOKEN-8492",
      orderTime: "12:15 PM"
    },
    {
      code: "CAN-7210",
      tokenNumber: "TK-18",
      date: "10 Nov 2026",
      slot: "09:00 AM - 09:30 AM",
      itemsList: [
        { name: "Masala Dosa", quantity: 2, price: 40 },
        { name: "Filter Coffee", quantity: 1, price: 15 }
      ],
      items: "2x Masala Dosa, 1x Filter Coffee",
      amount: 95,
      status: "Collected",
      pickupCounter: "Counter 2 (South Indian)",
      userName: currentUser?.name || "Nithin A",
      usn: currentUser?.usn || "4HG22CS045",
      isTeacher: false,
      paymentMethod: "UPI QR (PhonePe)",
      qrToken: "SC360-TOKEN-7210",
      orderTime: "08:50 AM"
    }
  ]);

  // Refund records
  const [refundRecords, setRefundRecords] = useState([
    {
      refundId: "REF-9941",
      bookingCode: "CAN-6330",
      date: "08 Nov 2026",
      reason: "Class schedule extended by department; slot cancellation requested.",
      items: "1x Veg Rice / Pulao",
      amount: 60,
      status: "Approved & Credited",
      creditDestination: "Smart Card RFID Wallet (Ending ...045)"
    }
  ]);

  const categories = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages'];

  const timeSlotsInfo = [
    { slot: "08:30 AM - 09:00 AM (Breakfast 1)", rush: "Low", available: 38, tag: "🟢 Low Crowd" },
    { slot: "09:00 AM - 09:30 AM (Breakfast 2)", rush: "Moderate", available: 16, tag: "🟡 Moderate" },
    { slot: "12:30 PM - 01:00 PM (Lunch Break A)", rush: "High", available: 6, tag: "🔴 High Rush (Fast Filling)" },
    { slot: "01:00 PM - 01:30 PM (Lunch Break B)", rush: "Moderate", available: 22, tag: "🟡 Moderate" },
    { slot: "04:00 PM - 04:30 PM (Evening Snacks)", rush: "Low", available: 45, tag: "🟢 Low Crowd" }
  ];

  // Filtering Menu items
  const filteredMenu = menuItems.filter(item => {
    const matchCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiet = dietFilter === 'all' || 
                      (dietFilter === 'specials' && item.isSpecial);
    return matchCategory && matchSearch && matchDiet;
  });

  const handleQuantityChange = (itemId, delta) => {
    setQuantities(prev => {
      const current = prev[itemId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [itemId]: updated };
    });
  };

  const cartTotalItems = Object.values(quantities).reduce((acc, qty) => acc + qty, 0);

  const cartTotalPrice = Object.entries(quantities).reduce((acc, [id, qty]) => {
    const item = menuItems.find(m => m.id === Number(id));
    return acc + (item ? item.price * qty : 0);
  }, 0);

  // Booking Execution
  const handleBookNow = () => {
    if (cartTotalItems === 0) {
      alert("Your food tray is empty! Please choose at least 1 dish from the canteen menu.");
      return;
    }

    if (paymentMethod === 'rfid' && walletBalance < cartTotalPrice) {
      alert(`Insufficient RFID card balance (₹${walletBalance}). Please choose UPI or cash at counter.`);
      return;
    }

    const orderItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menuItems.find(m => m.id === Number(id));
        return { name: item.name, price: item.price, quantity: qty };
      });

    const tokenNum = `TK-${Math.floor(10 + Math.random() * 89)}`;
    const newBooking = {
      code: `CAN-${Math.floor(1000 + Math.random() * 9000)}`,
      tokenNumber: tokenNum,
      date: bookingDate,
      slot: timeSlot,
      itemsList: orderItems,
      items: orderItems.map(i => `${i.quantity}x ${i.name}`).join(', '),
      amount: cartTotalPrice,
      status: isTeacherPriority ? "Cooking" : "Confirmed",
      pickupCounter: orderItems.some(i => i.name.includes('Rice') || i.name.includes('Samosa')) ? "Counter 1 (Meals)" : "Counter 2 (South Indian)",
      userName: currentUser?.name || "Nithin A",
      usn: currentUser?.usn || "4HG22CS045",
      isTeacher: isTeacherPriority,
      paymentMethod: paymentMethod === 'rfid' ? "College Smart Card RFID" : paymentMethod === 'upi' ? "Instant UPI QR" : "Pay at Token Counter",
      qrToken: `SC360-PICKUP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      orderTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Deduct wallet if RFID was selected
    if (paymentMethod === 'rfid') {
      setWalletBalance(prev => prev - cartTotalPrice);
    }

    setBookingsHistory([newBooking, ...bookingsHistory]);
    setConfirmedBooking(newBooking);
    
    // Reset cart
    setQuantities({});
  };

  // Cancel & Refund
  const handleCancelOrder = (booking) => {
    if (confirm(`Cancel booking ${booking.code} for ₹${booking.amount}? The full amount will be immediately credited back to your RFID wallet.`)) {
      setBookingsHistory(prev => prev.map(b => b.code === booking.code ? { ...b, status: 'Cancelled' } : b));
      
      const newRefund = {
        refundId: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        bookingCode: booking.code,
        date: "Today",
        reason: "User voluntary cancellation before pickup slot.",
        items: booking.items,
        amount: booking.amount,
        status: "Approved & Credited",
        creditDestination: "Smart Card RFID Wallet (Ending ...045)"
      };

      setRefundRecords([newRefund, ...refundRecords]);
      setWalletBalance(prev => prev + booking.amount);
      alert(`Booking ${booking.code} cancelled. ₹${booking.amount} credited back to your RFID wallet balance!`);
    }
  };

  // Re-order past order in 1 click
  const handleReorder = (booking) => {
    const newQty = {};
    booking.itemsList.forEach(orderItem => {
      const match = menuItems.find(m => m.name === orderItem.name);
      if (match) {
        newQty[match.id] = orderItem.quantity;
      }
    });
    setQuantities(newQty);
    setActiveTab('menu');
    setShowCartDrawer(true);
  };

  // Kitchen Display Status advancement (Staff Terminal)
  const advanceOrderStatus = (bookingCode, nextStatus) => {
    setBookingsHistory(prev => prev.map(b => {
      if (b.code === bookingCode) {
        return { ...b, status: nextStatus };
      }
      return b;
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      
      {/* Top Header Strip with Back Button & Wallet pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09162e]/90 border border-cyan-400/40 text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all text-xs font-bold group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping"></span>
            <span className="text-xs text-cyan-300 font-semibold hidden sm:inline">
              Campus Cafeteria Counter Live
            </span>
          </div>
        </div>

        {/* Right Info: RFID Smart Card Balance & Active Tokens */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#060e20] border border-cyan-500/30 text-xs">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">RFID Card:</span>
            <span className="font-extrabold text-cyan-300">₹{walletBalance}</span>
            <button 
              onClick={() => { setWalletBalance(prev => prev + 100); alert("₹100 top-up added to College RFID Card!"); }}
              className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-black font-bold"
              title="Quick top-up ₹100"
            >
              +₹100
            </button>
          </div>

          <button
            onClick={() => setActiveTab('bookings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Tokens:</span>
            <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center font-extrabold text-[10px]">
              {bookingsHistory.filter(b => b.status !== 'Collected' && b.status !== 'Cancelled').length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Sub-Navigation + Main Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sub-Navigation Menu (matching reference image) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] h-fit space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 px-3 py-1 flex items-center justify-between">
            <span>Canteen Portal</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          
          <button
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </div>
            {bookingsHistory.some(b => b.status === 'Ready for Pickup') && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'priority'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Teacher Priority</span>
          </button>

          <button
            onClick={() => setActiveTab('refunds')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'refunds'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refund Requests</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Order History</span>
          </button>

          {/* Special Kitchen Display System Terminal Switcher */}
          <div className="pt-3 border-t border-cyan-500/20">
            <button
              onClick={() => setActiveTab('kds')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-[#060e20] text-amber-300 border border-amber-500/30 hover:bg-amber-500/10'
              }`}
              title="Canteen Staff Kitchen Terminal to manage active orders"
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>Kitchen Staff Terminal</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CANTEEN MENU & ADVANCE BOOKING VIEW (matching Page 6 of reference) */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <>
            {/* Center: Main Canteen Menu */}
            <div className="lg:col-span-7 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between">
              
              <div>
                {/* Header Row: Title, Search, and My Cart Button */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <span>Canteen Menu</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/40 text-green-300">
                        100% Pure Veg
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Government Engineering College Kitchen Counter</p>
                  </div>

                  {/* My Cart Button (matching reference image) */}
                  <button 
                    onClick={() => setShowCartDrawer(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500 hover:text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>My Cart ({cartTotalItems})</span>
                  </button>
                </div>

                {/* Search & Dietary Filters Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                  <div className="sm:col-span-8 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search food items (e.g. Masala Dosa, Tea, Rice)..."
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#060e20] border border-cyan-500/30 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-300"
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <button
                      onClick={() => setDietFilter('all')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        dietFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400' : 'bg-[#060e20] text-slate-400 border border-cyan-500/20'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDietFilter(dietFilter === 'specials' ? 'all' : 'specials')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        dietFilter === 'specials' ? 'bg-amber-500/20 text-amber-300 border border-amber-400' : 'bg-[#060e20] text-slate-400 border border-cyan-500/20'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Special</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills (matching reference image) */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,242,254,0.6)]'
                          : 'bg-[#071124] text-slate-300 border border-cyan-500/20 hover:border-cyan-400/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Dishes Catalog Grid (matching reference image) */}
                {filteredMenu.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No dishes found matching your query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMenu.map((item) => {
                      const qty = quantities[item.id] || 0;
                      return (
                        <div 
                          key={item.id}
                          className="rounded-2xl bg-[#071124] border border-cyan-500/30 hover:border-cyan-400/80 p-3 shadow-[0_0_15px_rgba(6,182,212,0.12)] hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Dish Image */}
                            <div className="relative h-32 w-full rounded-xl overflow-hidden mb-2.5 bg-black/40">
                              <img 
                                src={item.image_url} 
                                alt={item.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                                {item.isSpecial && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black shadow-md flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" /> Special
                                  </span>
                                )}
                              </div>
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-black/80 text-cyan-300 border border-cyan-500/40">
                                {item.category}
                              </span>
                            </div>

                            {/* Name, Nutrition & Price */}
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition-colors">
                                {item.name}
                              </h4>
                              <div className="text-sm font-extrabold text-cyan-300">
                                ₹{item.price}
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight mb-2">
                              {item.description}
                            </p>

                            <div className="flex items-center gap-2 text-[9px] text-slate-400 mb-3">
                              <span className="flex items-center gap-1 text-slate-300">
                                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                {item.prepTime}
                              </span>
                              <span>•</span>
                              <span>{item.calories}</span>
                              <span>•</span>
                              <span className="text-green-400 font-semibold">{item.stockLeft} left</span>
                            </div>
                          </div>

                          {/* Quantity Control Pill (- [qty] +) */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#0a1835] border border-cyan-500/30">
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black flex items-center justify-center text-slate-300 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-extrabold text-sm text-white px-2">{qty}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom informational footer */}
              <div className="pt-4 mt-6 border-t border-cyan-500/20 text-xs text-slate-400 flex flex-wrap justify-between items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-green-400" />
                  <span>College subsidized dining rates apply. Pure vegetarian hygiene kitchen certified.</span>
                </span>
                <span className="text-cyan-300 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Automated Counter Routing Active</span>
                </span>
              </div>
            </div>

            {/* Right Sidebar: Advance Booking (matching Page 6 of reference) */}
            <div className="lg:col-span-3 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-400/40 p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Advance Booking</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/30 text-cyan-300 font-bold">
                    Slot Queue
                  </span>
                </div>

                {/* Date Selector */}
                <div className="mb-3.5">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select Date</span>
                    </span>
                    <span className="text-[10px] text-cyan-300 font-medium">Valid for 3 Days Ahead</span>
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-300"
                  />
                </div>

                {/* Time Slot Selector with occupancy indicator */}
                <div className="mb-3.5">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select Time Slot</span>
                    </span>
                    <span className="text-[10px] text-green-400 font-bold">Slots Open</span>
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#060e20] border border-cyan-500/40 text-white text-xs focus:outline-none focus:border-cyan-300"
                  >
                    {timeSlotsInfo.map((s, idx) => (
                      <option key={idx} value={s.slot}>
                        {s.slot} — {s.tag}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher Priority Toggle */}
                <div className="p-3 rounded-xl bg-[#071124] border border-cyan-500/20 mb-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Teacher-First Priority</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTeacherPriority(!isTeacherPriority)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                        isTeacherPriority 
                          ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isTeacherPriority ? 'Active ✓' : 'Enable'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    {isTeacherPriority 
                      ? 'Elevated priority: Token is assigned to Counter 1 Faculty Express Window.'
                      : 'Students have normal queueing. Staff/faculty can toggle for express lane.'}
                  </p>
                </div>

                {/* Payment Option Selector */}
                <div className="mb-3.5">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    Payment Gateway
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('rfid')}
                      className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'rfid'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-[#060e20] border-cyan-500/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Smart Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'upi'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-[#060e20] border-cyan-500/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-[#060e20] border-cyan-500/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Counter Cash</span>
                    </button>
                  </div>
                </div>

                {/* Live Order Summary */}
                <div className="p-3.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Selected Items:</span>
                    <span className="text-white font-bold">{cartTotalItems} items</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Pickup Window:</span>
                    <span className="text-cyan-300 font-medium">{timeSlot.split(' ')[0]} {timeSlot.split(' ')[1]}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Payment via:</span>
                    <span className="text-slate-300 capitalize">{paymentMethod === 'rfid' ? 'RFID Card' : paymentMethod.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-cyan-500/20">
                    <span>Payable Total:</span>
                    <span className="text-cyan-300 text-base">₹{cartTotalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Book Now Button (matching Page 6 of reference) */}
              <button
                onClick={handleBookNow}
                className="w-full py-3.5 mt-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white font-extrabold text-xs tracking-wide shadow-[0_0_25px_rgba(0,242,254,0.6)] hover:shadow-[0_0_35px_rgba(0,242,254,0.9)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Book Now &amp; Generate Token
              </button>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY BOOKINGS VIEW (Live Order Tracking & Token QR Display) */}
        {/* ========================================================================= */}
        {activeTab === 'bookings' && (
          <div className="lg:col-span-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-4 mb-6 border-b border-cyan-500/20">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>My Active Bookings &amp; Pickup Tokens</span>
                </h3>
                <p className="text-xs text-slate-400">Live order status and digital queue passes for campus counters</p>
              </div>

              <button 
                onClick={() => setActiveTab('menu')}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-extrabold text-xs shadow-md hover:bg-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book Another Meal</span>
              </button>
            </div>

            {bookingsHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No active bookings found. Visit the menu to reserve your meal slot!
              </div>
            ) : (
              <div className="space-y-4">
                {bookingsHistory.map((booking) => {
                  const isReady = booking.status === 'Ready for Pickup';
                  const isCooking = booking.status === 'Cooking';
                  const isCancelled = booking.status === 'Cancelled';
                  const isCollected = booking.status === 'Collected';

                  return (
                    <div 
                      key={booking.code}
                      className={`p-5 rounded-2xl bg-[#071124] border transition-all ${
                        isReady 
                          ? 'border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.35)]'
                          : isCancelled
                          ? 'border-slate-800 opacity-60'
                          : 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          {/* Token Number Badge */}
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${
                            isReady 
                              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse'
                              : 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-300'
                          }`}>
                            <span className="text-[10px] uppercase font-bold tracking-tighter">Token</span>
                            <span className="text-base leading-none">{booking.tokenNumber}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-extrabold text-white">{booking.code}</h4>
                              {booking.isTeacher && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 border border-amber-400 text-amber-300">
                                  Teacher Priority
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">{booking.items}</p>
                            <div className="text-[11px] text-cyan-400/90 mt-1">
                              📍 Pickup: <strong className="text-white">{booking.pickupCounter}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Action buttons */}
                        <div className="flex flex-col sm:items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isReady 
                              ? 'bg-green-500/20 border border-green-400 text-green-300 animate-pulse'
                              : isCooking
                              ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                              : isCollected
                              ? 'bg-blue-500/20 border border-blue-400 text-blue-300'
                              : isCancelled
                              ? 'bg-red-500/20 border border-red-400 text-red-300'
                              : 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                          }`}>
                            {booking.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            Slot: <strong className="text-white">{booking.slot.split(' ')[0]} {booking.slot.split(' ')[1]}</strong>
                          </span>
                        </div>
                      </div>

                      {/* 4-Step Visual Progress Tracker */}
                      {!isCancelled && (
                        <div className="py-3 px-4 rounded-xl bg-[#060e20] border border-cyan-500/20 mb-4">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                            <span className={booking.status !== 'Cancelled' ? 'text-cyan-300' : ''}>1. Order Confirmed</span>
                            <span className={isCooking || isReady || isCollected ? 'text-cyan-300' : ''}>2. Kitchen Preparing</span>
                            <span className={isReady || isCollected ? 'text-green-400 font-extrabold' : ''}>3. Ready at Counter</span>
                            <span className={isCollected ? 'text-blue-400' : ''}>4. Collected</span>
                          </div>

                          <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-700"
                              style={{ 
                                width: isCollected ? '100%' : isReady ? '75%' : isCooking ? '50%' : '25%' 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyan-500/15 text-xs">
                        <div className="text-slate-300">
                          Paid: <strong className="text-cyan-300">₹{booking.amount}</strong> via {booking.paymentMethod}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCancelled && !isCollected && (
                            <>
                              <button
                                onClick={() => setQrModalBooking(booking)}
                                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Show Digital QR Voucher</span>
                              </button>
                              
                              <button
                                onClick={() => handleCancelOrder(booking)}
                                className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 font-bold hover:bg-red-900/60 transition-all cursor-pointer"
                              >
                                Cancel &amp; Refund
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setReceiptModalBooking(booking)}
                            className="px-3 py-1.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-slate-300 font-medium hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TEACHER PRIORITY VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'priority' && (
          <div className="lg:col-span-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyan-500/20">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Teacher &amp; Faculty Priority Dining</span>
                </h3>
                <p className="text-xs text-slate-400">Fast-track dining privileges and executive catering for college staff</p>
              </div>

              <div className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Zero Wait Lane Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="p-5 rounded-2xl bg-[#071124] border border-amber-500/30 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3">
                  <Coffee className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Express Tea &amp; Coffee</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant beverage dispatch directly to staff room or Counter 1 pickup window with 0 waiting time.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#071124] border border-amber-500/30 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Reserved Slot Capacity</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  25% of kitchen capacity in every 30-minute block is strictly reserved for faculty and guest dignitaries.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#071124] border border-amber-500/30 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Department Direct Billing</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Meeting refreshments can be billed directly to college departmental grants with auto-generated vouchers.
                </p>
              </div>
            </div>

            {/* Faculty Specials Pre-Order Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d2242] to-[#08152e] border border-cyan-400/40 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-400 text-black uppercase">
                  Staff Special
                </span>
                <h4 className="text-lg font-bold text-white mt-1">Faculty High-Tea &amp; Snacks Combo</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Includes 1x Filter Coffee or Ginger Tea + 2x Warm Samosa + Mysore Pak sweet.
                </p>
              </div>
              <button
                onClick={() => {
                  setQuantities({ 5: 1, 6: 1 });
                  setIsTeacherPriority(true);
                  setActiveTab('menu');
                  setShowCartDrawer(true);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-xs shadow-lg hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                Order Staff Combo (₹35)
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REFUND REQUESTS VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'refunds' && (
          <div className="lg:col-span-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyan-500/20">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-cyan-400" />
                  <span>Refund Requests &amp; Wallet Crediting</span>
                </h3>
                <p className="text-xs text-slate-400">Automated cancellation ledger and instant Smart Card balance refunds</p>
              </div>

              <div className="text-xs text-slate-300">
                Current RFID Balance: <strong className="text-cyan-300 text-sm">₹{walletBalance}</strong>
              </div>
            </div>

            {/* Refund Policy Banner */}
            <div className="p-4 rounded-2xl bg-[#060e20] border border-cyan-500/30 mb-6 flex items-start gap-3 text-xs text-slate-300">
              <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">College Canteen 100% Refund Guarantee</strong>
                <span>
                  Any booking cancelled up to 10 minutes before the scheduled time slot receives an instant 100% credit directly to your student RFID card. No cancellation fee.
                </span>
              </div>
            </div>

            {/* Refund Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cyan-500/20 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3 px-3">Refund ID</th>
                    <th className="pb-3 px-3">Booking Code</th>
                    <th className="pb-3 px-3">Items Cancelled</th>
                    <th className="pb-3 px-3">Amount</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Credited To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {refundRecords.map((r) => (
                    <tr key={r.refundId} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono text-cyan-300 font-bold">{r.refundId}</td>
                      <td className="py-3 px-3 text-white font-semibold">{r.bookingCode}</td>
                      <td className="py-3 px-3 text-slate-300">{r.items}</td>
                      <td className="py-3 px-3 font-bold text-green-400">₹{r.amount}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 border border-green-400 text-green-300">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">{r.creditDestination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: HISTORY VIEW */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="lg:col-span-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyan-500/20">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span>Order History &amp; Past Receipts</span>
                </h3>
                <p className="text-xs text-slate-400">Review your past college meal bookings and reorder favorites in 1 click</p>
              </div>
            </div>

            <div className="space-y-3">
              {bookingsHistory.map((b) => (
                <div 
                  key={b.code}
                  className="p-4 rounded-2xl bg-[#071124] border border-cyan-500/20 flex flex-wrap justify-between items-center gap-4 hover:border-cyan-400/40 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{b.code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-cyan-300 font-mono">
                        {b.tokenNumber}
                      </span>
                      <span className="text-xs text-slate-400">• {b.date} ({b.slot.split(' ')[0]})</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{b.items}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-cyan-300">₹{b.amount}</div>
                      <div className="text-[10px] text-slate-400">{b.status}</div>
                    </div>

                    <button
                      onClick={() => handleReorder(b)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reorder</span>
                    </button>

                    <button
                      onClick={() => setReceiptModalBooking(b)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="View Receipt"
                    >
                      <Receipt className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: KITCHEN DISPLAY SYSTEM (KDS / CANTEEN STAFF TERMINAL) */}
        {/* ========================================================================= */}
        {activeTab === 'kds' && (
          <div className="lg:col-span-10 rounded-3xl bg-[#09152b]/85 backdrop-blur-xl border border-amber-500/40 p-6 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-amber-500/30">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-400 text-amber-300 mb-1">
                  <ChefHat className="w-4 h-4" />
                  <span>Kitchen Display Terminal (KDS) • Canteen Staff Mode</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">Live Kitchen Orders Queue</h3>
                <p className="text-xs text-slate-400">Simulate canteen kitchen operations: advance tokens through cooking and pickup calls</p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('menu')}
                  className="px-3 py-1.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Return to Student View
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookingsHistory.map((order) => {
                const isReady = order.status === 'Ready for Pickup';
                const isCooking = order.status === 'Cooking';
                const isCollected = order.status === 'Collected';
                const isCancelled = order.status === 'Cancelled';

                return (
                  <div 
                    key={order.code}
                    className={`p-4 rounded-2xl bg-[#071124] border flex flex-col justify-between ${
                      isReady 
                        ? 'border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : isCooking
                        ? 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isCancelled
                        ? 'border-slate-800 opacity-50'
                        : 'border-cyan-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-black text-amber-300">{order.tokenNumber}</span>
                        <span className="text-xs font-mono text-slate-400">{order.code}</span>
                      </div>

                      <div className="text-xs font-bold text-white mb-2">
                        {order.userName} ({order.usn})
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#060e20] border border-cyan-500/20 text-xs text-slate-300 mb-3 space-y-1">
                        {order.itemsList.map((i, idx) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>{i.quantity}x {i.name}</span>
                            <span className="text-cyan-300">₹{i.price * i.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-400 mb-4">
                        Counter: <strong className="text-white">{order.pickupCounter}</strong>
                      </div>
                    </div>

                    {/* Staff status advance buttons */}
                    <div className="space-y-1.5 pt-2 border-t border-cyan-500/15">
                      {!isCancelled && !isCollected && (
                        <>
                          {order.status === 'Confirmed' && (
                            <button
                              onClick={() => advanceOrderStatus(order.code, 'Cooking')}
                              className="w-full py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow hover:bg-amber-400 transition-all cursor-pointer"
                            >
                              🔥 Start Cooking Order
                            </button>
                          )}

                          {order.status === 'Cooking' && (
                            <button
                              onClick={() => advanceOrderStatus(order.code, 'Ready for Pickup')}
                              className="w-full py-2 rounded-xl bg-green-500 text-black font-extrabold text-xs shadow hover:bg-green-400 transition-all cursor-pointer"
                            >
                              🔔 Call for Pickup ({order.pickupCounter})
                            </button>
                          )}

                          {order.status === 'Ready for Pickup' && (
                            <button
                              onClick={() => advanceOrderStatus(order.code, 'Collected')}
                              className="w-full py-2 rounded-xl bg-cyan-500 text-black font-extrabold text-xs shadow hover:bg-cyan-400 transition-all cursor-pointer"
                            >
                              ✓ Verify Token &amp; Mark Handed Over
                            </button>
                          )}
                        </>
                      )}

                      {isCollected && (
                        <div className="text-center py-1 text-xs text-green-400 font-bold flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" />
                          <span>Order Completed &amp; Collected</span>
                        </div>
                      )}

                      {isCancelled && (
                        <div className="text-center py-1 text-xs text-red-400 font-bold">
                          Order Cancelled by Student
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: BOOKING SUCCESS CONFIRMATION MODAL WITH DIGITAL QR TOKEN */}
      {/* ========================================================================= */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#09152b] border border-cyan-400 p-6 shadow-[0_0_50px_rgba(0,242,254,0.6)] text-center">
            <CheckCircle className="w-12 h-12 text-cyan-400 mx-auto mb-2 animate-bounce" />
            <h3 className="text-xl font-black text-white mb-1">Canteen Booking Confirmed!</h3>
            <p className="text-xs text-slate-300 mb-4">
              Your pickup token has been registered in the kitchen queue.
            </p>

            {/* Token Highlight Box */}
            <div className="py-2.5 px-4 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 mb-4 flex justify-between items-center text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pickup Token</span>
                <div className="text-2xl font-black text-white tracking-wider">{confirmedBooking.tokenNumber}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Window</span>
                <div className="text-xs font-bold text-cyan-300">{confirmedBooking.pickupCounter}</div>
              </div>
            </div>

            {/* QR Code container */}
            <div className="p-4 mx-auto w-44 h-44 rounded-2xl bg-white flex flex-col items-center justify-center shadow-lg mb-4">
              <QrCode className="w-32 h-32 text-slate-900" />
              <span className="text-[10px] font-black tracking-widest text-slate-800">{confirmedBooking.code}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060e20] border border-cyan-500/30 text-xs text-left space-y-1.5 mb-5 text-slate-300">
              <div className="flex justify-between">
                <span>Booking Code:</span>
                <strong className="text-cyan-300 font-mono">{confirmedBooking.code}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date &amp; Slot:</span>
                <strong className="text-white">{confirmedBooking.date} • {confirmedBooking.slot.split(' ')[0]}</strong>
              </div>
              <div className="flex justify-between">
                <span>Dishes:</span>
                <strong className="text-white text-right max-w-[200px] truncate">{confirmedBooking.items}</strong>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <strong className="text-green-400 font-bold">₹{confirmedBooking.amount}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmedBooking(null); setActiveTab('bookings'); }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs shadow-md hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                Track Live Order
              </button>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="py-2.5 px-4 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors cursor-pointer"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STANDALONE DIGITAL QR TOKEN VOUCHER */}
      {/* ========================================================================= */}
      {qrModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#09152b] border border-cyan-400 p-6 shadow-[0_0_50px_rgba(0,242,254,0.6)] text-center">
            <button 
              onClick={() => setQrModalBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-cyan-950 border border-cyan-400/50 text-cyan-300 uppercase tracking-widest mb-3 inline-block">
              Digital Food Token Pass
            </span>

            <h3 className="text-3xl font-black text-white mt-1 mb-1">
              {qrModalBooking.tokenNumber}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {qrModalBooking.code} • {qrModalBooking.userName}
            </p>

            <div className="p-4 mx-auto w-48 h-48 rounded-2xl bg-white flex flex-col items-center justify-center shadow-2xl mb-4">
              <QrCode className="w-36 h-36 text-slate-900" />
              <span className="text-[10px] font-black tracking-widest text-slate-800 mt-1">{qrModalBooking.qrToken}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/30 text-xs text-left space-y-1 mb-4 text-slate-300">
              <div className="flex justify-between">
                <span>Counter:</span>
                <strong className="text-cyan-300">{qrModalBooking.pickupCounter}</strong>
              </div>
              <div className="flex justify-between">
                <span>Time Slot:</span>
                <strong className="text-white">{qrModalBooking.slot}</strong>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <strong className="text-white truncate max-w-[180px]">{qrModalBooking.items}</strong>
              </div>
            </div>

            <button
              onClick={() => { alert("Token downloaded to device gallery!"); setQrModalBooking(null); }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-extrabold text-xs shadow-md cursor-pointer"
            >
              Save Token to Phone
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ITEM RECEIPT MODAL */}
      {/* ========================================================================= */}
      {receiptModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#081326] border border-cyan-400/40 p-6 shadow-2xl text-left">
            <button 
              onClick={() => setReceiptModalBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 mb-4 border-b border-dashed border-cyan-500/30">
              <div className="text-xs uppercase font-extrabold tracking-wider text-cyan-300">
                Government Engineering College, Hassan
              </div>
              <div className="text-[11px] text-slate-400">Campus Cafeteria E-Tax Invoice</div>
              <div className="text-sm font-black text-white mt-1">Receipt #{receiptModalBooking.code}</div>
            </div>

            <div className="text-xs space-y-2 mb-4 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{receiptModalBooking.userName} ({receiptModalBooking.usn})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date &amp; Time:</span>
                <span>{receiptModalBooking.date} • {receiptModalBooking.slot.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment:</span>
                <span>{receiptModalBooking.paymentMethod}</span>
              </div>
            </div>

            <div className="py-3 border-t border-b border-dashed border-cyan-500/30 space-y-1.5 text-xs">
              {receiptModalBooking.itemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-200">
                  <span>{item.quantity} × {item.name}</span>
                  <span className="font-bold">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 mb-6 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>₹{receiptModalBooking.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Student Campus Subsidy (GST 0%):</span>
                <span>₹0</span>
              </div>
              <div className="flex justify-between text-base font-black text-cyan-300 pt-1 border-t border-cyan-500/20">
                <span>Total Paid:</span>
                <span>₹{receiptModalBooking.amount}</span>
              </div>
            </div>

            <button
              onClick={() => { alert("Official receipt printed / saved!"); setReceiptModalBooking(null); }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs shadow-md hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              Print / Save PDF Receipt
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: FOOD CART TRAY */}
      {/* ========================================================================= */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#09152b] border-l border-cyan-500/30 p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-cyan-500/20">
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cyan-400" />
                  <span>My Food Tray ({cartTotalItems})</span>
                </h3>
                <button onClick={() => setShowCartDrawer(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartTotalItems === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">
                  Your food tray is empty. Add delicious campus dishes from the menu!
                </div>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {Object.entries(quantities).map(([id, qty]) => {
                    if (qty <= 0) return null;
                    const item = menuItems.find(m => m.id === Number(id));
                    if (!item) return null;
                    return (
                      <div key={id} className="p-3.5 rounded-2xl bg-[#060e20] border border-cyan-500/20 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-white">{item.name}</div>
                          <div className="text-[11px] text-cyan-300 font-semibold">
                            ₹{item.price} × {qty} = <span className="font-extrabold">₹{item.price * qty}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleQuantityChange(item.id, -1)} 
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-cyan-500 hover:text-black text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-white px-1">{qty}</span>
                          <button 
                            onClick={() => handleQuantityChange(item.id, 1)} 
                            className="w-7 h-7 rounded-lg bg-cyan-500 text-black flex items-center justify-center text-xs font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-cyan-500/20">
              <div className="p-3 rounded-xl bg-[#060e20] border border-cyan-500/20 mb-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Slot:</span>
                  <span className="text-cyan-300 font-medium">{timeSlot.split(' ')[0]} {timeSlot.split(' ')[1]}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-1">
                  <span>Tray Total:</span>
                  <span className="text-cyan-300">₹{cartTotalPrice}</span>
                </div>
              </div>

              <button
                onClick={() => { setShowCartDrawer(false); handleBookNow(); }}
                disabled={cartTotalItems === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:shadow-[0_0_30px_rgba(0,242,254,0.8)] disabled:opacity-50 cursor-pointer"
              >
                Confirm Slot &amp; Book Meal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
