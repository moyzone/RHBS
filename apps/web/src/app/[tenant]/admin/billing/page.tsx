"use client"

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import { FileText, Download, CheckCircle2, Edit3, X, Plus, Trash2, Building2, UserCircle, Layout, Search, Mail, Phone, ArrowUpDown, Calendar, DollarSign, TrendingDown, RotateCcw, Utensils, Filter, Paperclip, ExternalLink, Tag, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const { data: bookings = [], isLoading: isBookingsLoading } = useQuery({ 
    queryKey: ['bookings', tenant], 
    queryFn: () => fetchApi<any[]>(tenant, '/bookings') 
  });

  const { data: invoices = [], isLoading: isInvoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/invoices')
  });

  const { data: settings } = useQuery({
    queryKey: ['settings', tenant],
    queryFn: () => fetchApi<any>(tenant, '/settings')
  });

  const { data: allGuests = [] } = useQuery({
    queryKey: ['guests', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/guests')
  });

  const checkedOutBookings = bookings.filter((b: any) => 
    b.status === "Checked-out" && 
    !invoices.some((inv: any) => inv.booking_id === b.id)
  );

  const queryClient = useQueryClient();
  const [justCreated, setJustCreated] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'create-invoice' | 'expenses' | 'payments'>('invoices');
  
  // Expenses Queries & Mutations
  const { data: expensesList = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/expenses')
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ['expenses-summary', tenant],
    queryFn: () => fetchApi<any>(tenant, '/expenses/summary')
  });

  // Expense Filters & Search State
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('All');
  const [expenseDepartmentFilter, setExpenseDepartmentFilter] = useState('All');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expensePaymentModeFilter, setExpensePaymentModeFilter] = useState('All');
  const [expenseSortBy, setExpenseSortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'description-asc' | 'description-desc'>('newest');

  // Expense Modal State (Create / Edit)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Modal Form State
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'Operational', // 'Operational', 'Booking Refund', 'Order Refund', 'Vendor Bill'
    category: 'Utilities',
    department: 'Front Desk',
    amount: '',
    payment_mode: 'UPI',
    expense_status: 'PAID',
    booking_id: '',
    external_booking_ref: '',
    invoice_id: '',
    supplier_name: '',
    receipt_no: '',
    receipt_image_url: '',
    description: '',
    notes: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      expense_type: 'Operational',
      category: 'Utilities',
      department: 'Front Desk',
      amount: '',
      payment_mode: 'UPI',
      expense_status: 'PAID',
      booking_id: '',
      external_booking_ref: '',
      invoice_id: '',
      supplier_name: '',
      receipt_no: '',
      receipt_image_url: '',
      description: '',
      notes: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
    setPreviewReceiptUrl(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      expense_type: expense.expense_type || 'Operational',
      category: expense.category || 'Utilities',
      department: expense.department || 'Front Desk',
      amount: expense.amount ? expense.amount.toString() : '',
      payment_mode: expense.payment_mode || 'UPI',
      expense_status: expense.expense_status || 'PAID',
      booking_id: expense.booking_id || '',
      external_booking_ref: expense.external_booking_ref || '',
      invoice_id: expense.invoice_id || '',
      supplier_name: expense.supplier_name || '',
      receipt_no: expense.receipt_no || '',
      receipt_image_url: expense.receipt_image_url || '',
      description: expense.description || '',
      notes: expense.notes || '',
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setPreviewReceiptUrl(expense.receipt_image_url || null);
    setIsExpenseModalOpen(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingReceipt(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/${tenant}/expenses/upload-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setExpenseForm(prev => ({ ...prev, receipt_image_url: data.url }));
      setPreviewReceiptUrl(data.url);
    } catch (err: any) {
      alert(`Receipt Upload Error: ${err.message}`);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => fetchApi(tenant, '/expenses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenant] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary', tenant] });
      setIsExpenseModalOpen(false);
    },
    onError: (err: any) => {
      alert(`Failed to save expense: ${err.message}`);
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetchApi(tenant, `/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenant] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary', tenant] });
      setIsExpenseModalOpen(false);
    },
    onError: (err: any) => {
      alert(`Failed to update expense: ${err.message}`);
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => fetchApi(tenant, `/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenant] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary', tenant] });
    },
    onError: (err: any) => {
      alert(`Failed to delete expense: ${err.message}`);
    }
  });

  const handleSaveExpense = () => {
    if (!expenseForm.description.trim()) {
      alert("Please enter a description for the expense.");
      return;
    }
    const numAmt = parseFloat(expenseForm.amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Please enter a valid amount (> ₹0).");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (expenseForm.expense_date && expenseForm.expense_date > todayStr) {
      alert("Future dates are not allowed for expenses. Please select today or a past date.");
      return;
    }

    const payload = {
      ...expenseForm,
      amount: numAmt,
      department: expenseForm.expense_type === 'Booking Refund' ? 'Front Desk' :
                  expenseForm.expense_type === 'Order Refund' ? 'Kitchen' :
                  expenseForm.department
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: payload });
    } else {
      createExpenseMutation.mutate(payload);
    }
  };

  const filteredAndSortedExpenses = expensesList
    .filter((e: any) => {
      if (expenseTypeFilter !== 'All' && e.expense_type !== expenseTypeFilter) return false;
      if (expenseDepartmentFilter !== 'All' && e.department !== expenseDepartmentFilter) return false;
      if (expenseCategoryFilter !== 'All' && e.category !== expenseCategoryFilter) return false;
      if (expensePaymentModeFilter !== 'All' && e.payment_mode !== expensePaymentModeFilter) return false;
      
      if (expenseSearch.trim()) {
        const term = expenseSearch.toLowerCase().trim();
        const matchId = (e.id || '').toLowerCase().includes(term);
        const matchDesc = (e.description || '').toLowerCase().includes(term);
        const matchSupplier = (e.supplier_name || '').toLowerCase().includes(term);
        const matchReceipt = (e.receipt_no || '').toLowerCase().includes(term);
        const matchBooking = (e.booking_id || '').toLowerCase().includes(term);
        const matchExtBooking = (e.external_booking_ref || '').toLowerCase().includes(term);
        const matchInvoice = (e.invoice_id || '').toLowerCase().includes(term);
        if (!matchId && !matchDesc && !matchSupplier && !matchReceipt && !matchBooking && !matchExtBooking && !matchInvoice) {
          return false;
        }
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (expenseSortBy === 'newest') {
        const dateA = a.expense_date || a.created_at ? new Date(a.expense_date || a.created_at).getTime() : 0;
        const dateB = b.expense_date || b.created_at ? new Date(b.expense_date || b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      if (expenseSortBy === 'oldest') {
        const dateA = a.expense_date || a.created_at ? new Date(a.expense_date || a.created_at).getTime() : 0;
        const dateB = b.expense_date || b.created_at ? new Date(b.expense_date || b.created_at).getTime() : 0;
        return dateA - dateB;
      }
      if (expenseSortBy === 'amount-desc') {
        return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      }
      if (expenseSortBy === 'amount-asc') {
        return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
      }
      if (expenseSortBy === 'description-asc') {
        return (a.description || '').localeCompare(b.description || '');
      }
      if (expenseSortBy === 'description-desc') {
        return (b.description || '').localeCompare(a.description || '');
      }
      return 0;
    });
  
  // Awaiting Checkout Search & Sort State
  const [awaitingSearchTerm, setAwaitingSearchTerm] = useState('');
  const [awaitingSortBy, setAwaitingSortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc'>('newest');

  const filteredAndSortedAwaitingBookings = checkedOutBookings
    .filter((b: any) => {
      const term = awaitingSearchTerm.toLowerCase().trim();
      if (!term) return true;
      const guestName = (b.guest_name || '').toLowerCase();
      const bookingId = (b.id || '').toLowerCase();
      const roomName = (b.room?.name || '').toLowerCase();
      const amountStr = (b.total_price || '').toString();
      return (
        guestName.includes(term) ||
        bookingId.includes(term) ||
        roomName.includes(term) ||
        amountStr.includes(term)
      );
    })
    .sort((a: any, b: any) => {
      if (awaitingSortBy === 'newest') {
        const dateA = a.check_out ? new Date(a.check_out).getTime() : 0;
        const dateB = b.check_out ? new Date(b.check_out).getTime() : 0;
        return dateB - dateA;
      }
      if (awaitingSortBy === 'oldest') {
        const dateA = a.check_out ? new Date(a.check_out).getTime() : 0;
        const dateB = b.check_out ? new Date(b.check_out).getTime() : 0;
        return dateA - dateB;
      }
      if (awaitingSortBy === 'amount-desc') {
        return (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0);
      }
      if (awaitingSortBy === 'amount-asc') {
        return (parseFloat(a.total_price) || 0) - (parseFloat(b.total_price) || 0);
      }
      if (awaitingSortBy === 'name-asc') {
        return (a.guest_name || '').localeCompare(b.guest_name || '');
      }
      if (awaitingSortBy === 'name-desc') {
        return (b.guest_name || '').localeCompare(a.guest_name || '');
      }
      return 0;
    });

  // Finalized Invoices Search & Sort State
  const [finalizedSearchTerm, setFinalizedSearchTerm] = useState('');
  const [finalizedSortBy, setFinalizedSortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc'>('newest');

  const filteredAndSortedFinalizedInvoices = invoices
    .filter((inv: any) => {
      const term = finalizedSearchTerm.toLowerCase().trim();
      if (!term) return true;
      const guestName = (inv.booking?.guest_name || '').toLowerCase();
      const invoiceId = (inv.id || '').toLowerCase();
      const roomName = (inv.booking?.room?.name || '').toLowerCase();
      const amountStr = (inv.total_amount || '').toString();
      const paymentModeStr = (inv.payment_mode || '').toLowerCase();
      return (
        guestName.includes(term) ||
        invoiceId.includes(term) ||
        roomName.includes(term) ||
        amountStr.includes(term) ||
        paymentModeStr.includes(term)
      );
    })
    .sort((a: any, b: any) => {
      if (finalizedSortBy === 'newest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      if (finalizedSortBy === 'oldest') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      }
      if (finalizedSortBy === 'amount-desc') {
        return (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0);
      }
      if (finalizedSortBy === 'amount-asc') {
        return (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0);
      }
      if (finalizedSortBy === 'name-asc') {
        return (a.booking?.guest_name || '').localeCompare(b.booking?.guest_name || '');
      }
      if (finalizedSortBy === 'name-desc') {
        return (b.booking?.guest_name || '').localeCompare(a.booking?.guest_name || '');
      }
      return 0;
    });
  
  // Create Invoice State
  const [invoiceTo, setInvoiceTo] = useState<'Leads' | 'Business' | 'Customer'>('Customer');
  const [discountActive, setDiscountActive] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Invoice Items List
  const [invoicedItems, setInvoicedItems] = useState<any[]>([]);

  // Current Line Form State
  const [currentLineType, setCurrentLineType] = useState('Product Line');
  const [lineFormData, setLineFormData] = useState<any>({
    serviceType: '', productGroup: '', product: '', offering: '',
    name: '', code: '', billingFrequency: 'Monthly', unitPrice: 0, quantity: 1,
    discountPct: 0, taxPct: 18, referenceNumber: ''
  });

  // Calculate current line values
  const currentSubTotal = lineFormData.unitPrice * lineFormData.quantity;
  const currentTaxAmount = (currentSubTotal * (1 - lineFormData.discountPct / 100)) * (lineFormData.taxPct / 100);
  const currentAfterTaxAmount = currentSubTotal * (1 - lineFormData.discountPct / 100) + currentTaxAmount;

  const subTotal = invoicedItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const taxAmount = invoicedItems.reduce((acc, item) => acc + item.taxAmount, 0);
  const totalAmount = subTotal + taxAmount + serviceCharge + deliveryCharge - discountAmount;
  const balanceAmount = totalAmount - paidAmount;

  const handleAddLine = () => {
    if (!lineFormData.name && !lineFormData.referenceNumber) return;
    
    setInvoicedItems([...invoicedItems, {
      ...lineFormData,
      type: currentLineType,
      subTotal: currentSubTotal,
      taxAmount: currentTaxAmount,
      afterTaxAmount: currentAfterTaxAmount,
      total: currentAfterTaxAmount
    }]);

    // Reset form (mostly)
    setLineFormData({
      ...lineFormData,
      name: '', code: '', unitPrice: 0, quantity: 1, referenceNumber: ''
    });
  };

  // Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const filteredGuests = allGuests.filter((g: any) => 
    g.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    g.phone?.includes(customerSearch) ||
    g.email?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 5);


  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthInvoices = invoices.filter((inv: any) => {
    const dateStr = inv.created_at || inv.due_date;
    if (!dateStr) return false;
    const invDate = new Date(dateStr);
    if (isNaN(invDate.getTime())) return false;
    return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
  });

  const totalRevenue = currentMonthInvoices.reduce((acc: number, inv: any) => acc + parseFloat(inv.total_amount || 0), 0);
  const totalGST = currentMonthInvoices.reduce((acc: number, inv: any) => acc + (parseFloat(inv.total_amount || 0) * 0.18 / 1.18), 0);

  // Review System State (Restored)
  const [editItems, setEditItems] = useState<{type: string, description: string, amount: string}[]>([]);
  const [editNotes, setEditNotes] = useState<string>('');

  const generateInvoice = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string, data: any }) => 
        fetchApi(tenant, `/bookings/${bookingId}/invoice`, { 
            method: 'POST',
            body: JSON.stringify(data)
        }),
    onSuccess: (data: any) => {
      setSelectedInvoice(data);
      setJustCreated(true);
      setReviewingBooking(null);
      queryClient.invalidateQueries({ queryKey: ['invoices', tenant] });
      queryClient.invalidateQueries({ queryKey: ['bookings', tenant] });
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to generate invoice. Please ensure all line item descriptions are non-empty and amounts are greater than 0.";
      alert(`Invoice Generation Blocked: ${msg}`);
      console.error("Generate Invoice Error:", err);
    }
  });

  const handleStartReview = (booking: any) => {
    setReviewingBooking(booking);
    setEditItems([{ type: 'Booking Line', description: 'Accommodation Services', amount: booking.total_price.toString() }]);
    setEditNotes('');
  };

  const addReviewItem = () => setEditItems([...editItems, { type: 'Service Line', description: '', amount: '0' }]);
  const removeReviewItem = (index: number) => setEditItems(editItems.filter((_, i) => i !== index));
  const updateReviewItem = (index: number, field: 'type' | 'description' | 'amount', value: string) => {
    const newItems = [...editItems];
    let sanitizedVal = value;
    if (field === 'amount') {
      sanitizedVal = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    }
    newItems[index] = { ...newItems[index], [field]: sanitizedVal };
    setEditItems(newItems);
  };

  const isReviewItemValid = (item: { description: string; amount: string }) => {
    const isDescValid = item.description.trim() !== '';
    const numAmt = Number(item.amount);
    const isAmtValid = item.amount !== '' && !isNaN(numAmt) && numAmt > 0;
    return isDescValid && isAmtValid;
  };

  const isReviewFormValid = editItems.length > 0 && editItems.every(isReviewItemValid);

  const currentSubtotal = editItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const currentGstRate = currentSubtotal >= 7500 ? 18 : 5;
  const currentGstAmount = currentSubtotal * (currentGstRate / 100);
  const currentTotal = currentSubtotal + currentGstAmount;

  const saveInvoice = useMutation({
    mutationFn: (data: any) => fetchApi(tenant, '/invoices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data: any) => {
      setSelectedInvoice(data);
      setJustCreated(true);
      setInvoicedItems([]);
      setCustomerSearch('');
      setCustomerPhone('');
      setCustomerEmail('');
      setSelectedCustomer(null);
      setDiscountAmount(0);
      setServiceCharge(0);
      setDeliveryCharge(0);
      setPaidAmount(0);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['invoices', tenant] });
      queryClient.invalidateQueries({ queryKey: ['bookings', tenant] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      alert(`Failed to save invoice: ${msg}. Please ensure all required fields are filled.`);
      console.error("Invoice Save Error:", err);
    }
  });

  const handleSaveInvoice = () => {
    if (invoicedItems.length === 0) {
      alert("Please add at least one line item before saving.");
      return;
    }

    const payload = {
      booking_id: selectedCustomer?.booking_id || null,
      customer_name: selectedCustomer?.name || customerSearch,
      customer_contact: customerPhone,
      customer_email: customerEmail,
      subtotal: Number(subTotal) || 0,
      gst_percentage: 18,
      gst_amount: Number(taxAmount) || 0,
      total_amount: Number(totalAmount) || 0,
      tax_amount: Number(taxAmount) || 0,
      paid_amount: Number(paidAmount) || 0,
      balance_amount: Number(balanceAmount) || 0,
      payment_mode: paymentMode || 'Cash',
      due_date: dueDate || new Date().toISOString(),
      bill_notes: notes,
      items: invoicedItems
    };

    console.log("Saving Invoice Payload:", payload);
    saveInvoice.mutate(payload);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen selection:bg-indigo-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent italic">Finance</h1>
          <p className="text-zinc-500 mt-1 font-bold text-xs uppercase tracking-widest">Digital Ledger & Tax Compliance</p>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {[
            { id: 'invoices', label: 'Invoice Management' },
            { id: 'create-invoice', label: 'Create Invoice' },
            { id: 'expenses', label: 'Expense Management' },
            { id: 'payments', label: 'Create Payment' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-white dark:bg-zinc-900 shadow-md text-[var(--theme-color,#4f46e5)] scale-105" 
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'invoices' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-[0.03] rounded-bl-full transition-transform group-hover:scale-110"></div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total Revenue Generated</span>
                <div className="text-4xl font-black mt-2 tracking-tighter">₹{totalRevenue.toLocaleString()}</div>
                <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-tight">
                   <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                   Current Month Revenue
                </div>
             </div>
             <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 opacity-[0.03] rounded-bl-full transition-transform group-hover:scale-110"></div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">GST Tax Collected (This Month)</span>
                <div className="text-4xl font-black mt-2 tracking-tighter text-indigo-600">₹{totalGST.toLocaleString()}</div>
                <div className="mt-4 text-zinc-400 font-bold text-xs uppercase tracking-tight">Current Month Tax Liability</div>
             </div>
             <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500 opacity-[0.03] rounded-bl-full transition-transform group-hover:scale-110"></div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Pending Invoices</span>
                <div className="text-4xl font-black mt-2 tracking-tighter text-rose-500">{checkedOutBookings.length}</div>
                <div className="mt-4 text-zinc-400 font-bold text-xs uppercase tracking-tight">Items Awaiting Finalization</div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Pending Section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2 uppercase text-zinc-400 text-xs">
                  Awaiting Checkout Invoices
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    {filteredAndSortedAwaitingBookings.length}
                  </span>
                </h2>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search guest, ID, or amount..."
                    value={awaitingSearchTerm}
                    onChange={(e) => setAwaitingSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all placeholder-zinc-400"
                  />
                  {awaitingSearchTerm && (
                    <button
                      onClick={() => setAwaitingSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <ArrowUpDown className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
                  <select
                    value={awaitingSortBy}
                    onChange={(e: any) => setAwaitingSortBy(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 cursor-pointer w-full sm:w-auto shadow-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-desc">Amount: High to Low</option>
                    <option value="amount-asc">Amount: Low to High</option>
                    <option value="name-asc">Guest: A to Z</option>
                    <option value="name-desc">Guest: Z to A</option>
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b">
                    <tr>
                      <th className="p-6">Booking Details</th>
                      <th className="p-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {isBookingsLoading ? (
                      <tr><td colSpan={2} className="p-8 text-center animate-pulse">Scanning ledger...</td></tr>
                    ) : filteredAndSortedAwaitingBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="p-6">
                          <div className="font-bold flex items-center gap-2">
                             {b.guest_name}
                             <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 rounded-full uppercase tracking-tighter">{b.id}</span>
                          </div>
                          <div className="text-xs font-bold text-[var(--theme-color,#4f46e5)] mt-1 tracking-tight flex items-center gap-2 flex-wrap">
                             <span>₹{parseFloat(b.total_price).toLocaleString()} • Space Allocated</span>
                             {b.check_out && (
                               <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md text-[11px]">
                                 <Calendar className="w-3 h-3 text-zinc-400" />
                                 Checked out: {new Date(b.check_out).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                               </span>
                             )}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <button 
                             onClick={() => handleStartReview(b)}
                             disabled={generateInvoice.isPending}
                             className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"
                          >
                             <Edit3 className="w-3 h-3" /> Review & Seal
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedAwaitingBookings.length === 0 && !isBookingsLoading && (
                      <tr>
                        <td colSpan={2} className="p-12 text-center text-zinc-400 font-medium italic">
                          {awaitingSearchTerm ? `No pending invoices matching "${awaitingSearchTerm}".` : 'No pending items found in register.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2 uppercase text-zinc-400 text-xs">
                  Finalized Invoices History
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    {filteredAndSortedFinalizedInvoices.length}
                  </span>
                </h2>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search guest, ID, or amount..."
                    value={finalizedSearchTerm}
                    onChange={(e) => setFinalizedSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm transition-all placeholder-zinc-400"
                  />
                  {finalizedSearchTerm && (
                    <button
                      onClick={() => setFinalizedSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <ArrowUpDown className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
                  <select
                    value={finalizedSortBy}
                    onChange={(e: any) => setFinalizedSortBy(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 cursor-pointer w-full sm:w-auto shadow-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-desc">Amount: High to Low</option>
                    <option value="amount-asc">Amount: Low to High</option>
                    <option value="name-asc">Guest: A to Z</option>
                    <option value="name-desc">Guest: Z to A</option>
                  </select>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b">
                    <tr>
                      <th className="p-6">Reference</th>
                      <th className="p-6 text-right">Billing Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {isInvoicesLoading ? (
                      <tr><td colSpan={2} className="p-8 text-center animate-pulse">Syncing history...</td></tr>
                    ) : (
                      filteredAndSortedFinalizedInvoices.map((inv: any) => (
                        <tr key={inv.id} 
                            onClick={() => setSelectedInvoice(inv)}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        >
                          <td className="p-6">
                            <div className="font-bold flex items-center gap-2 group-hover:text-[var(--theme-color,#4f46e5)] transition-colors">
                               {inv.id}
                               <div className="p-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><Download className="w-3 h-3 text-emerald-600" /></div>
                            </div>
                            <div className="text-xs text-zinc-400 font-bold mt-1 uppercase tracking-tighter">Billed to {inv.booking?.guest_name}</div>
                          </td>
                          <td className="p-6 text-right">
                             <div className="font-black tracking-tight">₹{parseFloat(inv.total_amount).toLocaleString()}</div>
                             <div className="text-[10px] text-zinc-400 font-black tracking-widest mt-0.5 uppercase hover:underline">View Proof</div>
                          </td>
                        </tr>
                      ))
                    )}
                    {filteredAndSortedFinalizedInvoices.length === 0 && !isInvoicesLoading && (
                      <tr>
                        <td colSpan={2} className="p-12 text-center text-zinc-400 font-medium italic">
                          {finalizedSearchTerm ? `No finalized invoices matching "${finalizedSearchTerm}".` : 'Archive is currently empty.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create-invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
           {/* Left Content: Stepped Form */}
           <div className="lg:col-span-8 space-y-12">
              
              {/* Toggle Header */}
              <div className="flex justify-end items-center gap-4 mb-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Invoice to:</span>
                 <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    {['Leads', 'Business', 'Customer'].map(type => (
                       <button 
                         key={type}
                         onClick={() => setInvoiceTo(type as any)}
                         className={cn(
                           "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                           invoiceTo === type ? "bg-white dark:bg-zinc-900 shadow-sm text-indigo-600" : "text-zinc-400 hover:text-zinc-600"
                         )}
                       >
                          {type}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Step 1: Business Details */}
              <div className="relative pl-12">
                 <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs z-10">1</div>
                 <div className="absolute left-4 top-8 bottom-0 w-[2px] bg-zinc-100 dark:bg-zinc-800 -mb-12"></div>
                 
                 <div className="flex items-center gap-2 mb-6">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Business Details</h3>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl border border-zinc-100 dark:border-zinc-700">🏢</div>
                          <div>
                             <p className="font-black text-lg tracking-tight">{settings?.name || 'Your Property Name'}</p>
                             <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{settings?.business_type || 'Accommodation'}</p>
                          </div>
                       </div>
                       <div className="space-y-1 text-xs font-medium text-zinc-500">
                          <p>{settings?.address_street_name}, {settings?.address_city}</p>
                          <p>{settings?.address_state}, {settings?.address_country}</p>
                          <p className="mt-2 text-zinc-900 dark:text-zinc-300"><b>Mobile:</b> {settings?.phone || 'Not set'}</p>
                          <p className="text-zinc-900 dark:text-zinc-300"><b>Email:</b> {settings?.email || 'Not set'}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[11px]">
                       <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800">
                          <span className="font-black text-zinc-400 uppercase tracking-widest">GSTIN:</span>
                          <span className="font-bold">{settings?.gst_number || 'N/A'}</span>
                       </div>
                       <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800">
                          <span className="font-black text-zinc-400 uppercase tracking-widest">Bank Name:</span>
                          <span className="font-bold">{settings?.bank_name || 'N/A'}</span>
                       </div>
                       <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800">
                          <span className="font-black text-zinc-400 uppercase tracking-widest">Acc. No:</span>
                          <span className="font-bold">{settings?.account_number || 'N/A'}</span>
                       </div>
                       <div className="flex justify-between py-1">
                          <span className="font-black text-zinc-400 uppercase tracking-widest">IFSC Code:</span>
                          <span className="font-bold">{settings?.ifsc_code || 'N/A'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Step 2: Customer Details */}
              <div className="relative pl-12">
                 <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center font-black text-xs z-10">2</div>
                 <div className="absolute left-4 top-8 bottom-0 w-[2px] bg-zinc-100 dark:bg-zinc-800 -mb-12"></div>

                 <div className="flex items-center gap-2 mb-6">
                    <UserCircle className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Customer Details</h3>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2 relative">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Search {invoiceTo} (Name/Phone/Email)</label>
                          <div className="relative">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                             <input 
                               type="text" 
                               value={customerSearch}
                               onChange={(e) => {
                                  setCustomerSearch(e.target.value);
                                  setShowSearchResults(true);
                               }}
                               placeholder={`Search by name, number or email...`} 
                               className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                             />
                          </div>
                          
                          {showSearchResults && customerSearch.length > 0 && (
                             <div className="absolute z-20 left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                {filteredGuests.length > 0 ? filteredGuests.map((g: any) => (
                                   <div 
                                     key={g.id}
                                     onClick={() => {
                                        setSelectedCustomer(g);
                                        setCustomerSearch(g.name);
                                        setCustomerPhone(g.phone);
                                        setCustomerEmail(g.email || '');
                                        setShowSearchResults(false);
                                     }}
                                     className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                                   >
                                      <div className="font-bold text-xs">{g.name}</div>
                                      <div className="text-[10px] text-zinc-400 flex gap-2 mt-1">
                                         <span>{g.phone}</span>
                                         <span>•</span>
                                         <span>{g.email || 'No email'}</span>
                                      </div>
                                   </div>
                                )) : (
                                   <div className="p-4 text-xs text-zinc-400 italic">No matches found. Enter manual details below.</div>
                                )}
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 text-[9px] font-black uppercase tracking-widest text-center border-t cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setShowSearchResults(false)}>Close Search</div>
                             </div>
                          )}
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact Number</label>
                          <div className="relative">
                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                             <input 
                               type="text" 
                               value={customerPhone}
                               onChange={(e) => setCustomerPhone(e.target.value)}
                               placeholder="+91 00000 00000" 
                               className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                             />
                          </div>
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Address</label>
                          <div className="relative">
                             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                             <input 
                               type="email" 
                               value={customerEmail}
                               onChange={(e) => setCustomerEmail(e.target.value)}
                               placeholder="customer@email.com" 
                               className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all" 
                             />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Step 3: Invoice Lines */}
              <div className="relative pl-12 pb-12">
                 <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center font-black text-xs z-10">3</div>

                 <div className="flex items-center gap-2 mb-6">
                    <Layout className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Invoice Lines</h3>
                 </div>

                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200 dark:border-zinc-800 space-y-8">
                    {/* Select Type Dropdown */}
                    <div className="w-full max-w-md relative group">
                       <label className="absolute -top-2 left-4 bg-white dark:bg-zinc-900 px-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 z-10">Select Type</label>
                       <select 
                         value={currentLineType}
                         onChange={(e) => setCurrentLineType(e.target.value)}
                         className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-600 transition-all appearance-none cursor-pointer"
                       >
                          <option value="Product Line">Product Line</option>
                          <option value="Service Line">Service Line</option>
                          <option value="Package Line">Package Line</option>
                          <option value="Module Line">Module Line</option>
                          <option value="Feature Line">Feature Line</option>
                          <option value="Booking Line">Booking Line</option>
                          <option value="Order Line">Order Line</option>
                          <option value="Others">Others</option>
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                          <X className="w-4 h-4 rotate-45" />
                       </div>
                    </div>

                    {/* Dynamic Form Area */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
                       
                       {(currentLineType === 'Product Line' || currentLineType === 'Service Line') && (
                          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Service Type</label>
                                <select 
                                  value={currentLineType === 'Product Line' ? 'Accommodation' : lineFormData.serviceType}
                                  onChange={(e) => setLineFormData({...lineFormData, serviceType: e.target.value})}
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                >
                                   {currentLineType === 'Product Line' ? (
                                      <option value="Accommodation">Accommodation</option>
                                   ) : (
                                      <>
                                         <option value="">Select Service Type</option>
                                         <option value="F&B">F&B</option>
                                         <option value="Spa">Spa</option>
                                         <option value="Laundry">Laundry</option>
                                      </>
                                   )}
                                </select>
                             </div>
                             {currentLineType === 'Product Line' ? (
                                <>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Product Group</label>
                                      <select 
                                        value={lineFormData.productGroup}
                                        onChange={(e) => setLineFormData({...lineFormData, productGroup: e.target.value})}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                      >
                                         <option value="">Select Product Group</option>
                                         <option value="Beverages">Beverages</option>
                                         <option value="Snacks">Snacks</option>
                                         <option value="Toiletries">Toiletries</option>
                                      </select>
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Product</label>
                                      <select 
                                        value={lineFormData.product}
                                        onChange={(e) => {
                                           const val = e.target.value;
                                           let price = 0;
                                           if (val === 'Water Bottle') price = 20;
                                           if (val === 'Pepsi') price = 40;
                                           if (val === 'Lays Chips') price = 30;
                                           if (val === 'Toothbrush') price = 50;
                                           setLineFormData({...lineFormData, product: val, name: val, unitPrice: price});
                                        }}
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                      >
                                         <option value="">Select Product</option>
                                         <option value="Water Bottle">Water Bottle (₹20)</option>
                                         <option value="Pepsi">Pepsi (₹40)</option>
                                         <option value="Lays Chips">Lays Chips (₹30)</option>
                                         <option value="Toothbrush">Toothbrush (₹50)</option>
                                      </select>
                                   </div>
                                </>
                             ) : (
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Offering</label>
                                   <select 
                                     value={lineFormData.offering}
                                     onChange={(e) => {
                                        const val = e.target.value;
                                        let price = 0;
                                        if (val === 'Deep Clean') price = 500;
                                        if (val === 'Dry Wash') price = 200;
                                        if (val === 'Laundry - per kg') price = 80;
                                        setLineFormData({...lineFormData, offering: val, name: val, unitPrice: price});
                                     }}
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                   >
                                      <option value="">Select Offering</option>
                                      <option value="Deep Clean">Room Deep Clean (₹500)</option>
                                      <option value="Dry Wash">Cloth Dry Wash (₹200)</option>
                                      <option value="Laundry - per kg">Laundry Service (₹80/kg)</option>
                                   </select>
                                </div>
                             )}
                          </div>
                       )}

                       {(currentLineType === 'Package Line' || currentLineType === 'Module Line' || currentLineType === 'Feature Line') && (
                          <div className="md:col-span-4 grid grid-cols-1 gap-4 mb-4">
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">{currentLineType.replace(' Line', '')} Type</label>
                                <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none">
                                   <option value="">Select {currentLineType.replace(' Line', '')} Type</option>
                                   <option value="Basic">Basic</option>
                                   <option value="Premium">Premium</option>
                                   <option value="Enterprise">Enterprise</option>
                                </select>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Name*</label>
                                   <input 
                                     placeholder="Enter item name" 
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                     value={lineFormData.name}
                                     onChange={(e) => setLineFormData({...lineFormData, name: e.target.value})}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Code</label>
                                   <input placeholder="SKU-123" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none" />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Billing Frequency</label>
                                   <select 
                                     value={lineFormData.billingFrequency}
                                     onChange={(e) => setLineFormData({...lineFormData, billingFrequency: e.target.value})}
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none cursor-pointer"
                                   >
                                      <option value="Monthly">Monthly</option>
                                      <option value="Quarterly">Quarterly</option>
                                      <option value="Yearly">Yearly</option>
                                   </select>
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Unit Price*</label>
                                   <input 
                                     type="number" 
                                     placeholder="0.00" 
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                     value={lineFormData.unitPrice}
                                     onChange={(e) => setLineFormData({...lineFormData, unitPrice: parseFloat(e.target.value) || 0})}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Quantity*</label>
                                   <input 
                                     type="number" 
                                     placeholder="1" 
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                     value={lineFormData.quantity}
                                     onChange={(e) => setLineFormData({...lineFormData, quantity: parseInt(e.target.value) || 0})}
                                   />
                                </div>
                             </div>
                          </div>
                       )}

                       {(currentLineType === 'Booking Line' || currentLineType === 'Order Line') ? (
                          <div className="md:col-span-4 flex items-end gap-4 max-w-lg">
                             <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">{currentLineType} Invoice</label>
                                <input 
                                  placeholder="Reference Number*" 
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500"
                                  value={lineFormData.referenceNumber}
                                  onChange={(e) => setLineFormData({...lineFormData, referenceNumber: e.target.value})}
                                />
                             </div>
                             <button className="bg-zinc-100 dark:bg-zinc-800 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all border border-zinc-200 dark:border-zinc-700">Search</button>
                             <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-xs font-bold cursor-help mb-2">?</div>
                          </div>
                       ) : (currentLineType === 'Product Line' || currentLineType === 'Service Line' || currentLineType === 'Others') && (
                          <>
                             {/* Row 2: Basic Info */}
                             {currentLineType === 'Others' && (
                                <div className="md:col-span-1 space-y-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Name*</label>
                                   <input 
                                     placeholder="Enter item name" 
                                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none transition-all"
                                     value={lineFormData.name}
                                     onChange={(e) => setLineFormData({...lineFormData, name: e.target.value})}
                                   />
                                </div>
                             )}
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Code</label>
                                <input placeholder="SKU-123" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Unit Price*</label>
                                <input 
                                  type="number" 
                                  placeholder="0.00" 
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                  value={lineFormData.unitPrice}
                                  onChange={(e) => setLineFormData({...lineFormData, unitPrice: parseFloat(e.target.value) || 0})}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Quantity*</label>
                                <input 
                                  type="number" 
                                  placeholder="1" 
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                  value={lineFormData.quantity}
                                  onChange={(e) => setLineFormData({...lineFormData, quantity: parseInt(e.target.value) || 0})}
                                />
                             </div>

                             {/* Row 3: Calculations */}
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Sub Total*</label>
                                <input readOnly value={`₹${currentSubTotal.toLocaleString()}`} className="w-full bg-zinc-50 dark:bg-zinc-100/10 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-black outline-none text-zinc-400" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Discount %</label>
                                <input 
                                  type="number" 
                                  placeholder="0" 
                                  className="w-full bg-zinc-100/50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                  value={lineFormData.discountPct}
                                  onChange={(e) => setLineFormData({...lineFormData, discountPct: parseFloat(e.target.value) || 0})}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Tax %*</label>
                                <input 
                                  type="number" 
                                  placeholder="18" 
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none"
                                  value={lineFormData.taxPct}
                                  onChange={(e) => setLineFormData({...lineFormData, taxPct: parseFloat(e.target.value) || 0})}
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Tax Amount*</label>
                                <input readOnly value={`₹${currentTaxAmount.toLocaleString()}`} className="w-full bg-zinc-50 dark:bg-zinc-100/10 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-black outline-none text-zinc-400" />
                             </div>

                             {/* Row 4: Final Amounts */}
                             <div className="space-y-1 md:col-span-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">After Tax Amount*</label>
                                <input readOnly value={`₹${currentAfterTaxAmount.toLocaleString()}`} className="w-full bg-zinc-50 dark:bg-zinc-100/10 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-black outline-none text-zinc-400" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Paid Amount</label>
                                <input placeholder="0.00" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-4">Balance Amount*</label>
                                <input readOnly value={`₹${currentAfterTaxAmount.toLocaleString()}`} className="w-full bg-zinc-50 dark:bg-zinc-100/10 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-black outline-none text-zinc-400" />
                             </div>
                          </>
                       )}

                       <div className="md:col-span-4 flex justify-end pt-4">
                          <button 
                            onClick={handleAddLine}
                            className="bg-zinc-100 dark:bg-zinc-800 px-12 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                             Add
                          </button>
                       </div>
                    </div>

                    {/* Invoiced Items Table */}
                    {invoicedItems.length > 0 && (
                       <div className="mt-12 overflow-hidden rounded-[32px] border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-4 duration-500">
                          <table className="w-full text-left">
                             <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                                <tr>
                                   <th className="px-6 py-4">Item Details</th>
                                   <th className="px-6 py-4">Type</th>
                                   <th className="px-6 py-4 text-center">Qty</th>
                                   <th className="px-6 py-4 text-right">Tax</th>
                                   <th className="px-6 py-4 text-right">Total</th>
                                   <th className="px-6 py-4"></th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                {invoicedItems.map((item, idx) => (
                                   <tr key={idx} className="group hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-all">
                                      <td className="px-6 py-4">
                                         <div className="font-black text-xs text-zinc-900 dark:text-zinc-200">{item.name || item.referenceNumber}</div>
                                         <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{item.serviceType || 'Manual Item'}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                         <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{item.type}</span>
                                      </td>
                                      <td className="px-6 py-4 text-center text-xs font-black">{item.quantity}</td>
                                      <td className="px-6 py-4 text-right text-xs font-bold text-emerald-500">₹{item.taxAmount.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-right text-xs font-black">₹{item.total.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-right">
                                         <button 
                                           onClick={() => setInvoicedItems(invoicedItems.filter((_, i) => i !== idx))}
                                           className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-lg"
                                         >
                                            <Trash2 className="w-4 h-4" />
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Right Content: Sidebar Summary */}
           <div className="lg:col-span-4">
              <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-xl p-8 sticky top-8">
                 <div className="flex items-center gap-2 mb-8 pb-4 border-b border-zinc-50">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Invoice Summary</h2>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-4">
                       <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                          <span>Sub Total:</span>
                          <span className="text-zinc-900">₹{subTotal.toLocaleString()}</span>
                       </div>
                       
                       <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Discount Amount:</span>
                          <div className="flex items-center gap-3">
                             <div 
                               onClick={() => {
                                  setDiscountActive(!discountActive);
                                  if (discountActive) setDiscountAmount(0);
                               }}
                               className={cn(
                                 "w-10 h-5 rounded-full transition-all cursor-pointer relative",
                                 discountActive ? "bg-emerald-500" : "bg-zinc-200"
                               )}
                             >
                                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", discountActive ? "left-5.5" : "left-0.5")} />
                             </div>
                             <input 
                               type="number"
                               disabled={!discountActive}
                               value={discountAmount}
                               onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                               className="w-20 bg-transparent text-right font-black text-xs outline-none" 
                             />
                          </div>
                       </div>

                       <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                          <span>Tax Amount:</span>
                          <span className="text-zinc-900">₹{taxAmount.toLocaleString()}</span>
                       </div>
                       
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Service Charge:</span>
                          <input 
                            type="number"
                            value={serviceCharge}
                            onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                            className="w-24 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl text-right font-black text-xs outline-none focus:border-indigo-500" 
                          />
                       </div>

                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Delivery Charge:</span>
                          <input 
                            type="number"
                            value={deliveryCharge}
                            onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                            className="w-24 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl text-right font-black text-xs outline-none focus:border-indigo-500" 
                          />
                       </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                       <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                          <span>Total Amount:</span>
                          <span className="text-lg italic tracking-tighter">₹{totalAmount.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paid Amount:</span>
                          <input 
                            type="number"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                            className="w-32 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl text-right font-black text-xs outline-none focus:border-indigo-500" 
                          />
                       </div>
                    </div>

                    <div className="bg-zinc-950 p-6 rounded-[32px] border-2 border-zinc-900 flex justify-between items-center shadow-xl">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Balance:</span>
                       <span className="text-2xl font-black text-white italic tracking-tighter">₹{balanceAmount.toLocaleString()}</span>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Due Date**</label>
                          <input 
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mode of Payment*</label>
                          <select 
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none cursor-pointer"
                          >
                             <option value="">Select Mode...</option>
                             <option value="Cash">Cash</option>
                             <option value="UPI">UPI / Digital</option>
                             <option value="Card">Credit/Debit Card</option>
                             <option value="Bank">Bank Transfer</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Notes</label>
                          <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold outline-none min-h-[80px] resize-none" 
                            placeholder="Add invoice notes..."
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                       <button 
                         onClick={() => setActiveTab('invoices')}
                         className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-50 transition-all"
                       >
                          Cancel
                       </button>
                       <button 
                         onClick={handleSaveInvoice}
                         disabled={saveInvoice.isPending || invoicedItems.length === 0}
                         className="py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                       >
                          {saveInvoice.isPending ? 'Saving...' : 'Save & Print'}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Expense Management View */}
      {activeTab === 'expenses' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500 opacity-[0.04] rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Expenses (This Month)</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl"><TrendingDown className="w-4 h-4" /></div>
              </div>
              <div className="text-3xl font-black tracking-tighter text-rose-600 dark:text-rose-400">
                ₹{(expenseSummary?.total_expenses_month || 0).toLocaleString()}
              </div>
              <div className="mt-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Month-to-Date Operational & Outflow</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500 opacity-[0.04] rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Booking Refunds Issued</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl"><RotateCcw className="w-4 h-4" /></div>
              </div>
              <div className="text-3xl font-black tracking-tighter text-amber-600 dark:text-amber-400">
                ₹{(expenseSummary?.total_booking_refunds || 0).toLocaleString()}
              </div>
              <div className="mt-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Cancellations & Early Check-outs</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500 opacity-[0.04] rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Order/Service Refunds</span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl"><Utensils className="w-4 h-4" /></div>
              </div>
              <div className="text-3xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400">
                ₹{(expenseSummary?.total_order_refunds || 0).toLocaleString()}
              </div>
              <div className="mt-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">F&B & Ancillary Deductions</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500 opacity-[0.04] rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cash Outflow Today</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-xl"><DollarSign className="w-4 h-4" /></div>
              </div>
              <div className="text-3xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                ₹{(expenseSummary?.cash_outflow_today || 0).toLocaleString()}
              </div>
              <div className="mt-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Physical Drawer Balancing Outflow</div>
            </div>
          </div>

          {/* Action Header & Filters Bar */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  Expense Register
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-black">
                    {filteredAndSortedExpenses.length} Records
                  </span>
                </h2>
                <p className="text-zinc-400 font-bold text-xs uppercase tracking-wider mt-1">Audit Trail & Outflow Logs</p>
              </div>

              <button
                onClick={handleOpenAddExpense}
                className="px-5 py-3 bg-[var(--theme-color,#4f46e5)] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Log New Expense
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search description, ID, vendor, receipt..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm"
                />
                {expenseSearch && (
                  <button onClick={() => setExpenseSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <select
                  value={expenseTypeFilter}
                  onChange={(e) => setExpenseTypeFilter(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Operational">Operational</option>
                  <option value="Booking Refund">Booking Refund</option>
                  <option value="Order Refund">Order Refund</option>
                  <option value="Vendor Bill">Vendor Bill</option>
                </select>
              </div>

              <div>
                <select
                  value={expenseDepartmentFilter}
                  onChange={(e) => setExpenseDepartmentFilter(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <select
                  value={expensePaymentModeFilter}
                  onChange={(e) => setExpensePaymentModeFilter(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                >
                  <option value="All">All Payment Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-zinc-400 shrink-0 hidden lg:block" />
                <select
                  value={expenseSortBy}
                  onChange={(e: any) => setExpenseSortBy(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
                  <option value="description-asc">Description: A to Z</option>
                  <option value="description-desc">Description: Z to A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expense Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b">
                  <tr>
                    <th className="p-5">Reference & Date</th>
                    <th className="p-5">Classification</th>
                    <th className="p-5">Description & Links</th>
                    <th className="p-5">Payment & Status</th>
                    <th className="p-5 text-right">Amount</th>
                    <th className="p-5 text-center">Receipt</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {isExpensesLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center animate-pulse">Loading expenses...</td></tr>
                  ) : filteredAndSortedExpenses.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="p-5">
                        <div className="font-extrabold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                          {exp.id}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            exp.expense_type === 'Booking Refund' ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400" :
                            exp.expense_type === 'Order Refund' ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400" :
                            exp.expense_type === 'Vendor Bill' ? "bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400" :
                            "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                          )}>
                            {exp.expense_type}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                            {exp.category} • {exp.department || 'General'}
                          </span>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{exp.description}</div>
                        <div className="text-[10px] text-zinc-400 font-medium mt-0.5 space-x-2">
                          {exp.supplier_name && <span>Vendor: <b>{exp.supplier_name}</b></span>}
                          {exp.booking_id && <span className="text-amber-600">Booking ID: <b>{exp.booking_id}</b></span>}
                          {exp.external_booking_ref && <span className="text-amber-600">OTA Ref: <b>{exp.external_booking_ref}</b></span>}
                          {exp.invoice_id && <span className="text-indigo-600">Invoice ID: <b>{exp.invoice_id}</b></span>}
                          {exp.receipt_no && <span>Receipt #: <b>{exp.receipt_no}</b></span>}
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{exp.payment_mode}</div>
                        <span className={cn(
                          "inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1",
                          exp.expense_status === 'PAID' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                          exp.expense_status === 'PENDING' ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
                          "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {exp.expense_status}
                        </span>
                      </td>

                      <td className="p-5 text-right">
                        <div className="font-black text-base tracking-tight text-zinc-900 dark:text-white">
                          ₹{parseFloat(exp.amount).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-5 text-center">
                        {exp.receipt_image_url ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${exp.receipt_image_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-all"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> Receipt
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">No file</span>
                        )}
                      </td>

                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete expense ${exp.id}?`)) {
                                deleteExpenseMutation.mutate(exp.id);
                              }
                            }}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAndSortedExpenses.length === 0 && !isExpensesLoading && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-400 font-medium italic">
                        No expenses match the selected filters or search terms.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expense Entry Pop-Up Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsExpenseModalOpen(false)} />
          <div className="relative w-full max-w-3xl lg:max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-[36px] shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                  {editingExpense ? `Edit Expense (${editingExpense.id})` : 'Log Property Outflow / Expense'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Operating Bills, Vendor Outflows & Guest Refunds
                </p>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              {/* Expense Type Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Outflow / Expense Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Operational', label: 'Operational' },
                    { id: 'Booking Refund', label: 'Booking Refund' },
                    { id: 'Order Refund', label: 'Order Refund' },
                    { id: 'Vendor Bill', label: 'Vendor Bill' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setExpenseForm({
                        ...expenseForm,
                        expense_type: t.id,
                        department: t.id === 'Booking Refund' ? 'Front Desk' : t.id === 'Order Refund' ? 'Kitchen' : expenseForm.department,
                        category: (t.id === 'Booking Refund' || t.id === 'Order Refund') ? 'Guest Refund' : expenseForm.category
                      })}
                      className={cn(
                        "py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all text-center",
                        expenseForm.expense_type === t.id
                          ? "border-[var(--theme-color,#4f46e5)] bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Conditional Fields based on Expense Type */}
              {expenseForm.expense_type === 'Booking Refund' && (
                <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-3xl space-y-4">
                  <div className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Guest Booking Refund Context
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Booking</label>
                      <select
                        value={expenseForm.booking_id}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const selectedB = bookings.find((b: any) => b.id === bId);
                          setExpenseForm({
                            ...expenseForm,
                            booking_id: bId,
                            description: selectedB ? `Booking Refund for ${selectedB.guest_name} (${bId})` : expenseForm.description
                          });
                        }}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                      >
                        <option value="">-- Select Active / Checked-Out Booking --</option>
                        {bookings.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.guest_name} ({b.id}) - ₹{b.total_price}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">External OTA Ref (PNR / MMT)</label>
                      <input
                        type="text"
                        placeholder="e.g. MMT-10924823"
                        value={expenseForm.external_booking_ref}
                        onChange={(e) => setExpenseForm({ ...expenseForm, external_booking_ref: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {expenseForm.expense_type === 'Order Refund' && (
                <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/40 rounded-3xl space-y-4">
                  <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Utensils className="w-4 h-4" /> Order / Service Refund Context
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Invoice / Order Reference</label>
                    <select
                      value={expenseForm.invoice_id}
                      onChange={(e) => {
                        const invId = e.target.value;
                        const selectedInv = invoices.find((inv: any) => inv.id === invId);
                        setExpenseForm({
                          ...expenseForm,
                          invoice_id: invId,
                          description: selectedInv ? `Order Refund for ${selectedInv.booking?.guest_name || 'Customer'} (${invId})` : expenseForm.description
                        });
                      }}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                    >
                      <option value="">-- Select Invoice Reference --</option>
                      {invoices.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>{inv.id} - Billed to {inv.booking?.guest_name || 'Walk-in'} (₹{inv.total_amount})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(expenseForm.expense_type === 'Operational' || expenseForm.expense_type === 'Vendor Bill') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Supplier / Vendor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. State Electricity Board / Metro Traders"
                      value={expenseForm.supplier_name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, supplier_name: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Department</label>
                    <select
                      value={expenseForm.department}
                      onChange={(e) => setExpenseForm({ ...expenseForm, department: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="Front Desk">Front Desk</option>
                      <option value="Kitchen">Kitchen / F&B</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="Utilities">Utilities (Electricity, Water, Wi-Fi, Gas)</option>
                    <option value="Housekeeping & Linens">Housekeeping & Linens</option>
                    <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                    <option value="Grocery & Kitchen Supplies">Grocery & Kitchen Supplies</option>
                    <option value="OTA Commission & Fees">OTA Commission & Fees</option>
                    <option value="Staff Salaries & Petty Cash">Staff Salaries & Petty Cash</option>
                    <option value="Guest Refund">Guest Refund</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expense Date</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={expenseForm.expense_date}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      if (selected && selected > today) {
                        alert("Future dates are not allowed for expenses. Please select today or a past date.");
                        setExpenseForm({ ...expenseForm, expense_date: today });
                        return;
                      }
                      setExpenseForm({ ...expenseForm, expense_date: selected });
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description / Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Electricity Bill for June or Refund for early checkout"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none"
                />
              </div>

              {/* Financial Amount & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-sm font-black text-rose-600 dark:text-rose-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Payment Mode</label>
                  <select
                    value={expenseForm.payment_mode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Wallet">Wallet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</label>
                  <select
                    value={expenseForm.expense_status}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_status: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Attach Receipt / Voucher Image or PDF</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptUpload}
                    disabled={isUploadingReceipt}
                    className="hidden"
                    id="receipt-file-input"
                  />
                  <label
                    htmlFor="receipt-file-input"
                    className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 cursor-pointer flex items-center gap-2"
                  >
                    <Paperclip className="w-4 h-4" /> {isUploadingReceipt ? 'Uploading...' : 'Choose File'}
                  </label>

                  {previewReceiptUrl && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${previewReceiptUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-indigo-600 underline flex items-center gap-1"
                    >
                      View Uploaded Receipt <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Internal Audit Notes</label>
                <textarea
                  placeholder="Optional internal remarks or approval notes..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 font-bold text-xs outline-none min-h-[70px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="flex-1 py-4 bg-[var(--theme-color,#4f46e5)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editingExpense ? 'Update Expense' : 'Save & Record Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-zinc-900 p-20 rounded-[60px] border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800">
              <Plus className="w-8 h-8 text-zinc-300" />
           </div>
           <div>
              <h2 className="text-2xl font-black tracking-tighter italic uppercase text-zinc-400">Payment Outflows</h2>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Create vendor payments, staff salaries, and owner withdrawals.</p>
           </div>
        </div>
      )}

      {/* Review & Adjust Modal */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setReviewingBooking(null)} />
           <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase text-zinc-300">Adjust Bill</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">Guest: {reviewingBooking.guest_name}</p>
                 </div>
                 <button onClick={() => setReviewingBooking(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                    <X className="w-5 h-5 text-zinc-400" />
                 </button>
              </div>

              <div className="space-y-6">
                 {/* Itemized List */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Billable Items</label>
                        <button 
                          onClick={addReviewItem}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800"
                        >
                           <Plus className="w-3 h-3" /> Add Service
                        </button>
                     </div>
                     
                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {editItems.map((item, idx) => (
                           <div key={idx} className="flex gap-2 items-start group">
                              <div className="w-40 flex flex-col gap-1">
                                 <select 
                                   value={item.type}
                                   onChange={(e) => updateReviewItem(idx, 'type', e.target.value)}
                                   className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl py-2 px-2 text-[9px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 text-zinc-600 appearance-none text-center"
                                 >
                                    <option value="Product Line">Product Line</option>
                                    <option value="Service Line">Service Line</option>
                                    <option value="Booking Line">Booking Line</option>
                                    <option value="Order Line">Order Line</option>
                                    <option value="Package Line">Package Line</option>
                                    <option value="Module Line">Module Line</option>
                                    <option value="Feature Line">Feature Line</option>
                                    <option value="Others">Others</option>
                                 </select>
                              </div>
                              <div className="flex-1">
                                 <input 
                                   value={item.description}
                                   onChange={(e) => updateReviewItem(idx, 'description', e.target.value)}
                                   placeholder="Item name (e.g. Laundry)"
                                   className={cn(
                                     "w-full bg-zinc-50 dark:bg-zinc-950 border-2 rounded-xl py-2 px-3 text-xs font-bold outline-none transition-all placeholder-zinc-300 dark:placeholder-zinc-700",
                                     item.description.trim() === ''
                                       ? "border-rose-400 dark:border-rose-500 focus:border-rose-500"
                                       : "border-zinc-100 dark:border-zinc-800 focus:border-indigo-500"
                                   )}
                                 />
                              </div>
                              <div className="w-24 relative">
                                 <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">₹</span>
                                 <input 
                                   type="text"
                                   inputMode="decimal"
                                   value={item.amount}
                                   onKeyDown={(e) => {
                                     if (['+', '-', 'e', 'E', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '=', '/', '?'].includes(e.key)) {
                                       e.preventDefault();
                                     }
                                   }}
                                   onChange={(e) => updateReviewItem(idx, 'amount', e.target.value)}
                                   className={cn(
                                     "w-full bg-zinc-50 dark:bg-zinc-950 border-2 rounded-xl py-2 pl-6 pr-2 text-xs font-black outline-none transition-all",
                                     item.amount === '' || isNaN(Number(item.amount)) || Number(item.amount) <= 0
                                       ? "border-rose-400 dark:border-rose-500 focus:border-rose-500"
                                       : "border-zinc-100 dark:border-zinc-800 focus:border-indigo-500"
                                   )}
                                 />
                              </div>
                              {idx > 0 && (
                                 <button onClick={() => removeReviewItem(idx)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                 </div>

                 <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[32px] border-2 border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-zinc-500">
                       <span className="uppercase tracking-widest text-[9px]">Consolidated Subtotal</span>
                       <span>₹{currentSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-rose-500">
                       <span className="uppercase tracking-widest text-[9px]">Tax ({currentGstRate}%)</span>
                       <span>₹{currentGstAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
                       <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                       <span className="text-2xl font-black italic tracking-tighter">₹{currentTotal.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center block">Internal Comments</label>
                    <textarea 
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Optional notes for history..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl py-3 px-4 font-bold text-xs focus:border-indigo-500 outline-none transition-all min-h-[60px] resize-none"
                    />
                 </div>

                 {!isReviewFormValid && (
                    <p className="text-[10px] font-black text-rose-500 text-center tracking-tight">
                       Please enter a valid description and positive amount (&gt; ₹0) for all line items.
                    </p>
                 )}

                 <button 
                   onClick={() => generateInvoice.mutate({ 
                      bookingId: reviewingBooking.id, 
                      data: { 
                         items: editItems.map(it => ({ type: it.type, description: it.description.trim(), amount: parseFloat(it.amount) || 0 })), 
                         bill_notes: editNotes 
                      } 
                   })}
                   disabled={!isReviewFormValid || generateInvoice.isPending}
                   className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                 >
                    {generateInvoice.isPending ? 'Syncing Ledger...' : 'Finalize & Seal Itemized Bill'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Admin Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedInvoice(null); setJustCreated(false); }} />
           <div className="relative w-full max-w-lg bg-zinc-50 dark:bg-zinc-950 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-y-auto">
              {/* Success Banner - shown when invoice was just created */}
              {justCreated && (
                <div className="bg-emerald-500 text-white px-8 py-4 flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 shrink-0" />
                   <div>
                      <p className="font-black text-sm uppercase tracking-wide">Invoice Sealed! ✓</p>
                      <p className="text-xs opacity-80">It has been added to your Finalized History</p>
                   </div>
                </div>
              )}

              {/* Professional Preview Header */}
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <h2 className="text-2xl font-black italic tracking-tighter uppercase text-zinc-300">Invoice &nbsp;{selectedInvoice.id}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">✓ Finalized & Recorded</p>
                    </div>
                    <button onClick={() => { setSelectedInvoice(null); setJustCreated(false); }} className="font-black text-xs uppercase hover:text-rose-500">Close</button>
                 </div>
                 
                 <div className="flex gap-4">
                    <button onClick={() => window.open(`/view-invoice/${selectedInvoice.id}`, '_blank')} className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-200 dark:shadow-none hover:scale-105 transition-all flex items-center justify-center gap-2">
                       <FileText className="w-4 h-4" /> Guest Bill
                    </button>
                    <button onClick={() => {
                        window.open(`/view-invoice/${selectedInvoice.id}?print=true`, '_blank');
                    }} className="flex-1 py-4 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                       <Download className="w-4 h-4" /> Print/PDF
                    </button>
                 </div>

                 {justCreated && (
                    <button onClick={() => { setSelectedInvoice(null); setJustCreated(false); }} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                       <CheckCircle2 className="w-5 h-5" /> Done — Back to Dashboard
                    </button>
                 )}
              </div>

              {/* QR Segment (CRM Integration) */}
              <div className="p-8 flex flex-col items-center gap-6">
                 <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-2xl border-4 border-white dark:border-zinc-800">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/view-invoice/${selectedInvoice.id}`)}`} 
                      alt="Guest QR" 
                      className="w-48 h-48 rounded-xl transition-all duration-700"
                    />
                 </div>
                 <div className="text-center space-y-2">
                    <p className="text-sm font-black tracking-tight text-zinc-900 dark:text-white uppercase">Guest Digital Key</p>
                    <p className="text-xs text-zinc-500 max-w-xs font-medium">Scanning this code allows the guest to access their bill without logging in. Include this on the printed receipt.</p>
                 </div>
              </div>

              {/* Data Summary */}
              <div className="p-8 space-y-4">
                 <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Bill Breakdown</span>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
                       {selectedInvoice.line_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{item.description}</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {item.type && <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{item.type}</span>}
                                </div>
                             </div>
                             <div className="text-xs font-black">₹{parseFloat(item.amount).toLocaleString()}</div>
                          </div>
                       ))}
                       <div className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-950 font-black">
                          <span className="text-[10px] uppercase">Grand Total (Inc. Tax)</span>
                          <span className="text-indigo-600">₹{parseFloat(selectedInvoice.total_amount).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 {selectedInvoice.bill_notes && (
                   <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-700">
                      <span className="text-[10px] font-black uppercase text-zinc-400 block mb-2 tracking-widest">Adjustment Notes</span>
                      <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{selectedInvoice.bill_notes}"</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
