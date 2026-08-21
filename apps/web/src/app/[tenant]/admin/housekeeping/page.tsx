"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { 
  Search, Brush, ShieldCheck, AlertTriangle, CheckCircle, 
  BedDouble, Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  LayoutGrid, List, ChevronDown, ChevronUp
} from 'lucide-react';

const ALL_STATUS_OPTIONS = [
  'All', 
  'Room Available',
  'Booked',
  'Not Ready',
  'Vacant Ready',
  'On queue',
  'Occupied',
  'Do Not Disturb',
  'Cleaning in progress',
  'Sleep out',
  'late checkout',
  'checking out',
  'Reserved',
  'Maintenance'
];

const NON_ACTIONABLE_STATUSES = new Set([
  'Booked',
  'Occupied',
  'checking out',
  'Checking out',
  'late checkout',
  'Late checkout',
  'Reserved'
]);

const STATUS_OPTIONS = ALL_STATUS_OPTIONS.filter(s => !NON_ACTIONABLE_STATUSES.has(s));

const ACTIONABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(s => s !== 'All');

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

export default function HousekeepingPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'today' | 'weekly'>('today');
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});

  const toggleType = (id: string) => {
    setCollapsedTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const { data: roomTypes = [], isLoading: isLoadingRT } = useQuery({ 
    queryKey: ['roomTypes', tenant], 
    queryFn: () => fetchApi<any[]>(tenant, '/room-types') 
  });
  
  const { data: rooms = [], isLoading: isLoadingR } = useQuery({ 
    queryKey: ['rooms', tenant], 
    queryFn: () => fetchApi<any[]>(tenant, '/rooms') 
  });

  const { data: bookings = [] } = useQuery({ 
    queryKey: ['bookings', tenant], 
    queryFn: () => fetchApi<any[]>(tenant, '/bookings') 
  });

  const { data: staffList = [] } = useQuery({ 
    queryKey: ['staff', tenant], 
    queryFn: () => fetchApi<any[]>(tenant, '/staff') 
  });

  const activeStaff = staffList.filter((s: any) => s.status !== 'Inactive');
  const housekeepingStaff = activeStaff.filter((s: any) => s.role === 'Housekeeping');
  const maintenanceStaff = activeStaff.filter((s: any) => s.role === 'Maintenance');
  const managers = activeStaff.filter((s: any) => s.role === 'Manager');


  const updateHousekeeping = useMutation({
    mutationFn: (args: { id: string, status?: string, assigned_staff?: string, maintenance_remarks?: string }) => 
      fetchApi(tenant, `/rooms/${args.id}/housekeeping`, { method: 'PATCH', body: JSON.stringify(args) }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['rooms', tenant] }); 
      qc.invalidateQueries({ queryKey: ['bookings', tenant] }); 
    }
  });

  const getStatusDetails = (status: string) => {
    const configs: any = {
      'Room Available': { color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-200', icon: CheckCircle },
      'Booked': { color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/10 border-pink-100', icon: BedDouble },
      'Not Ready': { color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/10 border-orange-100', icon: AlertTriangle },
      'Vacant Ready': { color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100', icon: CheckCircle },
      'On queue': { color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/10 border-cyan-100', icon: Brush },
      'Occupied': { color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100', icon: BedDouble },
      'Do Not Disturb': { color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100', icon: ShieldCheck },
      'Cleaning in progress': { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/10 border-blue-100', icon: Brush },
      'Sleep out': { color: 'text-slate-600 bg-slate-100 dark:bg-slate-800/50 border-slate-200', icon: BedDouble },
      'late checkout': { color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/10 border-purple-100', icon: Filter },
      'checking out': { color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/10 border-fuchsia-100', icon: AlertTriangle },
      'Reserved': { color: 'text-red-800 bg-red-100 dark:bg-red-950 border-red-200', icon: ShieldCheck },
      'Maintenance': { color: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200', icon: AlertTriangle }
    };
    return configs[status] || { color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border-zinc-100', icon: CheckCircle };
  };

  const getRoomEffectiveStatus = (room: any, date: Date = selectedDate) => {
    const dStr = date.toISOString().split('T')[0];
    const booking = bookings.find((b: any) => {
      if (b.room_id !== room.id) return false;
      const bIn = b.check_in.split('T')[0];
      const bOut = b.check_out.split('T')[0];
      return dStr >= bIn && dStr < bOut;
    });

    if (booking) {
      return booking.status === 'Checked-in' ? 'Occupied' : 'Booked';
    }

    // Check for expected departures (Checking Out)
    const checkoutBooking = bookings.find((b: any) => {
      if (b.room_id !== room.id) return false;
      const bOut = b.check_out.split('T')[0];
      return dStr === bOut && b.status !== 'Checked-out';
    });

    if (checkoutBooking) {
      return 'checking out';
    }

    return room.housekeeping_status || 'Vacant Ready';
  };

  const filteredRooms = (typeId: string) => {
    return rooms.filter((r: any) => {
      if (r.room_type_id !== typeId) return false;
      const effectiveStatus = getRoomEffectiveStatus(r);
      
      const matchesSearch = searchTerm === '' || 
                           r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           roomTypes.find(t => t.id === typeId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = activeStatusFilter === 'All' || effectiveStatus === activeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const isLoading = isLoadingRT || isLoadingR;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">Housekeeping</h1>
          <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Live Service Forecast
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* View Toggle */}
           <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 mr-2">
              <button 
                onClick={() => setViewMode('today')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'today' ? 'bg-white dark:bg-zinc-900 shadow-sm text-[var(--theme-color,#4f46e5)]' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                 <LayoutGrid className="w-3 h-3" /> Today
              </button>
              <button 
                onClick={() => setViewMode('weekly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'weekly' ? 'bg-white dark:bg-zinc-900 shadow-sm text-[var(--theme-color,#4f46e5)]' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                 <List className="w-3 h-3" /> Weekly
              </button>
           </div>

           {/* Date Selector */}
           <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
                className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-400" />
              </button>
              <div className="px-5 flex items-center gap-2 font-black text-xs uppercase tracking-widest min-w-[180px] justify-center">
                 <CalendarIcon className="w-4 h-4 text-[var(--theme-color,#4f46e5)]" />
                 {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <button 
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </button>
           </div>
           
           <div className="relative group w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--theme-color,#4f46e5)] transition-colors" />
             <input 
               type="text" 
               placeholder="Search rooms..." 
               className="pl-9 pr-4 py-3 w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
      </div>

      {/* Quick Status Filter / Legend */}
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block px-1">Status Legend & Quick Filters</label>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {STATUS_OPTIONS.map(status => {
            const count = status === 'All' 
              ? rooms.length 
              : rooms.filter((r: any) => (r.housekeeping_status || 'Vacant Ready') === status).length;
            
            const isActive = activeStatusFilter === status;
            const { color } = getStatusDetails(status === 'All' ? 'Inspected' : status);

            return (
              <button 
                key={status} 
                onClick={() => setActiveStatusFilter(status)}
                title={STATUS_MEANINGS[status]}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${isActive ? 'border-[var(--theme-color,#4f46e5)] scale-105 shadow-md bg-white dark:bg-zinc-900 ring-4 ring-[var(--theme-color,#4f46e5)]/10' : 'border-transparent opacity-60 hover:opacity-100 bg-zinc-50 dark:bg-zinc-950/50'} ${status === 'All' ? 'text-zinc-500' : color}`}
              >
                <div className={`w-2 h-2 rounded-full bg-current ${isActive ? 'animate-pulse' : ''}`} />
                {status}
                <span className="bg-current bg-opacity-10 px-1.5 py-0.5 rounded text-[9px] min-w-[20px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Maintenance Ledger Summary (Only in Today's View) */}
      {viewMode === 'today' && rooms.some((r: any) => getRoomEffectiveStatus(r) === 'Maintenance') && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-800/30 rounded-[32px] p-6 space-y-4">
           <div className="flex items-center gap-3 px-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-amber-700">Active Maintenance Ledger</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.filter((r: any) => getRoomEffectiveStatus(r) === 'Maintenance').map((room: any) => (
                <div key={room.id} className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-black">{room.name}</span>
                      <span className="text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-800 px-2 py-1 rounded text-amber-700">Under Repair</span>
                   </div>
                   <p className="text-xs text-zinc-500 italic">"{room.maintenance_remarks || 'No detailed remarks provided'}"</p>
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span className="text-[10px] font-bold text-zinc-400">Assigned: {room.assigned_staff || 'TBD'}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="space-y-12">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-white dark:bg-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : viewMode === 'today' ? (
          roomTypes.map((type: any) => {
            const typeRooms = filteredRooms(type.id);
            if (typeRooms.length === 0) return null;

            return (
              <div key={type.id} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="p-1.5 bg-[var(--theme-color,#4f46e5)]/5 rounded-lg">
                     <BedDouble className="w-4 h-4 text-[var(--theme-color,#4f46e5)]" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">{type.name}</h2>
                  <div className="flex-1 h-[1px] bg-zinc-100 dark:bg-zinc-800"></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {typeRooms.map((room: any) => {
                    const status = getRoomEffectiveStatus(room);
                    const { color, icon: StatusIcon } = getStatusDetails(status);
                    const isDynamicStatus = status === 'Occupied' || status === 'Booked' || status === 'checking out';

                    return (
                      <div 
                        key={room.id} 
                        className={`bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 group hover:border-[var(--theme-color,#4f46e5)] transition-all flex flex-col justify-between min-h-[140px]`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-black tracking-tighter">{room.name}</span>
                          <StatusIcon className={`w-5 h-5 ${color.split(' ')[0]}`} />
                        </div>
                        
                        <div className="space-y-3">
                           <div 
                             className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg text-center cursor-help ${color}`}
                             title={STATUS_MEANINGS[status]}
                           >
                              {status}
                           </div>
                             <div className="relative">
                               <select 
                                 className={`w-full text-[10px] font-black uppercase tracking-widest p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer focus:ring-0 appearance-none ${isDynamicStatus ? 'opacity-40 cursor-not-allowed' : ''}`}
                                 value={room.housekeeping_status || 'Vacant Ready'}
                                 disabled={isDynamicStatus}
                                 onChange={(e) => updateHousekeeping.mutate({ id: room.id, status: e.target.value })}
                               >
                                {room.housekeeping_status && NON_ACTIONABLE_STATUSES.has(room.housekeeping_status) && (
                                  <option value={room.housekeeping_status} disabled hidden>{room.housekeeping_status}</option>
                                )}
                                {ACTIONABLE_STATUS_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                 <Filter className="w-3 h-3" />
                              </div>
                           </div>

                               <div className="pt-2 border-t border-zinc-50 dark:border-zinc-800 flex flex-col gap-1.5">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 pl-1">Attendant</span>
                                  <select 
                                    className="w-full text-[9px] font-black uppercase tracking-tighter p-1.5 rounded-lg border border-transparent hover:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-800 transition-all cursor-pointer outline-none"
                                    value={room.assigned_staff || 'Unassigned'}
                                    onChange={(e) => updateHousekeeping.mutate({ id: room.id, assigned_staff: e.target.value })}
                                  >
                                     <option value="Unassigned">Unassigned</option>
                                     {((status === 'Maintenance' ? maintenanceStaff : housekeepingStaff).length > 0) && (
                                       <optgroup label={status === 'Maintenance' ? "Maintenance Team" : "Housekeeping Team"}>
                                         {(status === 'Maintenance' ? maintenanceStaff : housekeepingStaff).map((staff: any) => (
                                           <option key={staff.id} value={staff.name}>{staff.name}</option>
                                         ))}
                                       </optgroup>
                                     )}
                                     {managers.length > 0 && (
                                       <optgroup label="Management">
                                         {managers.map((staff: any) => (
                                           <option key={staff.id} value={staff.name}>{staff.name}</option>
                                         ))}
                                       </optgroup>
                                     )}
                                  </select>
                               </div>

                           {/* Maintenance Ledger Input */}
                           {status === 'Maintenance' && (
                             <div className="pt-2 border-t border-zinc-50 dark:border-zinc-800 flex flex-col gap-1.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 pl-1">Maintenance Log</span>
                                <input 
                                  type="text"
                                  placeholder="e.g. AC Repair"
                                  className="w-full text-[10px] p-2 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl outline-none placeholder:text-amber-600/30 text-amber-700 font-bold"
                                  value={room.maintenance_remarks || ''}
                                  onChange={(e) => updateHousekeeping.mutate({ id: room.id, maintenance_remarks: e.target.value })}
                                />
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          /* Weekly View Grid */
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800">
                         <th className="p-6 sticky left-0 bg-zinc-50 dark:bg-zinc-950 z-10 min-w-[200px] text-[10px] font-black uppercase tracking-widest text-zinc-400">Room Details</th>
                         {weekDates.map((date, idx) => (
                            <th key={idx} className="p-6 text-center min-w-[140px]">
                               <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                               </div>
                               <div className="text-sm font-black italic tracking-tighter">
                                  {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                               </div>
                            </th>
                         ))}
                      </tr>
                   </thead>
                   <tbody>
                      {roomTypes.map((type: any) => {
                         const typeRooms = rooms.filter((r: any) => {
                           const matchesSearch = searchTerm === '' || 
                                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                type.name.toLowerCase().includes(searchTerm.toLowerCase());
                           return r.room_type_id === type.id && matchesSearch;
                         });
                         
                         if (typeRooms.length === 0) return null;
                         const isCollapsed = collapsedTypes[type.id];

                         return (
                            <React.Fragment key={type.id}>
                               <tr 
                                 className="bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer group"
                                 onClick={() => toggleType(type.id)}
                               >
                                  <td colSpan={8} className="px-6 py-4 border-y border-zinc-100 dark:border-zinc-800">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                           <div className="p-1 px-2 bg-[var(--theme-color,#4f46e5)] text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                              {typeRooms.length} Rooms
                                           </div>
                                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-[var(--theme-color,#4f46e5)] transition-colors">
                                              {type.name}
                                           </h3>
                                        </div>
                                        {isCollapsed ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
                                     </div>
                                  </td>
                               </tr>
                               {!isCollapsed && typeRooms.map((room: any) => (
                                  <tr key={room.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                     <td className="p-6 sticky left-0 bg-white dark:bg-zinc-900 font-black text-sm z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col gap-1">
                                           <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Room</span>
                                           <span>{room.name}</span>
                                           <div className="flex items-center gap-1.5 mt-1 border-t pt-1 border-zinc-50 dark:border-zinc-800">
                                              <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                              {(() => {
                                                const currentStatus = room.housekeeping_status || 'Vacant Ready';
                                                const relevantStaff = currentStatus === 'Maintenance' ? maintenanceStaff : housekeepingStaff;
                                                const label = currentStatus === 'Maintenance' ? "Maintenance" : "Housekeeping";
                                                
                                                return (
                                                  <select 
                                                    className="bg-transparent text-[8px] font-bold text-zinc-400 hover:text-zinc-600 outline-none cursor-pointer"
                                                    value={room.assigned_staff || 'Unassigned'}
                                                    onChange={(e) => updateHousekeeping.mutate({ id: room.id, assigned_staff: e.target.value })}
                                                  >
                                                    <option value="Unassigned">Unassigned</option>
                                                    {relevantStaff.length > 0 && (
                                                      <optgroup label={label}>
                                                        {relevantStaff.map((staff: any) => (
                                                          <option key={staff.id} value={staff.name}>{staff.name}</option>
                                                        ))}
                                                      </optgroup>
                                                    )}
                                                    {managers.length > 0 && (
                                                      <optgroup label="Management">
                                                        {managers.map((staff: any) => (
                                                          <option key={staff.id} value={staff.name}>{staff.name}</option>
                                                        ))}
                                                      </optgroup>
                                                    )}
                                                  </select>
                                                );
                                              })()}
                                           </div>
                                        </div>
                                     </td>
                                     {weekDates.map((date, idx) => {
                                        const status = getRoomEffectiveStatus(room, date);
                                        const { color, icon: StatusIcon } = getStatusDetails(status);
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        const isDynamic = status === 'Occupied' || status === 'Booked' || status === 'checking out' || status === 'late checkout' || status === 'Reserved';

                                        return (
                                           <td key={idx} className={`p-2 transition-all ${isToday ? 'bg-[var(--theme-color,#4f46e5)]/5 shadow-inner' : ''}`}>
                                              <div 
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all text-center h-24 ${color} shadow-sm group/cell relative`}
                                                title={STATUS_MEANINGS[status]}
                                              >
                                                 <StatusIcon className="w-4 h-4 mb-1" />
                                                 <span className="text-[7px] font-black uppercase tracking-tighter leading-tight">{status}</span>
                                                 
                                                 {/* Ledger Note Indicator */}
                                                 {status === 'Maintenance' && room.maintenance_remarks && (
                                                   <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-sm" title={room.maintenance_remarks} />
                                                 )}
                                                 
                                                 {!isDynamic && (
                                                   <select 
                                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                      value={room.housekeeping_status || 'Vacant Ready'}
                                                      onChange={(e) => updateHousekeeping.mutate({ id: room.id, status: e.target.value })}
                                                   >
                                                      {room.housekeeping_status && NON_ACTIONABLE_STATUSES.has(room.housekeeping_status) && (
                                                        <option value={room.housekeeping_status} disabled hidden>{room.housekeeping_status}</option>
                                                      )}
                                                      {ACTIONABLE_STATUS_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                      ))}
                                                   </select>
                                                 )}
                                              </div>
                                           </td>
                                        );
                                     })}
                                  </tr>
                               ))}
                            </React.Fragment>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {rooms.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
           <Brush className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
           <h3 className="text-xl font-black mb-2">No Rooms Configured</h3>
           <p className="text-zinc-500 text-sm max-w-xs mx-auto">Please add physical rooms in the Room Management settings to start tracking housekeeping.</p>
        </div>
      )}
    </div>
  );
}
