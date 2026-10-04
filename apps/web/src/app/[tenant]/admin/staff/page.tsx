"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { 
  Users, UserPlus, Mail, Phone, Shield, Edit2, Trash2, 
  CheckCircle, XCircle, Search, Briefcase, KeyRound, Eye, EyeOff, Sparkles, ShieldCheck, ShieldOff, AlertCircle
} from 'lucide-react';

export default function StaffPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Front Desk',
    designation: '',
    status: 'Active',
    enable_login: true,
    password: ''
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
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create staff member.');
    }
  });

  const updateStaff = useMutation({
    mutationFn: (args: { id: string, data: any }) => 
      fetchApi(tenant, `/staff/${args.id}`, { method: 'PATCH', body: JSON.stringify(args.data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', tenant] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update staff member.');
    }
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) => fetchApi(tenant, `/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', tenant] }),
    onError: (err: any) => alert(err.message || 'Failed to delete staff member.')
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      email: '', 
      phone: '', 
      role: 'Front Desk', 
      designation: '', 
      status: 'Active',
      enable_login: true,
      password: ''
    });
    setEditingStaff(null);
    setShowPassword(false);
    setErrorMsg(null);
  };

  const handleRoleChange = (newRole: string) => {
    const shouldAutoEnable = newRole === 'Front Desk' || newRole === 'Manager';
    setFormData(prev => ({
      ...prev,
      role: newRole,
      enable_login: editingStaff ? prev.enable_login : (shouldAutoEnable || prev.enable_login)
    }));
  };

  const generateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
    let res = "";
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: res }));
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.enable_login) {
      if (!formData.email || !formData.email.trim()) {
        setErrorMsg("Work Email address is required when portal login access is enabled.");
        return;
      }
      if (!editingStaff && (!formData.password || formData.password.trim().length < 6)) {
        setErrorMsg("Initial Password must be at least 6 characters long.");
        return;
      }
      if (editingStaff && formData.password && formData.password.trim().length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
    }

    const payload: any = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: formData.role,
      designation: formData.designation.trim(),
      status: formData.status,
      enable_login: formData.enable_login,
    };

    if (formData.password && formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: payload });
    } else {
      createStaff.mutate(payload);
    }
  };

  const openEditModal = (staff: any) => {
    setEditingStaff(staff);
    setErrorMsg(null);
    setFormData({
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role || 'Front Desk',
      designation: staff.designation || '',
      status: staff.status || 'Active',
      enable_login: staff.enable_login ?? Boolean(staff.email),
      password: ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const filteredStaff = staffList.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roles = [
    { value: 'Manager', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
    { value: 'Front Desk', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
    { value: 'Housekeeping', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
    { value: 'Maintenance', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
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
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Manage team profiles & login credentials</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search staff, role, email..." 
              className="pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[var(--theme-color,#4f46e5)] text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--theme-color,#4f46e5)]/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-56 bg-white dark:bg-zinc-900 rounded-[40px] animate-pulse" />)
        ) : filteredStaff.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-400 font-medium">
            No staff members found matching your search.
          </div>
        ) : filteredStaff.map((staff: any) => (
          <div key={staff.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative group overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-400">
                    {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight">{staff.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <Briefcase className="w-3 h-3" />
                      {staff.designation || 'Staff Member'}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${roles.find(r => r.value === staff.role)?.color || 'bg-zinc-100 text-zinc-600'}`}>
                  {staff.role}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3 text-zinc-500 text-xs">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{staff.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-500 text-xs">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{staff.phone || 'No phone'}</span>
                </div>
                
                {/* Status Badges */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-3">
                  <div className="flex items-center gap-1.5">
                    {staff.status === 'Active' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${staff.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {staff.status}
                    </span>
                  </div>

                  {/* Portal Login Badge */}
                  {staff.enable_login && staff.status === 'Active' ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <ShieldCheck className="w-3 h-3 text-indigo-500" /> Login Enabled
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      <ShieldOff className="w-3 h-3 text-zinc-400" /> Directory Only
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
              <button 
                onClick={() => openEditModal(staff)}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" /> Edit & Credentials
              </button>
              <button 
                onClick={() => { if(confirm(`Delete staff member '${staff.name}'? This will also revoke their login credentials.`)) deleteStaff.mutate(staff.id); }}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100 dark:bg-rose-950/40 dark:border-rose-900 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{editingStaff ? 'Edit Staff Profile' : 'Add Staff Member'}</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Employee Details & Portal Access</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer">
                <XCircle className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Full Name *</label>
                <input 
                   required
                   className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                   placeholder="e.g. Sarah Connor"
                   value={formData.name}
                   onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Role & Designation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Portal Role *</label>
                  <select 
                     className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     value={formData.role}
                     onChange={e => handleRoleChange(e.target.value)}
                  >
                     {roles.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Designation</label>
                  <input 
                     className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="e.g. Front Desk Lead"
                     value={formData.designation}
                     onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              {/* Phone & Work Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Phone Number</label>
                  <input 
                     className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="+91 9876543210"
                     value={formData.phone}
                     onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">
                    Work Email {formData.enable_login ? '*' : '(Optional)'}
                  </label>
                  <input 
                     type="email"
                     className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--theme-color,#4f46e5)]/20 font-bold text-sm"
                     placeholder="sarah@hotelflora.com"
                     value={formData.email}
                     onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Status Selector in Edit Mode */}
              {editingStaff && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Employee Status:</span>
                  <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                     <button 
                       type="button"
                       onClick={() => setFormData({ ...formData, status: 'Active' })}
                       className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer ${formData.status === 'Active' ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-500'}`}
                     >Active</button>
                     <button 
                       type="button"
                       onClick={() => setFormData({ ...formData, status: 'Inactive' })}
                       className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer ${formData.status === 'Inactive' ? 'bg-rose-500 text-white shadow-sm' : 'text-zinc-500'}`}
                     >Inactive</button>
                  </div>
                </div>
              )}

              {/* Portal Login Enable Toggle Section */}
              <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                        Enable Portal Login Access
                      </h4>
                      <p className="text-[10px] font-medium text-indigo-700/80 dark:text-indigo-400">
                        Allows login at /{tenant}/login
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={formData.enable_login}
                      onChange={(e) => setFormData({ ...formData, enable_login: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Password Configuration Section */}
                {formData.enable_login && (
                  <div className="space-y-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-300">
                        {editingStaff ? 'Reset / Change Password' : 'Initial Password *'}
                      </label>
                      <button
                        type="button"
                        onClick={generateSecurePassword}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Generate
                      </button>
                    </div>

                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        className="w-full p-3.5 pr-11 bg-white dark:bg-zinc-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold text-sm text-zinc-900 dark:text-white"
                        placeholder={editingStaff ? "Leave blank to keep unchanged" : "Min 6 characters"}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-4">
                 <button 
                   type="button"
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                 >Cancel</button>
                 <button 
                   type="submit"
                   disabled={createStaff.isPending || updateStaff.isPending}
                   className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[var(--theme-color,#4f46e5)] text-white hover:brightness-110 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                 >
                   {createStaff.isPending || updateStaff.isPending ? 'Saving...' : (editingStaff ? 'Update Profile' : 'Create Staff Member')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
