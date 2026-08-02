"use client"

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicApi } from '@/lib/api';
import { FileText, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

export default function PublicInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tenant = params.tenant as string;
  const shouldPrint = searchParams.get('print') === 'true';

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn: () => fetchPublicApi<any>(`/public/invoices/${id}`),
  });

  // MUST be before any early returns — Rules of Hooks
  React.useEffect(() => {
    if (shouldPrint && !isLoading && invoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, isLoading, invoice]);

  const booking = invoice?.booking;
  const checkIn = booking ? new Date(booking.check_in).toLocaleDateString() : '';
  const checkOut = booking ? new Date(booking.check_out).toLocaleDateString() : '';
  const stayNights = booking ? Math.max(1, Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 3600 * 24))) : 0;

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-sans text-zinc-500">Loading invoice...</div>;
  if (error || !invoice) return <div className="flex items-center justify-center min-h-screen text-red-500 font-sans">Invoice not found or expired.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-12 font-sans selection:bg-indigo-100">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 shadow-2xl rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 print:shadow-none print:border-none">
        
        {/* Header Ribbon */}
        <div className="bg-zinc-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              Restopia Verified
            </h1>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Digital Tax Invoice • Original for Recipient</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
             <div className="flex flex-col text-right">
                <span className="text-xs text-zinc-500 font-bold uppercase">Invoice No</span>
                <span className="text-xl font-black text-emerald-400">{invoice.id}</span>
             </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-12">
          
          {/* Section 1: Hotel & Guest Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b pb-2">Service Provider</h3>
              <div className="space-y-1">
                <p className="text-xl font-bold uppercase tracking-tight">{tenant.replace(/-/g, ' ')}</p>
                <p className="text-sm text-zinc-500">GSTIN: 08AAACR8228R1ZK (Demo)</p>
                <p className="text-sm text-zinc-500">Authorized Merchant Partner of Restopia</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b pb-2">Billed To</h3>
              <div className="space-y-1">
                <p className="text-xl font-bold">{booking.guest_name}</p>
                <p className="text-sm text-zinc-500">{booking.guest_contact}</p>
                <p className="text-sm text-zinc-500">{booking.guest_email || 'No email provided'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Stay Details */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">Arrived</span>
                <p className="text-sm font-bold">{checkIn}</p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">Departed</span>
                <p className="text-sm font-bold">{checkOut}</p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">Duration</span>
                <p className="text-sm font-bold">{stayNights} Night(s)</p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">Unit</span>
                <p className="text-sm font-bold">{booking.room?.name || 'N/A'}</p>
             </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="space-y-8">
             <table className="w-full text-left">
                <thead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b">
                   <tr>
                      <th className="pb-4">Description</th>
                      <th className="pb-4 text-right">Amount (INR)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   {invoice.line_items && invoice.line_items.length > 0 ? (
                      invoice.line_items.map((item: any, idx: number) => (
                        <tr key={idx} className="text-sm">
                           <td className="py-6">
                              <p className="font-bold">{item.description}</p>
                           </td>
                           <td className="py-6 text-right font-bold tracking-tight">₹{parseFloat(item.amount).toLocaleString()}</td>
                        </tr>
                      ))
                   ) : (
                    <tr className="text-sm">
                       <td className="py-6">
                          <p className="font-bold">Accommodation Services</p>
                          <p className="text-xs text-zinc-500 mt-1">Room Rent for {stayNights} nights</p>
                       </td>
                       <td className="py-6 text-right font-bold tracking-tight">₹{parseFloat(invoice.subtotal).toLocaleString()}</td>
                    </tr>
                   )}
                </tbody>
             </table>

             {invoice.bill_notes && (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                   <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest">Notes & Adjustments</p>
                   <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 italic leading-relaxed">
                      "{invoice.bill_notes}"
                   </p>
                </div>
             )}
          </div>

          {/* Section 4: Summary & Tax */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 pt-8">
             {/* QR Code Placeholder */}
             <div className="flex flex-col items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} 
                  alt="Invoice QR" 
                  className="w-24 h-24"
                />
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Digital Timestamp</span>
             </div>

             <div className="w-full md:w-80 space-y-3">
                <div className="flex justify-between text-sm">
                   <span className="text-zinc-500 font-medium">Consolidated Subtotal</span>
                   <span className="font-bold">₹{parseFloat(invoice.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-zinc-500 font-medium font-bold">GST Tax ({invoice.gst_percentage}%)</span>
                   <span className="font-bold">₹{parseFloat(invoice.gst_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-indigo-600 pt-4 border-t-4 border-double border-zinc-100 dark:border-zinc-800">
                   <span>Final Amount</span>
                   <span>₹{parseFloat(invoice.total_amount).toLocaleString()}</span>
                </div>
             </div>
          </div>

          {/* Footer Card */}
          <div className="pt-12 mt-12 border-t border-zinc-100 dark:border-zinc-800 text-center">
             <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-2 rounded-full text-emerald-600 font-bold text-xs uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 mb-6">
                <CheckCircle className="w-4 h-4" />
                Payment Confirmed
             </div>
             <p className="text-xs text-zinc-400 font-medium mb-8">This is a computer-generated document and does not require a physical signature.</p>
             
             <button 
               onClick={() => window.print()} 
               className="print:hidden flex items-center gap-2 mx-auto px-6 py-3 bg-zinc-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
             >
                <Printer className="w-4 h-4" />
                Print or Save PDF
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
