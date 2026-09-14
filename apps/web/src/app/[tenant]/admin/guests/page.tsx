"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fetchApi, BASE_URL } from '@/lib/api';
import { Search, User, Mail, Phone, Image as ImageIcon, ExternalLink, Calendar, X, MapPin, ShieldCheck, Eye } from 'lucide-react';

export default function GuestsPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewIdImage, setPreviewIdImage] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

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
    (g.name && g.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.phone && g.phone.includes(searchTerm)) ||
    (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.id && g.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const rowVirtualizer = useVirtualizer({
    count: filteredGuests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  // Reset scroll to top when search term changes
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [searchTerm]);

  const totalSpent = history.reduce((acc: number, b: any) => acc + (Number(b.total_price) || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 min-h-screen flex flex-col">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">Guest Profiles</h1>
            {!isLoading && (
              <span className="bg-indigo-50 dark:bg-indigo-950/50 text-[var(--theme-color,#4f46e5)] px-3 py-1 rounded-full text-xs font-extrabold border border-indigo-100 dark:border-indigo-900/50">
                {filteredGuests.length} {filteredGuests.length === 1 ? 'Guest' : 'Guests'}
              </span>
            )}
          </div>
          <p className="text-zinc-500 mt-1">Manage your repeat guests and view their complete CRM history in high-density tabular layout.</p>
        </div>
        
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[var(--theme-color,#4f46e5)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name, phone, email or ID..." 
            className="pl-10 pr-4 py-3 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-12 gap-4 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">
          <div className="col-span-3">Guest Profile</div>
          <div className="col-span-3">Contact Details</div>
          <div className="col-span-2">Location / Address</div>
          <div className="col-span-2">Joined Date</div>
          <div className="col-span-1 text-center">ID Proof</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Loading State Skeleton */}
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full" />
            ))}
          </div>
        ) : filteredGuests.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 dark:border-zinc-800">
              <User className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="font-extrabold text-xl mb-1 tracking-tight">No Guests Found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">No guest profiles match your search filter "{searchTerm}". Try typing a different name or phone number.</p>
          </div>
        ) : (
          /* Virtualized Row List */
          <div ref={parentRef} className="overflow-y-auto max-h-[calc(100vh-270px)] min-h-[450px]">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const guest = filteredGuests[virtualRow.index];
                const guestShortId = guest.id ? guest.id.split('_')[1] || guest.id : 'N/A';
                const formattedDate = guest.created_at 
                  ? new Date(guest.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                  : 'N/A';

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-sm"
                  >
                    {/* Column 1: Guest Info */}
                    <div className="col-span-3 flex items-center gap-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--theme-color,#4f46e5)]/10 text-[var(--theme-color,#4f46e5)] flex items-center justify-center font-black text-sm shrink-0 border border-[var(--theme-color,#4f46e5)]/20 shadow-inner">
                        {guest.name ? guest.name.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate hover:text-[var(--theme-color,#4f46e5)] transition-colors">
                          {guest.name}
                        </h4>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">
                          ID: {guestShortId}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Contact Details */}
                    <div className="col-span-3 space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{guest.phone}</span>
                      </div>
                      {guest.email ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{guest.email}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">No email</span>
                      )}
                    </div>

                    {/* Column 3: Location / Address */}
                    <div className="col-span-2 overflow-hidden">
                      {guest.address || guest.pincode || guest.country ? (
                        <div className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="truncate font-medium text-xs">
                            {guest.address}{guest.pincode ? `, ${guest.pincode}` : ''}{guest.country ? ` (${guest.country})` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">Unspecified</span>
                      )}
                    </div>

                    {/* Column 4: Joined Date */}
                    <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>{formattedDate}</span>
                    </div>

                    {/* Column 5: ID Proof */}
                    <div className="col-span-1 flex justify-center">
                      {guest.id_proof_image_url ? (
                        <button
                          onClick={() => setPreviewIdImage(`${BASE_URL}${guest.id_proof_image_url}`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-wider group"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden lg:inline">Verified</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1 opacity-60">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">No ID</span>
                        </span>
                      )}
                    </div>

                    {/* Column 6: Actions */}
                    <div className="col-span-1 text-right">
                      <button 
                        onClick={() => { setSelectedGuest(guest); setIsDrawerOpen(true); }}
                        className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-white hover:bg-[var(--theme-color,#4f46e5)] dark:hover:bg-[var(--theme-color,#4f46e5)] dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all active:scale-95 shadow-sm"
                      >
                        History
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ID Proof Image Modal */}
      {previewIdImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5" />
                Verified Guest ID Proof
              </div>
              <button 
                onClick={() => setPreviewIdImage(null)} 
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full max-h-[60vh] overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              <img src={previewIdImage} alt="Verified Guest ID Proof" className="max-w-full max-h-[60vh] object-contain" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <a 
                href={previewIdImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-2"
              >
                Open Original <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button 
                onClick={() => setPreviewIdImage(null)} 
                className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[var(--theme-color,#4f46e5)] text-white rounded-xl hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History CRM Drawer */}
      {isDrawerOpen && selectedGuest && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
             {/* Drawer Header */}
             <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--theme-color,#4f46e5)]/10 flex items-center justify-center text-[var(--theme-color,#4f46e5)] font-bold text-xl">
                        {selectedGuest.name ? selectedGuest.name.charAt(0).toUpperCase() : 'G'}
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
    </div>
  );
}

