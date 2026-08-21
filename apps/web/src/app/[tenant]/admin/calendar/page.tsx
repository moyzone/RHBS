"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { 
  X, Edit2, Check, Search, ChevronLeft, ChevronRight, 
  Calendar as CalendarIcon, ChevronDown, CreditCard, LogIn, LogOut, 
  BedDouble, CheckCircle, AlertTriangle, Brush, ShieldCheck, Filter 
} from 'lucide-react';

const STATUS_MEANINGS: Record<string, string> = {
  'Room Available': 'Room is available now',
  'Booked': 'Room is booked',
  'Not Ready': 'The guest has departed, but the room has not yet been cleaned and ready for sale.',
  'Vacant Ready': 'The room has been cleaned and inspected and is ready for an arriving guest.',
  'On queue': 'Guest has arrived at the hotel, but the room assigned is not yet ready.',
  'Occupied': 'A guest is currently occupied in the room.',
  'Do Not Disturb': 'The guest has requested not to be disturbed.',
  'Cleaning in progress': 'Room attendant is currently cleaning this room.',
  'Sleep out': 'A guest is registered to the room, but the bed has not been used.',
  'late checkout': 'The guest has requested and is being allowed to check out later than the normal / standard departure time of the hotel.',
  'checking out': 'The guest has requested and is being allowed to check out / standard departure time of the hotel.',
  'Reserved': 'Maintenance Block',
  'Maintenance': 'Room under maintenance.'
};

