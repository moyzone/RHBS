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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-12 font-sans selection:bg-indigo-100 print:min-h-0 print:bg-white print:p-0 print:m-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 shadow-2xl rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black">
        
        {/* Header Ribbon */}
        <div className="bg-zinc-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:bg-zinc-900 print:text-white print:p-4 print:gap-2 print:flex-row print:items-center">
          <div className="space-y-1 print:space-y-0">
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2 print:text-xl">
              <ShieldCheck className="w-8 h-8 text-emerald-400 print:w-6 print:h-6" />
              Restopia Verified
            </h1>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest print:text-[9px] print:text-zinc-300">Digital Tax Invoice • Original for Recipient</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded-2xl border border-zinc-700 print:p-2 print:rounded-xl">
             <div className="flex flex-col text-right">
                <span className="text-xs text-zinc-500 font-bold uppercase print:text-[9px] print:text-zinc-400">Invoice No</span>
                <span className="text-xl font-black text-emerald-400 print:text-base">{invoice.id}</span>
             </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-12 print:p-4 print:space-y-4 print:text-black">
          
          {/* Section 1: Hotel & Guest Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:grid-cols-2 print:gap-4">
            <div className="space-y-4 print:space-y-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b pb-2 print:pb-1 print:text-[10px] print:text-zinc-600 print:border-zinc-300">Service Provider</h3>
              <div className="space-y-1 print:space-y-0.5">
                <p className="text-xl font-bold uppercase tracking-tight print:text-base">{tenant.replace(/-/g, ' ')}</p>
                <p className="text-sm text-zinc-500 print:text-xs print:text-zinc-600">GSTIN: 08AAACR8228R1ZK (Demo)</p>
                <p className="text-sm text-zinc-500 print:text-xs print:text-zinc-600">Authorized Merchant Partner of Restopia</p>
              </div>
            </div>

            <div className="space-y-4 print:space-y-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b pb-2 print:pb-1 print:text-[10px] print:text-zinc-600 print:border-zinc-300">Billed To</h3>
              <div className="space-y-1 print:space-y-0.5">
                <p className="text-xl font-bold print:text-base">{booking.guest_name}</p>
                <p className="text-sm text-zinc-500 print:text-xs print:text-zinc-600">{booking.guest_contact}</p>
                <p className="text-sm text-zinc-500 print:text-xs print:text-zinc-600">{booking.guest_email || 'No email provided'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Stay Details */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-6 print:p-3 print:rounded-xl print:grid-cols-4 print:gap-2 print:bg-zinc-50 print:border-zinc-200">
             <div className="space-y-1 print:space-y-0">
                <span className="text-[10px] font-black uppercase text-zinc-400 print:text-zinc-500 print:text-[9px]">Arrived</span>
                <p className="text-sm font-bold print:text-xs">{checkIn}</p>
             </div>
             <div className="space-y-1 print:space-y-0">
                <span className="text-[10px] font-black uppercase text-zinc-400 print:text-zinc-500 print:text-[9px]">Departed</span>
                <p className="text-sm font-bold print:text-xs">{checkOut}</p>
             </div>
             <div className="space-y-1 print:space-y-0">
                <span className="text-[10px] font-black uppercase text-zinc-400 print:text-zinc-500 print:text-[9px]">Duration</span>
                <p className="text-sm font-bold print:text-xs">{stayNights} Night(s)</p>
             </div>
             <div className="space-y-1 print:space-y-0">
                <span className="text-[10px] font-black uppercase text-zinc-400 print:text-zinc-500 print:text-[9px]">Unit</span>
                <p className="text-sm font-bold print:text-xs">{booking.room?.name || 'N/A'}</p>
             </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="space-y-8 print:space-y-3">
             <table className="w-full text-left">
                <thead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b print:border-zinc-300">
                   <tr>
                      <th className="pb-4 print:pb-1.5 print:text-[9px] print:text-zinc-600">Description</th>
                      <th className="pb-4 print:pb-1.5 print:text-[9px] print:text-zinc-600 text-right">Amount (INR)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 print:divide-zinc-200">
                   {invoice.line_items && invoice.line_items.length > 0 ? (
                      invoice.line_items.map((item: any, idx: number) => (
                        <tr key={idx} className="text-sm print:text-xs print-avoid-break">
                           <td className="py-6 print:py-2">
                              <p className="font-bold">{item.description}</p>
                           </td>
                           <td className="py-6 print:py-2 text-right font-bold tracking-tight">₹{parseFloat(item.amount).toLocaleString()}</td>
                        </tr>
                      ))
                   ) : (
                    <tr className="text-sm print:text-xs print-avoid-break">
                       <td className="py-6 print:py-2">
                          <p className="font-bold">Accommodation Services</p>
                          <p className="text-xs text-zinc-500 print:text-[10px] print:text-zinc-500 mt-1 print:mt-0">Room Rent for {stayNights} nights</p>
                       </td>
                       <td className="py-6 print:py-2 text-right font-bold tracking-tight">₹{parseFloat(invoice.subtotal).toLocaleString()}</td>
                    </tr>
                   )}
                </tbody>
             </table>

             {invoice.bill_notes && (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 print:p-2.5 print:rounded-xl print:bg-zinc-50 print:border-zinc-300 print-avoid-break">
                   <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest print:mb-0.5 print:text-[9px] print:text-zinc-500">Notes & Adjustments</p>
                   <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 italic leading-relaxed print:text-xs print:text-zinc-700">
                      "{invoice.bill_notes}"
                   </p>
                </div>
             )}
          </div>

          {/* Section 4: Summary & Tax */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 pt-8 print:flex-row print:items-end print:gap-4 print:pt-2 print-avoid-break">
             {/* QR Code Placeholder */}
             <div className="flex flex-col items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 print:p-2 print:gap-1 print:rounded-xl print:bg-zinc-50 print:border-zinc-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} 
                  alt="Invoice QR" 
                  className="w-24 h-24 print:w-16 print:h-16"
                />
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter print:text-[8px] print:text-zinc-500">Digital Timestamp</span>
             </div>

             <div className="w-full md:w-80 space-y-3 print:w-72 print:space-y-1">
                <div className="flex justify-between text-sm print:text-xs">
                   <span className="text-zinc-500 font-medium print:text-zinc-600">Consolidated Subtotal</span>
                   <span className="font-bold">₹{parseFloat(invoice.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm print:text-xs">
                   <span className="text-zinc-500 font-medium font-bold print:text-zinc-600">GST Tax ({invoice.gst_percentage}%)</span>
                   <span className="font-bold">₹{parseFloat(invoice.gst_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-indigo-600 pt-4 border-t-4 border-double border-zinc-100 dark:border-zinc-800 print:text-lg print:pt-2 print:border-t-2 print:border-zinc-300 print:text-indigo-700">
                   <span>Final Amount</span>
                   <span>₹{parseFloat(invoice.total_amount).toLocaleString()}</span>
                </div>
             </div>
          </div>

          {/* Footer Card */}
          <div className="pt-12 mt-12 border-t border-zinc-100 dark:border-zinc-800 text-center print:pt-2 print:mt-2 print:border-t-0 print-avoid-break">
             <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-2 rounded-full text-emerald-600 font-bold text-xs uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 mb-6 print:px-4 print:py-1 print:mb-1 print:text-[10px] print:border-emerald-300 print:bg-emerald-50">
                <CheckCircle className="w-4 h-4 print:w-3 print:h-3" />
                Payment Confirmed
             </div>
             <p className="text-xs text-zinc-400 font-medium mb-8 print:text-[9px] print:text-zinc-500 print:mb-0">This is a computer-generated document and does not require a physical signature.</p>
             
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
