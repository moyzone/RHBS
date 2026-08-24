"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchApi, BASE_URL } from '@/lib/api';
import { Search, User, Mail, Phone, Image as ImageIcon, ExternalLink, Calendar, X } from 'lucide-react';

export default function GuestsPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/guests')
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['guest-history', tenant, selectedGuest?.phone],
    queryFn: () => fetchApi<any[]>(tenant, `/guests/${selectedGuest?.phone}/bookings`),
    enabled: !!selectedGuest
  });

  const filteredGuests = guests.filter((g: any) => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm) ||
    (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalSpent = history.reduce((acc: number, b: any) => acc + (Number(b.total_price) || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">Guest Profiles</h1>
          <p className="text-zinc-500 mt-1">Manage your repeat guests and view their complete loyalty history.</p>
        </div>
        
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[var(--theme-color,#4f46e5)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name, phone or email..." 
            className="pl-10 pr-4 py-3 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-zinc-800"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((guest: any) => (
            <div key={guest.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-color,#4f46e5)] opacity-[0.04] rounded-bl-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500"></div>
              
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[var(--theme-color,#4f46e5)] border border-zinc-200 dark:border-zinc-700 shadow-inner group-hover:rotate-6 transition-transform">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl leading-tight group-hover:text-[var(--theme-color,#4f46e5)] transition-colors">{guest.name}</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">ID: {guest.id.split('_')[1]}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><Phone className="w-4 h-4" /></div>
                  <span className="font-bold">{guest.phone}</span>
                </div>
                {guest.email && (
                  <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600"><Mail className="w-4 h-4" /></div>
                    <span className="truncate font-medium">{guest.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600"><Calendar className="w-4 h-4" /></div>
                  <span className="font-medium">
                    Joined {guest.created_at ? new Date(guest.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                   {guest.id_proof_image_url ? (
                     <a 
                       href={`${BASE_URL}${guest.id_proof_image_url}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center gap-3 text-xs font-black text-[var(--theme-color,#4f46e5)] uppercase tracking-wider hover:opacity-80 group/id"
                     >
                        <div className="w-10 h-10 rounded-lg border-2 border-zinc-100 dark:border-zinc-700 overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-sm group-hover/id:ring-4 ring-[var(--theme-color,#4f46e5)]/10 transition-all">
                           <img src={`${BASE_URL}${guest.id_proof_image_url}`} alt="ID Proof" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                           <span>Verified ID</span>
                           <div className="flex items-center gap-1.5 opacity-60">View<ExternalLink className="w-3 h-3" /></div>
                        </div>
                     </a>
                   ) : (
                     <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                        <div className="w-10 h-10 rounded-lg border-2 border-dashed border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center opacity-50">
                           <ImageIcon className="w-5 h-5" />
                        </div>
                        No ID Cached
                     </div>
                   )}
                </div>
                
                <button 
                  onClick={() => { setSelectedGuest(guest); setIsDrawerOpen(true); }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 dark:hover:bg-white dark:hover:text-black rounded-full border border-zinc-200 dark:border-zinc-800 transition-all active:scale-95"
                >
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Drawer */}
      {isDrawerOpen && selectedGuest && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
             {/* Drawer Header */}
             <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--theme-color,#4f46e5)]/10 flex items-center justify-center text-[var(--theme-color,#4f46e5)] font-bold text-xl">
                        {selectedGuest.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight">{selectedGuest.name}</h2>
                        <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{selectedGuest.phone}</span>
                      </div>
                   </div>
                   <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                {/* CRM Dashboard Mini */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter block mb-1">Total Visits</span>
                      <span className="text-2xl font-black text-[var(--theme-color,#4f46e5)]">{history.length}</span>
                   </div>
                   <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter block mb-1">Loyalty Spent</span>
                      <span className="text-2xl font-black text-emerald-600">₹{totalSpent.toLocaleString()}</span>
                   </div>
                </div>
             </div>

             {/* History Timeline */}
             <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Stay Timeline</h3>
                {isHistoryLoading ? (
                  <div className="space-y-4 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-50 dark:bg-zinc-900 rounded-2xl" />)}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 opacity-50">
                     <p className="text-sm italic">No past bookings found for this identifier.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative">
                     <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10"></div>
                     {[...history].sort((a,b) => {
                        const dateA = a.check_in ? new Date(a.check_in).getTime() : 0;
                        const dateB = b.check_in ? new Date(b.check_in).getTime() : 0;
                        return dateB - dateA;
                     }).map((booking) => (
                       <div key={booking.id} className="relative flex gap-4 items-start group">
                          <div className="w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-[var(--theme-color,#4f46e5)] group-hover:text-white transition-all">
                             <div className="w-2 h-2 rounded-full bg-current" />
                          </div>
                          <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:border-[var(--theme-color,#4f46e5)] transition-all">
                             <div className="flex justify-between items-start mb-2">
                                <span className="font-black text-sm">{booking.room?.name || 'Unknown Room'}</span>
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${booking.status === 'Checked-out' ? 'bg-zinc-200 text-zinc-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                   {booking.status}
                                </span>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold mb-3">
                                {new Date(booking.check_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(booking.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                             </div>
                             <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{booking.booking_source}</span>
                                <span className="text-sm font-black">₹{Number(booking.total_price).toLocaleString()}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {!isLoading && filteredGuests.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-16 text-center shadow-inner">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <User className="w-10 h-10 text-zinc-300" />
          </div>
          <h3 className="font-black text-2xl mb-2 tracking-tight">Profile Not Found</h3>
          <p className="text-zinc-500 max-w-sm mx-auto font-medium">We couldn't find any guests matching your criteria. Try adjusting your search query.</p>
        </div>
      )}
    </div>
  );
}