export default function CalendarPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [housekeepingSearch, setHousekeepingSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(new Date());

  const { data: roomTypes = [] } = useQuery({ queryKey: ['roomTypes', tenant], queryFn: () => fetchApi<any[]>(tenant, '/room-types') });
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms', tenant], queryFn: () => fetchApi<any[]>(tenant, '/rooms') });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings', tenant], queryFn: () => fetchApi<any[]>(tenant, '/bookings') });
  const { data: payments = [] } = useQuery({ queryKey: ['payments', tenant], queryFn: () => fetchApi<any[]>(tenant, '/payments') });

  const dates = Array.from({ length: 30 }, (_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i); return d; });

  const [bookingModal, setBookingModal] = useState<{ isOpen: boolean, roomId: string, date: Date | null }>({ isOpen: false, roomId: '', date: null });
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const [newBooking, setNewBooking] = useState({ 
    guest_name: '', 
    guest_contact: '',
    guest_email: '',
    guest_id_proof_image_url: '',
    total_price: '' as number | string,
    amount_paid: '' as number | string,
    payment_method: 'UPI',
    booking_source: 'Offline',
    check_out: '' // Added for multi-day support
  });
  const [uploadingId, setUploadingId] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const createBooking = useMutation({
    mutationFn: (b: any) => fetchApi(tenant, '/bookings', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings', tenant] }); setBookingModal({ isOpen: false, roomId: '', date: null }); }
  });

  const updateStatus = useMutation({
    mutationFn: async (args: { id: string, status: string }) => {
      const res = await fetchApi(tenant, `/bookings/${args.id}/status`, { method: 'PUT', body: JSON.stringify({ status: args.status }) });
      
      // If checking out, also set room status to 'Not Ready' (Dirty)
      if (args.status === 'Checked-out') {
        const booking = bookings.find((b: any) => b.id === args.id);
        if (booking?.room_id) {
          await fetchApi(tenant, `/rooms/${booking.room_id}/housekeeping`, { 
            method: 'PATCH', 
            body: JSON.stringify({ status: 'Not Ready' }) 
          });
        }
      }
      return res;
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['bookings', tenant] });
      qc.invalidateQueries({ queryKey: ['rooms', tenant] });
      setSelectedBooking(null); 
    }
  });

  const [paymentForm, setPaymentForm] = useState({ amount: '' as number | string, method: 'UPI' });
  const addPayment = useMutation({
    mutationFn: (p: any) => fetchApi(tenant, `/bookings/${selectedBooking?.id}/payments`, { method: 'POST', body: JSON.stringify(p) }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['bookings', tenant] }); 
      setPaymentForm({ amount: '', method: 'UPI' });
      // Update selected booking locally to show new payment immediately
      setSelectedBooking(null); // or re-fetch/update local state
    }
  });

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<string>('');

  const updatePayment = useMutation({
    mutationFn: (args: { id: string, method: string }) => fetchApi(tenant, `/payments/${args.id}`, { method: 'PATCH', body: JSON.stringify({ method: args.method }) }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['bookings', tenant] }); 
      setEditingPaymentId(null);
      setSelectedBooking(null); 
    }
  });

  const handleCellClick = (roomId: string, date: Date) => {
    // Find room and its base price
    const room = rooms.find((r: any) => r.id === roomId);
    const roomType = roomTypes.find((rt: any) => rt.id === room?.room_type_id);
    const price = roomType?.base_price || 0;
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    setNewBooking({ 
      guest_name: '', 
      guest_contact: '',
      guest_email: '',
      guest_id_proof_image_url: '',
      total_price: price,
      amount_paid: price, 
      payment_method: 'UPI',
      booking_source: 'Offline',
      check_out: nextDay.toISOString().split('T')[0]
    });
    setIsFullPayment(true);
    setBookingModal({ isOpen: true, roomId, date });
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetchApi<{url: string}>(tenant, '/upload-id', {
        method: 'POST',
        body: formData
      });

      setNewBooking(prev => ({ ...prev, guest_id_proof_image_url: res.url }));
    } catch (err) {
      alert("Upload failed. Please check your connection or file type.");
      console.error("Upload failed", err);
    } finally {
      setUploadingId(false);
    }
  };

  const calculateNights = () => {
    if (!bookingModal.date || !newBooking.check_out) return 1;
    const start = new Date(bookingModal.date);
    const end = new Date(newBooking.check_out);
    const diff = end.getTime() - start.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const handleCheckoutChange = (newDate: string) => {
    const room = rooms.find((r: any) => r.id === bookingModal.roomId);
    const roomType = roomTypes.find((rt: any) => rt.id === room?.room_type_id);
    const basePrice = roomType?.base_price || 0;

    const start = new Date(bookingModal.date!);
    const end = new Date(newDate);
    const diff = end.getTime() - start.getTime();
    const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    const newTotal = nights * basePrice;
    setNewBooking(prev => ({ 
      ...prev, 
      check_out: newDate, 
      total_price: newTotal,
      amount_paid: isFullPayment ? newTotal : prev.amount_paid
    }));
  };

  const getBookingForCell = (roomId: string, cellDate: Date) => {
    const dStr = cellDate.toISOString().split('T')[0];
    return bookings.find((b: any) => {
      if (b.room_id !== roomId) return false;
      const bIn = b.check_in.split('T')[0];
      const bOut = b.check_out.split('T')[0];
      return dStr >= bIn && dStr < bOut;
    });
  };

  const getAvailabilityForType = (typeId: string, cellDate: Date) => {
    const dStr = cellDate.toISOString().split('T')[0];
    const roomsOfType = rooms.filter((r: any) => r.room_type_id === typeId);
    const bookedRoomsCount = roomsOfType.filter(room => {
      return bookings.some((b: any) => {
        if (b.room_id !== room.id) return false;
        const bIn = b.check_in.split('T')[0];
        const bOut = b.check_out.split('T')[0];
        return dStr >= bIn && dStr < bOut;
      });
    }).length;
    
    return { available: roomsOfType.length - bookedRoomsCount, total: roomsOfType.length };
  };

  const toggleTypeExpansion = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) newExpanded.delete(typeId);
    else newExpanded.add(typeId);
    setExpandedTypes(newExpanded);
  };

  const updateHousekeeping = useMutation({
    mutationFn: (args: { id: string, status: string }) => 
      fetchApi(tenant, `/rooms/${args.id}/housekeeping`, { method: 'PATCH', body: JSON.stringify({ status: args.status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms', tenant] }); }
  });

  // --- Dashboard Calculations ---
  const today = new Date();
  const getLocalDateStr = (d: any) => {
    if (!d) return "";
    const date = new Date(d);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  };
  const todayStr = getLocalDateStr(today);
  
  // Arrivals: People scheduled to arrive today + those who already checked in today
  const todayArrivals = bookings.filter((b: any) => getLocalDateStr(b.check_in) === todayStr).length;
  
  // Departures: People scheduled to leave today + those who already checked out today
  const todayDepartures = bookings.filter((b: any) => {
    const isScheduledToday = getLocalDateStr(b.check_out) === todayStr;
    const isCheckedOutToday = b.status === "Checked-out" && getLocalDateStr(b.check_in) === todayStr; 
    // Note: Since we don't have actual_checkout_time, we assume if they checked in and are checked out, it happened today or they are a departure.
    // For most accurate: check if checkout date is today OR if they are currently marked checked-out and stayed today.
    return isScheduledToday || (b.status === "Checked-out" && getLocalDateStr(b.check_in) === todayStr);
  }).length;
  
  const currentOccupancy = rooms.filter((r: any) => {
    return bookings.some((b: any) => {
      if (b.room_id !== r.id) return false;
      // In-house Occupancy: Anyone currently checked-in OR anyone who checked-out today (reflects room usage)
      const isActiveStay = b.status === "Checked-in" || (b.status === "Checked-out" && getLocalDateStr(b.check_in) === todayStr);
      return isActiveStay;
    });
  }).length;
 
  const occupancyRate = rooms.length > 0 ? Math.round((currentOccupancy / rooms.length) * 100) : 0;
 
  const todayRevenue = bookings.reduce((acc: number, b: any) => {
    const paymentsToday = (b.payments || []).filter((p: any) => getLocalDateStr(p.timestamp) === todayStr);
    return acc + paymentsToday.reduce((pAcc: number, p: any) => pAcc + p.amount, 0);
  }, 0);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center transition-all flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">Master Calendar</h1>
          
          <div className="flex items-center bg-gray-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-zinc-800">
             <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() - 14); setStartDate(d); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
             <div className="px-5 py-1.5 text-base font-medium flex items-center gap-2 border-x border-gray-200 dark:border-zinc-700 mx-1">
               <CalendarIcon className="w-4 h-4 text-[var(--theme-color,#4f46e5)]"/>
               {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
             </div>
             <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() + 14); setStartDate(d); }} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">Filter Rows</label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[var(--theme-color,#4f46e5)] transition-colors" />
            <input 
              type="text" 
              placeholder="Search rooms..." 
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 focus:border-[var(--theme-color,#4f46e5)] w-72 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 relative">
        <div className="inline-block min-w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
          <div className="flex sticky top-0 z-10 bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
            <div className="w-48 flex-shrink-0 sticky left-0 z-20 bg-gray-100 dark:bg-zinc-800 border-r border-gray-200 dark:border-zinc-700 p-3 font-semibold text-sm">Room</div>
            {dates.map((date, i) => (
              <div key={i} className="w-32 flex-shrink-0 border-r border-gray-200 dark:border-zinc-700 p-3 text-center text-sm">
                <div className="font-semibold">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-zinc-500">{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>

          {roomTypes.map((type: any) => {
            const roomsOfType = rooms.filter((r: any) => r.room_type_id === type.id);
            const isExpanded = expandedTypes.has(type.id) || searchTerm !== '';
            
            // If searching, only show types that contain matching rooms or match the type name itself
            const isTypeMatch = type.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchingRooms = roomsOfType.filter((r: any) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (searchTerm !== '' && !isTypeMatch && matchingRooms.length === 0) return null;

            return (
              <React.Fragment key={type.id}>
                {/* Summary Row */}
                <div className="flex border-b border-gray-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 group">
                  <div 
                    className="w-48 flex-shrink-0 sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-800/90 border-r border-gray-200 dark:border-zinc-700 p-3 font-bold text-sm cursor-pointer flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    onClick={() => toggleTypeExpansion(type.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    <span className="truncate">{type.name}</span>
                  </div>
                  {dates.map((date, i) => {
                    const { available, total } = getAvailabilityForType(type.id, date);
                    const occupancyRate = total > 0 ? (total - available) / total : 0;
                    
                    return (
                      <div 
                        key={i} 
                        className={`w-32 flex-shrink-0 border-r border-gray-100 dark:border-zinc-800 relative p-1 h-14 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${occupancyRate === 1 ? 'bg-red-50/50 dark:bg-red-900/10' : occupancyRate > 0.5 ? 'bg-orange-50/30 dark:bg-orange-900/10' : 'bg-emerald-50/20 dark:bg-emerald-900/5'}`}
                        onClick={() => toggleTypeExpansion(type.id)}
                      >
                        <span className={`text-sm font-bold ${available === 0 ? 'text-red-500' : available < 3 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          {available} Available
                        </span>
                        <span className="text-xs text-zinc-400">{total} Total</span>
                      </div>
                    )
                  })}
                </div>

                {/* Detailed Room Rows */}
                {isExpanded && (roomsOfType.length > 0 ? (
                  roomsOfType
                    .filter((r: any) => searchTerm === '' || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || isTypeMatch)
                    .map((room: any) => (
                      <div key={room.id} className="flex border-b border-gray-100 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <div className="w-48 flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/50 border-r border-gray-200 dark:border-zinc-700 p-3 pl-8 text-sm font-medium transition-colors">
                          {room.name}
                        </div>
                        {dates.map((date, i) => {
                          const booking = getBookingForCell(room.id, date);
                          return (
                            <div key={i} className="w-32 flex-shrink-0 border-r border-gray-100 dark:border-zinc-800 relative p-1 h-16 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer" onClick={() => !booking && handleCellClick(room.id, date)}>
                              {booking && (
                                <div onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} className={`absolute inset-x-1 inset-y-1 rounded-md shadow-sm border flex items-center justify-center text-xs text-white px-2 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity ${booking.status === 'Checked-in' ? 'bg-emerald-500 border-emerald-600' : 'bg-[var(--theme-color,#4f46e5)] border-[var(--theme-color,#4f46e5)]'}`}>
                                  {booking.guest_name}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))
                ) : (
                  <div className="flex border-b border-gray-100 dark:border-zinc-800">
                    <div className="w-48 flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 p-3 pl-8 text-xs italic text-zinc-400">
                      No rooms
                    </div>
                    <div className="flex-1 p-3 text-xs text-zinc-400 italic">No rooms configured for this type.</div>
                  </div>
                ))}
              </React.Fragment>
            )
          })}
          {rooms.length === 0 && <div className="p-8 text-center text-zinc-500">No rooms configured. Add some in Room Management.</div>}
        </div>
      </div>

      {/* Dashboard Sections */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Operations Summary */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Daily Operations</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><BedDouble className="w-5 h-5 text-blue-600"/></div>
                <span className="text-sm text-zinc-500 font-medium">Occupancy</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{occupancyRate}%</span>
                <span className="text-xs text-zinc-400 font-medium">{currentOccupancy}/{rooms.length} Rooms</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><LogIn className="w-5 h-5 text-emerald-600"/></div>
                <span className="text-sm text-zinc-500 font-medium">Arrivals</span>
              </div>
              <span className="text-3xl font-bold">{todayArrivals}</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><LogOut className="w-5 h-5 text-orange-600"/></div>
                <span className="text-sm text-zinc-500 font-medium">Departures</span>
              </div>
              <span className="text-3xl font-bold">{todayDepartures}</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><CreditCard className="w-5 h-5 text-purple-600"/></div>
                <span className="text-sm text-zinc-500 font-medium">Revenue</span>
              </div>
              <span className="text-3xl font-bold">₹{todayRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>        {/* Housekeeping & Maintenance Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold uppercase tracking-widest text-zinc-400">Housekeeping & Maintenance</h2>
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--theme-color,#4f46e5)] transition-colors" />
              <input 
                type="text" 
                placeholder="Search Room Number..." 
                className="pl-10 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all"
                value={housekeepingSearch}
                onChange={(e) => setHousekeepingSearch(e.target.value)}
              />
            </div>
          </div>
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {['All', 'Room Available', 'Booked', 'Not Ready', 'Vacant Ready', 'On queue', 'Occupied', 'Do Not Disturb', 'Cleaning in progress', 'Sleep out', 'Reserved', 'Maintenance'].map(status => {
              const count = status === 'All' 
                ? rooms.length 
                : rooms.filter((r: any) => (r.housekeeping_status || 'Room Available') === status).length;
              
              const colors: any = {
                'All': 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
                'Room Available': 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800',
                'Booked': 'text-pink-600 bg-pink-50 dark:bg-pink-900/10',
                'Not Ready': 'text-orange-500 bg-orange-50 dark:bg-orange-900/10',
                'Vacant Ready': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10',
                'On queue': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/10',
                'Occupied': 'text-rose-500 bg-rose-50 dark:bg-rose-900/10',
                'Do Not Disturb': 'text-amber-500 bg-amber-50 dark:bg-amber-900/10',
                'Cleaning in progress': 'text-blue-500 bg-blue-50 dark:bg-blue-900/10',
                'Sleep out': 'text-slate-600 bg-slate-100 dark:bg-slate-800/50',
                'Reserved': 'text-red-700 bg-red-50 dark:bg-red-900/20',
                'Maintenance': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
              };

              const isActive = activeStatusFilter === status;

              return (
                <button 
                  key={status} 
                  onClick={() => setActiveStatusFilter(status)}
                  title={STATUS_MEANINGS[status]}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${isActive ? 'border-[var(--theme-color,#4f46e5)] scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'} ${colors[status]}`}
                >
                  {status}
                  <span className="bg-white dark:bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>
          
          <div className="space-y-6">
            {roomTypes.map((type: any) => {
              const roomsOfType = rooms.filter((r: any) => {
                if (r.room_type_id !== type.id) return false;
                const matchesSearch = housekeepingSearch === '' || 
                                     r.name.toLowerCase().includes(housekeepingSearch.toLowerCase()) ||
                                     type.name.toLowerCase().includes(housekeepingSearch.toLowerCase());
                const matchesStatus = activeStatusFilter === 'All' || (r.housekeeping_status || 'Clean') === activeStatusFilter;
                return matchesSearch && matchesStatus;
              });

              if (roomsOfType.length === 0) return null;

              return (
                <div key={type.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{type.name}</span>
                    <div className="flex-1 h-[1px] bg-gray-100 dark:bg-zinc-800"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {roomsOfType.map((room: any) => {
                      const status = room.housekeeping_status || 'Clean';
                      const statusColors: any = {
                        'Room Available': 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800',
                        'Booked': 'text-pink-600 bg-pink-50 dark:bg-pink-900/10',
                        'Not Ready': 'text-orange-600 bg-orange-50 dark:bg-orange-900/10',
                        'Vacant Ready': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10',
                        'On queue': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/10',
                        'Occupied': 'text-rose-600 bg-rose-50 dark:bg-rose-900/10',
                        'Do Not Disturb': 'text-amber-600 bg-amber-50 dark:bg-amber-900/10',
                        'Cleaning in progress': 'text-blue-600 bg-blue-50 dark:bg-blue-900/10',
                        'Sleep out': 'text-slate-600 bg-slate-100 dark:bg-slate-800/50',
                        'Reserved': 'text-red-700 bg-red-50 dark:bg-red-900/20',
                        'Maintenance': 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
                      };
                      const statusIcons: Record<string, any> = {
                        'Room Available': CheckCircle,
                        'Booked': BedDouble,
                        'Not Ready': AlertTriangle,
                        'Vacant Ready': CheckCircle,
                        'On queue': Brush,
                        'Occupied': BedDouble,
                        'Do Not Disturb': ShieldCheck,
                        'Cleaning in progress': Brush,
                        'Sleep out': BedDouble,
                        'Reserved': ShieldCheck,
                        'Maintenance': AlertTriangle
                      };
                      const StatusIcon = statusIcons[status] || CheckCircle;

                      return (
                        <div key={room.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-[var(--theme-color,#4f46e5)] transition-all">
                          <div className="flex items-center justify-between mb-3" title={STATUS_MEANINGS[status]}>
                            <span className="text-base font-bold">{room.name}</span>
                            <StatusIcon className={`w-4 h-4 ${statusColors[status]?.split(' ')[0]}`} />
                          </div>
                            <select 
                              className={`w-full text-[10px] font-black uppercase tracking-tight p-1.5 rounded-md border-none cursor-pointer focus:ring-0 transition-colors ${statusColors[status]}`}
                              value={status}
                              disabled={status === 'Occupied' || status === 'Booked' || status === 'checking out'}
                              onChange={(e) => updateHousekeeping.mutate({ id: room.id, status: e.target.value })}
                            >
                              <option value="Room Available">Room Available</option>
                              <option value="Not Ready">Not Ready</option>
                              <option value="Vacant Ready">Vacant Ready</option>
                              <option value="On queue">On queue</option>
                              <option value="Do Not Disturb">Do Not Disturb</option>
                              <option value="Cleaning in progress">Cleaning in progress</option>
                              <option value="Sleep out">Sleep out</option>
                              <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {(rooms.length > 0 && roomTypes.every((type: any) => 
               rooms.filter((r: any) => {
                 if (r.room_type_id !== type.id) return false;
                 const matchesSearch = housekeepingSearch === '' || r.name.toLowerCase().includes(housekeepingSearch.toLowerCase());
                 const matchesStatus = activeStatusFilter === 'All' || (r.housekeeping_status || 'Clean') === activeStatusFilter;
                 return matchesSearch && matchesStatus;
               }).length === 0
            )) && (
              <div className="p-12 text-center bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-500 italic">No rooms match your filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {bookingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-black tracking-tight">Reserve Space</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Allocation for Room {rooms.find(r => r.id === bookingModal.roomId)?.name}</p>
               </div>
               <button onClick={() => setBookingModal({ isOpen: false, roomId: '', date: null })} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-zinc-900"><X /></button>
            </div>

            <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Section 1: Guest Information */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block px-1">Primary Guest Details</label>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                     <span className="text-[10px] font-bold text-zinc-500 ml-1">Full Legal Name</span>
                     <input type="text" placeholder="e.g. John Doe" className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm" value={newBooking.guest_name} onChange={e => setNewBooking({ ...newBooking, guest_name: e.target.value })}/>
                   </div>
                   <div className="space-y-1.5">
                     <span className="text-[10px] font-bold text-zinc-500 ml-1">Contact Number</span>
                     <input type="text" placeholder="+91 0000000000" className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm" value={newBooking.guest_contact} onChange={e => setNewBooking({ ...newBooking, guest_contact: e.target.value })}/>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6 mt-4">
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 ml-1">Email Address</span>
                        <input type="email" placeholder="guest@example.com" className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm" value={newBooking.guest_email} onChange={e => setNewBooking({ ...newBooking, guest_email: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 ml-1">Identity Verification</span>
                        <div className="relative group">
                           <input type="file" accept="image/*" className="hidden" id="id-photo-upload" onChange={handleIdUpload}/>
                           <label htmlFor="id-photo-upload" className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all bg-zinc-50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              {uploadingId ? "Syncing..." : newBooking.guest_id_proof_image_url ? <span className="text-emerald-500">ID Sync Active</span> : "Upload ID Proof"}
                              {newBooking.guest_id_proof_image_url && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                           </label>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Section 2: Stays & Dates */}
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Stay Duration</label>
                    <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                       {calculateNights()} {calculateNights() === 1 ? 'Night' : 'Nights'} Stay
                    </span>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5 opacity-60">
                       <span className="text-[10px] font-bold text-zinc-500 ml-1">Check-in (Fixed from Calendar)</span>
                       <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl font-black text-sm border-2 border-transparent">
                          {bookingModal.date?.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <span className="text-[10px] font-bold text-zinc-500 ml-1">Selection Checkout Date</span>
                       <input 
                         type="date" 
                         min={bookingModal.date?.toISOString().split('T')[0]}
                         className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-sm" 
                         value={newBooking.check_out} 
                         onChange={e => handleCheckoutChange(e.target.value)}
                       />
                    </div>
                 </div>
              </div>

              {/* Section 3: Financials */}
              <div className="p-8 bg-zinc-50 dark:bg-zinc-950 rounded-[32px] border-2 border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Negotiated Rate (Total INR)</span>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 italic">₹</span>
                          <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 pl-10 rounded-2xl font-black text-xl tracking-tight focus:border-indigo-500 outline-none transition-all" value={newBooking.total_price} onChange={e => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setNewBooking({ ...newBooking, total_price: val, amount_paid: isFullPayment ? val : newBooking.amount_paid });
                          }}/>
                       </div>
                    </div>
                    <div className="flex bg-white dark:bg-zinc-900 rounded-2xl p-1.5 border border-zinc-200 dark:border-zinc-800">
                       <button onClick={() => { setIsFullPayment(true); setNewBooking({...newBooking, amount_paid: newBooking.total_price}) }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isFullPayment ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:bg-zinc-50'}`}>Full Prepaid</button>
                       <button onClick={() => setIsFullPayment(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isFullPayment ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400 hover:bg-zinc-50'}`}>Partial / Advance</button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Payment Collected</span>
                       {!isFullPayment ? (
                          <div className="space-y-3">
                             <input type="number" placeholder="Advance Amount" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl font-black text-xl tracking-tight focus:border-indigo-500 outline-none transition-all" value={newBooking.amount_paid} onChange={e => setNewBooking({ ...newBooking, amount_paid: e.target.value === '' ? '' : Number(e.target.value) })}/>
                             <p className="text-[10px] font-bold text-rose-500 text-right px-2">Balance Remaining: ₹{Number(newBooking.total_price || 0) - Number(newBooking.amount_paid || 0)}</p>
                          </div>
                       ) : (
                          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 p-6 rounded-2xl flex items-center justify-center gap-3">
                             <CheckCircle className="w-5 h-5 text-emerald-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Settled at Check-in</span>
                          </div>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl font-bold text-xs outline-none bg-transparent" value={newBooking.payment_method} onChange={e => setNewBooking({ ...newBooking, payment_method: e.target.value })}>
                          <option value="UPI">UPI</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                       </select>
                       <select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl font-bold text-xs outline-none bg-transparent" value={newBooking.booking_source} onChange={e => setNewBooking({ ...newBooking, booking_source: e.target.value })}>
                          <option value="Offline">Offline</option>
                          <option value="MMT">MMT</option>
                          <option value="Airbnb">Airbnb</option>
                       </select>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 pt-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
               <button onClick={() => setBookingModal({ isOpen: false, roomId: '', date: null })} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-all">Discard</button>
               <button onClick={() => {
                 createBooking.mutate({ 
                   room_id: bookingModal.roomId, 
                   guest_name: newBooking.guest_name, 
                   guest_contact: newBooking.guest_contact,
                   guest_email: newBooking.guest_email,
                   guest_id_proof_image_url: newBooking.guest_id_proof_image_url,
                   total_price: Number(newBooking.total_price || 0), 
                   check_in: bookingModal.date!.toISOString(), 
                   check_out: new Date(newBooking.check_out).toISOString(), 
                   amount_paid: Number(newBooking.amount_paid || 0),
                   payment_method: newBooking.payment_method,
                   booking_source: newBooking.booking_source
                 });
               }} className="px-12 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">Commit Booking</button>
            </div>
          </div>
        </div>
      )}

      {/* View Drawer */}
      {selectedBooking && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 transform transition-transform p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Booking Details</h2>
            <button onClick={() => setSelectedBooking(null)}><X className="w-5 h-5 text-zinc-500 hover:text-zinc-800" /></button>
          </div>
          <div className="space-y-4">
            <div><p className="text-sm text-zinc-500">Guest Name</p><p className="font-semibold text-lg">{selectedBooking.guest_name}</p></div>
            <div><p className="text-sm text-zinc-500">Dates</p><p>{selectedBooking.check_in.split('T')[0]} to {selectedBooking.check_out.split('T')[0]}</p></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-zinc-500">Source</p><p className="font-medium">{selectedBooking.booking_source || 'Offline'}</p></div>
              <div><p className="text-sm text-zinc-500">Payment Mode</p><p className="font-medium">{selectedBooking.payment_method || 'UPI'}</p></div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Bill</span>
                <span className="font-semibold">₹{selectedBooking.total_price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Paid</span>
                <span className="text-emerald-600 font-semibold">₹{(selectedBooking.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="font-medium">Pending Balance</span>
                <span className={`font-bold ${Number(selectedBooking.total_price) - (selectedBooking.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  ₹{Number(selectedBooking.total_price) - (selectedBooking.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Payment History</h3>
              <div className="space-y-2">
                {(selectedBooking.payments || []).length === 0 && <p className="text-sm text-zinc-400 italic">No payments recorded.</p>}
                {(selectedBooking.payments || []).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">₹{p.amount}</span>
                      {editingPaymentId === p.id ? (
                        <div className="flex gap-2 mt-1">
                          <select 
                            className="text-[10px] border rounded dark:bg-zinc-800 dark:border-zinc-700 bg-transparent px-1"
                            value={editingMethod}
                            onChange={e => setEditingMethod(e.target.value)}
                          >
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Online (OTA)">Online</option>
                            <option value="Card">Card</option>
                          </select>
                          <button onClick={() => updatePayment.mutate({ id: p.id, method: editingMethod })} className="text-emerald-600 hover:text-emerald-700"><Check size={14}/></button>
                          <button onClick={() => setEditingPaymentId(null)} className="text-red-600 hover:text-red-700"><X size={14}/></button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500">{new Date(p.timestamp).toLocaleDateString()} • {p.method}</span>
                      )}
                    </div>
                    {editingPaymentId !== p.id && (
                      <button 
                        onClick={() => { setEditingPaymentId(p.id); setEditingMethod(p.method); }}
                        className="text-zinc-400 hover:text-zinc-600 p-1"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {Number(selectedBooking.total_price) - (selectedBooking.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0) > 0 && (
                <div className="pt-4 mt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-xs font-semibold mb-2">Add Payment</h4>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      className="flex-1 text-sm border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                    <select 
                      className="text-sm border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700 bg-transparent"
                      value={paymentForm.method}
                      onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Online (OTA)">Online</option>
                      <option value="Card">Card</option>
                    </select>
                    <button 
                      onClick={() => addPayment.mutate(paymentForm)}
                      className="bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white px-3 py-2 rounded text-sm font-medium hover:opacity-90"
                    >Add</button>
                  </div>
                </div>
              )}
            </div>

            <div><p className="text-sm text-zinc-500">Status</p>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${selectedBooking.status === 'Checked-out' ? 'bg-zinc-200 text-zinc-800' : 'bg-emerald-100 text-emerald-800'}`}>{selectedBooking.status}</span>
            </div>
            
            <div className="pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <h3 className="text-sm font-semibold mb-2">Actions</h3>
              {selectedBooking.status !== 'Checked-in' && selectedBooking.status !== 'Checked-out' && (
                <button onClick={() => updateStatus.mutate({ id: selectedBooking.id, status: 'Checked-in' })} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded">Mark Checked-In</button>
              )}
              {selectedBooking.status === 'Checked-in' && (
                <button onClick={() => updateStatus.mutate({ id: selectedBooking.id, status: 'Checked-out' })} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded">Check Out Guest</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
