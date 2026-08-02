"use client"

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Users, Shield, MapPin, 
  Globe, Mail, Phone, Plus, Edit2, Check, X,
  Briefcase, Landmark, Wallet, CreditCard, Layout, Hash,
  Image as ImageIcon, Computer, Palette, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// API Helpers
const fetchApi = async <T,>(tenant: string, path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`http://localhost:8000/api/${tenant}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
};

export default function SettingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = React.use(params);
  const { tenant } = resolvedParams;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'financials' | 'system'>('profile');
  
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings', tenant],
    queryFn: () => fetchApi<any>(tenant, '/settings'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: adminUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/admin-users'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const updateSettings = useMutation({
    mutationFn: (data: any) => fetchApi(tenant, '/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', tenant] })
  });

  if (loadingSettings || loadingUsers) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
         <Loader2 className="w-12 h-12 text-[var(--theme-color,#4f46e5)] animate-spin" />
         <p className="text-sm font-black tracking-widest text-zinc-400 uppercase animate-pulse">Loading Platform Configurations</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-zinc-200 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent italic">
            Settings
          </h1>
          <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-widest mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-color,#4f46e5)] animate-pulse" />
             Settings
          </div>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          {[
            { id: 'profile', label: 'Business Profile', icon: Building2 },
            { id: 'financials', label: 'Fintech & Payouts', icon: Landmark },
            { id: 'system', label: 'System & POS', icon: Computer },
            { id: 'users', label: 'Admin Users', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-white shadow-sm text-[var(--theme-color,#4f46e5)]" 
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <tab.icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
               <Card sectionIcon={Layout} title="Business Entry">
                  <div className="flex items-center gap-6 mb-8 p-4 bg-zinc-50 rounded-3xl border border-zinc-100">
                     <div className="w-20 h-20 bg-white border-2 border-zinc-200 rounded-[24px] flex items-center justify-center text-3xl shadow-sm">
                        🏠
                     </div>
                     <div>
                        <h4 className="text-lg font-black tracking-tight">{settings?.name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">RSHM CODE</span>
                     </div>
                  </div>
                  <div className="grid gap-6">
                    <Field label="Business Type" value={settings?.business_type || 'Accommodation'} onSave={(val) => updateSettings.mutate({ business_type: val })} />
                    <Field label="Sub Type" value={settings?.business_sub_type || 'Homestays'} onSave={(val) => updateSettings.mutate({ business_sub_type: val })} />
                    <Field label="Short Name" value={settings?.short_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ short_name: val })} />
                    <Field label="Slogan / Sub Title" value={settings?.slogan || 'Not Set'} onSave={(val) => updateSettings.mutate({ slogan: val })} />
                    <Field label="Currency" value={settings?.currency || 'INR'} onSave={(val) => updateSettings.mutate({ currency: val })} />
                    <Field label="GST Number" value={settings?.gst_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ gst_number: val })} />
                    <Field label="VAT Number" value={settings?.vat_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ vat_number: val })} />
                    <Field label="SEO Friendly Name" value={settings?.seo_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ seo_name: val })} />
                    <TextAreaField label="Business Description" value={settings?.description || 'Not Set'} onSave={(val) => updateSettings.mutate({ description: val })} />
                  </div>
               </Card>

               <Card sectionIcon={Phone} title="Contact Information">
                  <div className="grid gap-6">
                     <Field label="Email" value={settings?.email || 'info@restopia.com'} onSave={(val) => updateSettings.mutate({ email: val })} icon={<Mail className="w-4 h-4"/>} />
                     <Field label="Mobile Number" value={settings?.phone || 'Not Set'} onSave={(val) => updateSettings.mutate({ phone: val })} icon={<Phone className="w-4 h-4"/>} />
                     <Field label="WhatsApp" value={settings?.whatsapp_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ whatsapp_number: val })} icon={<Phone className="w-4 h-4 text-emerald-500"/>} />
                     <Field label="Landline" value={settings?.landline_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ landline_number: val })} icon={<Phone className="w-4 h-4 text-indigo-400"/>} />
                  </div>
               </Card>
            </div>

            {/* Middle Column */}
            <div className="space-y-8">
               <Card sectionIcon={MapPin} title="Address Details">
                  <div className="grid gap-6">
                     <Field label="Street Number" value={settings?.address_street_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_street_number: val })} />
                     <Field label="Street Name" value={settings?.address_street_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_street_name: val })} />
                     <div className="grid grid-cols-2 gap-4">
                        <Field label="City" value={settings?.address_city || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_city: val })} />
                        <Field label="State" value={settings?.address_state || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_state: val })} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Field label="Suburb" value={settings?.address_suburb || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_suburb: val })} />
                        <Field label="Locality" value={settings?.address_locality || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_locality: val })} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Field label="Post Code" value={settings?.address_post_code || 'Not Set'} onSave={(val) => updateSettings.mutate({ address_post_code: val })} icon={<Hash className="w-3 h-3"/>} />
                        <Field label="Country" value={settings?.address_country || 'India'} onSave={(val) => updateSettings.mutate({ address_country: val })} icon={<Globe className="w-3 h-3"/>} />
                     </div>
                  </div>
               </Card>

               <Card sectionIcon={Users} title="Business Manager">
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                       <Field label="First Name" value={settings?.manager_first_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ manager_first_name: val })} />
                       <Field label="Last Name" value={settings?.manager_last_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ manager_last_name: val })} />
                    </div>
                    <Field label="Manager Phone" value={settings?.manager_phone || 'Not Set'} onSave={(val) => updateSettings.mutate({ manager_phone: val })} icon={<Phone className="w-4 h-4"/>} />
                  </div>
               </Card>

               <Card sectionIcon={Globe} title="Map & Digital Presence">
                  <div className="grid gap-6">
                    <Field label="Google Place ID" value={settings?.google_place_id || 'Not Set'} onSave={(val) => updateSettings.mutate({ google_place_id: val })} />
                    <div className="grid grid-cols-2 gap-4">
                       <Field label="Latitude" value={settings?.google_map_lat || 'Not Set'} onSave={(val) => updateSettings.mutate({ google_map_lat: val })} />
                       <Field label="Longitude" value={settings?.google_map_lng || 'Not Set'} onSave={(val) => updateSettings.mutate({ google_map_lng: val })} />
                    </div>
                    <div className="pt-4 border-t border-zinc-100 flex flex-col gap-6">
                       <Field label="Facebook Link" value={settings?.social_facebook || 'Not Set'} onSave={(val) => updateSettings.mutate({ social_facebook: val })} />
                       <Field label="Instagram Link" value={settings?.social_instagram || 'Not Set'} onSave={(val) => updateSettings.mutate({ social_instagram: val })} />
                       <Field label="Twitter Link" value={settings?.social_twitter || 'Not Set'} onSave={(val) => updateSettings.mutate({ social_twitter: val })} />
                       <Field label="Promo Video URL" value={settings?.video_link || 'Not Set'} onSave={(val) => updateSettings.mutate({ video_link: val })} />
                    </div>
                  </div>
               </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
               <Card sectionIcon={ImageIcon} title="Media & Amenities">
                  <div className="grid gap-6">
                     <Field label="Logo URL" value={settings?.logo_url || 'Not Set'} onSave={(val) => updateSettings.mutate({ logo_url: val })} icon={<ImageIcon className="w-3 h-3"/>} />
                     <Field label="Business Image URL" value={settings?.business_image_url || 'Not Set'} onSave={(val) => updateSettings.mutate({ business_image_url: val })} icon={<ImageIcon className="w-3 h-3"/>} />
                     <TextAreaField label="Property Service List (Comma Separated)" value={settings?.property_service_list || 'Pool, Wi-Fi, Breakfast'} onSave={(val) => updateSettings.mutate({ property_service_list: val })} />
                  </div>
               </Card>

               <Card sectionIcon={Check} title="Business Setup Checklist">
                  <div className="flex flex-col gap-4">
                     <ChecklistItem label="Business Setup" isSet={!!settings?.business_type} />
                     <ChecklistItem label="Business Manager Setup" isSet={!!settings?.manager_first_name} />
                     <ChecklistItem label="Address Setup" isSet={!!settings?.address_street_name} />
                     <ChecklistItem label="Logo Upload" isSet={!!settings?.logo_url} />
                     <ChecklistItem label="Business Image Upload" isSet={!!settings?.business_image_url} />
                     <ChecklistItem label="Service Setup" isSet={!!settings?.property_service_list} />
                  </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
               <Card sectionIcon={Landmark} title="Banking Information">
                 <div className="grid gap-8">
                    <Field label="Bank Name" value={settings?.bank_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ bank_name: val })} />
                    <div className="grid grid-cols-2 gap-6">
                       <Field label="Account Number" value={settings?.account_number || 'Not Set'} onSave={(val) => updateSettings.mutate({ account_number: val })} />
                       <Field label="IFSC Code" value={settings?.ifsc_code || 'Not Set'} onSave={(val) => updateSettings.mutate({ ifsc_code: val })} />
                    </div>
                 </div>
               </Card>
               <Card sectionIcon={Wallet} title="Mobile Wallet Information">
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                       <Field label="First Name" value={settings?.wallet_first_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ wallet_first_name: val })} />
                       <Field label="Last Name" value={settings?.wallet_last_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ wallet_last_name: val })} />
                    </div>
                    <Field label="Phone Number" value={settings?.wallet_phone || 'Not Set'} onSave={(val) => updateSettings.mutate({ wallet_phone: val })} />
                    <Field label="Wallet Provider" value={settings?.wallet_provider || 'Not Set'} onSave={(val) => updateSettings.mutate({ wallet_provider: val })} />
                    <Field label="Wallet URL" value={settings?.wallet_url || 'Not Set'} onSave={(val) => updateSettings.mutate({ wallet_url: val })} icon={<Globe className="w-3 h-3"/>} />
                  </div>
               </Card>
            </div>

            <div className="space-y-8">
               <Card sectionIcon={CreditCard} title="Fees & Gateway Integration">
                 <div className="grid gap-8">
                    <div className="grid grid-cols-3 gap-6">
                       <Field label="Booking Comm. %" value={settings?.booking_commission_pct || '0'} onSave={(val) => updateSettings.mutate({ booking_commission_pct: val })} />
                       <Field label="Card Fee %" value={settings?.card_processing_fee_pct || '0'} onSave={(val) => updateSettings.mutate({ card_processing_fee_pct: val })} />
                       <Field label="Flat Txn Fee" value={settings?.transaction_fee || '0'} onSave={(val) => updateSettings.mutate({ transaction_fee: val })} />
                    </div>
                    <div className="pt-4 border-t border-zinc-100 flex flex-col gap-6">
                        <Field label="Public Gateway" value={settings?.pg_gateway || 'Not Set'} onSave={(val) => updateSettings.mutate({ pg_gateway: val })} />
                        <Field label="Public API Key" value={settings?.pg_api_key || '••••••••'} onSave={(val) => updateSettings.mutate({ pg_api_key: val })} />
                        <Field label="Internal API Key" value={settings?.internal_pg_api_key || '••••••••'} onSave={(val) => updateSettings.mutate({ internal_pg_api_key: val })} />
                    </div>
                 </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card sectionIcon={Computer} title="POS & Integrations">
               <div className="grid gap-6">
                  <Field label="Primary POS System" value={settings?.pos_system_name || 'Not Set'} onSave={(val) => updateSettings.mutate({ pos_system_name: val })} />
                  <Field label="POS API Key" value={settings?.pos_api_key || '••••••••'} onSave={(val) => updateSettings.mutate({ pos_api_key: val })} />
               </div>
            </Card>

            <Card sectionIcon={Palette} title="System Theming">
               <div className="grid gap-6">
                  <div className="flex items-center gap-4">
                     <div 
                        className="w-16 h-16 rounded-full shadow-inner border-4 border-white"
                        style={{ backgroundColor: settings?.theme_color || '#4f46e5' }}
                     />
                     <div className="flex-1">
                        <Field label="Brand HEX Color" value={settings?.theme_color || '#4f46e5'} onSave={(val) => updateSettings.mutate({ theme_color: val })} />
                     </div>
                  </div>
               </div>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-10 rounded-[40px] border border-zinc-200 shadow-sm">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-8 mb-8">
               <div>
                 <h3 className="text-xl font-black tracking-tight">Admin Privileges</h3>
                 <p className="text-zinc-500 text-xs">Manage system users who can access this control panel.</p>
               </div>
               <button className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md">
                 Add Admin User
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {adminUsers.map((user: any) => (
                 <div key={user.id} className="p-6 rounded-[32px] border-2 border-zinc-50 bg-zinc-50/20 hover:border-[var(--theme-color,#4f46e5)] transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-xl font-black text-zinc-400">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <p className="font-black text-sm tracking-tight">{user.name || 'Manager'}</p>
                        <p className="text-zinc-400 text-[10px] font-bold">{user.email}</p>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// UI Atomic Components
function Card({ children, title, sectionIcon: Icon }: { children: React.ReactNode, title: string, sectionIcon: any }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[40px] p-8 shadow-sm hover:shadow-md transition-shadow">
       <div className="flex items-center gap-3 border-b border-zinc-50 pb-5 mb-6">
         <Icon className="w-4 h-4 text-[var(--theme-color,#4f46e5)]" />
         <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
       </div>
       {children}
    </div>
  );
}

function Field({ label, value, onSave, icon }: { label: string, value: string, onSave: (v: string) => void, icon?: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  return (
    <div className="group space-y-2">
      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{label}</label>
      <div className="relative">
        {isEditing ? (
          <div className="flex gap-2">
            <input 
              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--theme-color,#4f46e5)] transition-all"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              autoFocus
            />
            <button onClick={() => { onSave(tempValue); setIsEditing(false); }} className="p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"><Check className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zinc-50/50 border border-transparent rounded-2xl px-5 py-3 group-hover:border-zinc-200 cursor-pointer transition-all" onClick={() => setIsEditing(true)}>
             <div className="flex items-center gap-3 overflow-hidden text-zinc-700">
               {icon && <span className="text-zinc-400">{icon}</span>}
               <span className="text-sm font-black tracking-tight truncate">{value || 'Set ' + label}</span>
             </div>
             <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onSave }: { label: string, value: string, onSave: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  return (
    <div className="group space-y-2">
      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">{label}</label>
      <div className="relative">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea 
              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[var(--theme-color,#4f46e5)] transition-all min-h-[100px]"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
               <button onClick={() => setIsEditing(false)} className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Cancel</button>
               <button onClick={() => { onSave(tempValue); setIsEditing(false); }} className="px-4 py-1.5 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm">Save</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between bg-zinc-50/50 border border-transparent rounded-2xl px-5 py-3 group-hover:border-zinc-200 cursor-pointer transition-all min-h-[80px]" onClick={() => setIsEditing(true)}>
            <span className="text-sm font-black tracking-tight text-zinc-700 leading-relaxed whitespace-pre-wrap">{value || 'Set ' + label}</span>
             <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ label, isSet }: { label: string, isSet: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 px-2 rounded-xl transition-all cursor-default">
       <span className="text-sm font-bold text-zinc-600">{label}</span>
       <div className={cn("flex items-center justify-center w-5 h-5 rounded-full border-2", isSet ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50 text-red-500")}>
          {isSet ? <Check className="w-3 h-3 text-emerald-500" /> : <span className="text-xs font-black">!</span>}
       </div>
    </div>
  );
}
