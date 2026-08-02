"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { 
  Users, UserPlus, Mail, Phone, Shield, Edit2, Trash2, 
  CheckCircle, XCircle, Search, MoreVertical, Briefcase
} from 'lucide-react';

export default function StaffPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Housekeeping',
    designation: ''
  });

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/staff')
  });

  const createStaff = useMutation({
    mutationFn: (data: any) => fetchApi(tenant, '/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', tenant] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateStaff = useMutation({
    mutationFn: (args: { id: string, data: any }) => 
      fetchApi(tenant, `/staff/${args.id}`, { method: 'PATCH', body: JSON.stringify(args.data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', tenant] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) => fetchApi(tenant, `/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', tenant] })
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'Housekeeping', designation: '' });
    setEditingStaff(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: formData });
    } else {
      createStaff.mutate(formData);
    }
  };

  const openEditModal = (staff: any) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role,
      designation: staff.designation || ''
    });
    setIsModalOpen(true);
  };

  const filteredStaff = staffList.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles = [
    { value: 'Manager', color: 'bg-purple-100 text-purple-700' },
    { value: 'Front Desk', color: 'bg-blue-100 text-blue-700' },
    { value: 'Housekeeping', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'Maintenance', color: 'bg-amber-100 text-amber-700' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--theme-color,#4f46e5)]/10 rounded-2xl">
            <Users className="w-8 h-8 text-[var(--theme-color,#4f46e5)]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Staff Directory</h1>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Manage your hotel team & roles</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              className="pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[var(--theme-color,#4f46e5)] text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--theme-color,#4f46e5)]/20"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-48 bg-white dark:bg-zinc-900 rounded-[40px] animate-pulse" />)
        ) : filteredStaff.map((staff: any) => (
          <div key={staff.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative group overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-400">
                  {staff.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight">{staff.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Briefcase className="w-3 h-3" />
                    {staff.designation || 'Staff'}
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${roles.find(r => r.value === staff.role)?.color || 'bg-zinc-100 text-zinc-600'}`}>
                {staff.role}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-zinc-500 text-xs">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{staff.email || 'No email'}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-500 text-xs">
                <Phone className="w-3.5 h-3.5" />
                <span>{staff.phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {staff.status === 'Active' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className={`text-[10px] font-bold uppercase tracking-widest ${staff.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {staff.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => openEditModal(staff)}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-100 transition-all border border-zinc-200 dark:border-zinc-700"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button 
                onClick={() => { if(confirm('Delete staff?')) deleteStaff.mutate(staff.id); }}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Employee Profile Details</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <XCircle className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Full Name</label>
                <input 
                   required
                   className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                   placeholder="e.g. John Smith"
                   value={formData.name}
                   onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Email</label>
                  <input 
                     className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="john@restopia.com"
                     value={formData.email}
                     onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Phone</label>
                  <input 
                     className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="+91 9876543210"
                     value={formData.phone}
                     onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Role</label>
                  <select 
                     className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm appearance-none"
                     value={formData.role}
                     onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                     {roles.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Designation</label>
                  <input 
                     className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="e.g. Senior Cleaner"
                     value={formData.designation}
                     onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              {editingStaff && (
                <div className="space-y-1.5 pt-2 flex items-center gap-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Status:</label>
                  <div className="flex bg-zinc-50 p-1 rounded-xl gap-1">
                     <button 
                       type="button"
                       onClick={() => setFormData({ ...formData, status: 'Active' } as any)}
                       className={`px-3 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase ${formData.status === 'Active' ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-400'}`}
                     >Active</button>
                     <button 
                       type="button"
                       onClick={() => setFormData({ ...formData, status: 'Inactive' } as any)}
                       className={`px-3 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase ${formData.status === 'Inactive' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-400'}`}
                     >Inactive</button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-4">
                 <button 
                   type="button"
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-all"
                 >Cancel</button>
                 <button 
                   type="submit"
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-all shadow-xl"
                 >Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
