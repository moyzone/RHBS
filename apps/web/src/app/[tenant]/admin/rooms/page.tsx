"use client"

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Plus, Trash2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/modal';

export default function RoomsManagementPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const qc = useQueryClient();

  const [newRoomType, setNewRoomType] = useState({ name: '', base_price: '' as number | string, capacity: 2 as number | string });
  const [newRoom, setNewRoom] = useState({ name: '', room_type_id: '' });

  // Editing state for Room Types
  const [editingRTId, setEditingRTId] = useState<string | null>(null);
  const [editingRTForm, setEditingRTForm] = useState({ name: '', base_price: 0, capacity: 2 });

  // Editing state for Physical Rooms
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomForm, setEditingRoomForm] = useState({ name: '', room_type_id: '' });

  // Custom Modal state
  const [modal, setModal] = useState<{ 
    isOpen: boolean; title: string; message: string; type: 'info' | 'danger'; onConfirm?: () => void 
  }>({ 
    isOpen: false, title: '', message: '', type: 'info' 
  });

  const { data: roomTypes = [], isLoading: isLoadingRT } = useQuery({
    queryKey: ['roomTypes', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/room-types')
  });

  const { data: rooms = [], isLoading: isLoadingR } = useQuery({
    queryKey: ['rooms', tenant],
    queryFn: () => fetchApi<any[]>(tenant, '/rooms')
  });

  const createRTMutation = useMutation({
    mutationFn: (rt: any) => fetchApi(tenant, '/room-types', { method: 'POST', body: JSON.stringify(rt) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roomTypes', tenant] }); setNewRoomType({ name: '', base_price: '', capacity: 2 }) }
  });

  const updateRTMutation = useMutation({
    mutationFn: (rt: any) => fetchApi(tenant, `/room-types/${rt.id}`, { method: 'PATCH', body: JSON.stringify(rt) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roomTypes', tenant] }); setEditingRTId(null); }
  });

  const deleteRTMutation = useMutation({
    mutationFn: (id: string) => fetchApi(tenant, `/room-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roomTypes', tenant] }),
    onError: (err: any) => setModal({
      isOpen: true,
      title: "Deletion Blocked",
      message: err.message || "Failed to delete room type. It might have active rooms.",
      type: 'danger'
    })
  });

  const createRoomMutation = useMutation({
    mutationFn: (r: any) => fetchApi(tenant, '/rooms', { method: 'POST', body: JSON.stringify(r) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms', tenant] }); setNewRoom({ name: '', room_type_id: '' }) }
  });

  const updateRoomMutation = useMutation({
    mutationFn: (r: any) => fetchApi(tenant, `/rooms/${r.id}`, { method: 'PATCH', body: JSON.stringify(r) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms', tenant] }); setEditingRoomId(null); }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => fetchApi(tenant, `/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms', tenant] }),
    onError: (err: any) => setModal({
      isOpen: true,
      title: "Deletion Blocked",
      message: err.message || "Failed to delete room. It might have active bookings.",
      type: 'danger'
    })
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Room Settings</h1>
        <p className="text-zinc-500">Manage room categories, pricing setups, and physical units.</p>
      </div>

      {/* Room Types */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold mb-4">Room Types</h2>
        
        <div className="flex gap-4 mb-6 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-zinc-500 mb-1 block">Category Name</label>
            <input type="text" className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700" placeholder="e.g. Deluxe Suite" value={newRoomType.name} onChange={e => setNewRoomType({ ...newRoomType, name: e.target.value })}/>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-500 mb-1 block">Base Price (INR)</label>
            <input type="number" className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700" value={newRoomType.base_price} onChange={e => setNewRoomType({ ...newRoomType, base_price: e.target.value === '' ? '' : Number(e.target.value) })}/>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-500 mb-1 block">Capacity</label>
            <input type="number" className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700" value={newRoomType.capacity} onChange={e => setNewRoomType({ ...newRoomType, capacity: e.target.value === '' ? '' : Number(e.target.value) })}/>
          </div>
          <button 
            onClick={() => createRTMutation.mutate(newRoomType)}
            className="bg-[var(--theme-color,#4f46e5)] hover:opacity-90 text-white font-medium rounded-lg px-4 py-2 h-[42px] flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Type
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500">
              <tr>
                <th className="font-semibold p-3 text-left">Name</th>
                <th className="font-semibold p-3 text-left">Base Price</th>
                <th className="font-semibold p-3 text-left">Capacity</th>
                <th className="font-semibold p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRT ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : roomTypes.map((rt: any) => {
                const isEditing = editingRTId === rt.id;
                return (
                <tr key={rt.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-medium">
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700" 
                        value={editingRTForm.name} 
                        onChange={e => setEditingRTForm({...editingRTForm, name: e.target.value})}
                      />
                    ) : rt.name}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                        <input 
                          type="number" 
                          className="w-24 border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700" 
                          value={editingRTForm.base_price} 
                          onChange={e => setEditingRTForm({...editingRTForm, base_price: Number(e.target.value)})}
                        />
                      ) : `₹${rt.base_price}`}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                        <input 
                          type="number" 
                          className="w-20 border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700" 
                          value={editingRTForm.capacity} 
                          onChange={e => setEditingRTForm({...editingRTForm, capacity: Number(e.target.value)})}
                        />
                      ) : `${rt.capacity} Persons`}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                       {isEditing ? (
                         <>
                           <button 
                             onClick={() => updateRTMutation.mutate({ id: rt.id, ...editingRTForm })}
                             className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                           >
                             <Save className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setEditingRTId(null)}
                             className="p-1 text-zinc-400 hover:bg-zinc-100 rounded transition-colors"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </>
                       ) : (
                         <>
                           <button 
                             onClick={() => {
                               setEditingRTId(rt.id);
                               setEditingRTForm({ name: rt.name, base_price: rt.base_price, capacity: rt.capacity });
                             }}
                             className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setModal({
                               isOpen: true,
                               title: "Delete Room Type?",
                               message: "Are you sure you want to delete this category? This action cannot be undone.",
                               type: 'danger',
                               onConfirm: () => deleteRTMutation.mutate(rt.id)
                             })}
                             className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Room Units */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold mb-4">Physical Rooms</h2>
        
        <div className="flex gap-4 mb-6 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-zinc-500 mb-1 block">Unit Name</label>
            <input type="text" className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700" placeholder="e.g. Room 101" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}/>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-zinc-500 mb-1 block">Assign to Type</label>
            <select className="w-full border rounded-lg p-2 dark:bg-zinc-800 dark:border-zinc-700 bg-transparent" value={newRoom.room_type_id} onChange={e => setNewRoom({ ...newRoom, room_type_id: e.target.value })}>
              <option value="">Select Type</option>
              {roomTypes.map((rt: any) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => createRoomMutation.mutate(newRoom)}
            disabled={!newRoom.room_type_id || !newRoom.name}
            className="bg-[var(--theme-color,#4f46e5)] hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 h-[42px] flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Unit
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500">
              <tr>
                <th className="font-semibold p-3 text-left">Room Name</th>
                <th className="font-semibold p-3 text-left">Category</th>
                <th className="font-semibold p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingR ? <tr><td colSpan={3} className="p-4 text-center">Loading...</td></tr> : rooms.map((r: any) => {
                const rt = roomTypes.find((t: any) => t.id === r.room_type_id);
                const isEditing = editingRoomId === r.id;
                return (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3 font-medium">
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="w-full border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700" 
                        value={editingRoomForm.name} 
                        onChange={e => setEditingRoomForm({...editingRoomForm, name: e.target.value})}
                      />
                    ) : r.name}
                  </td>
                  <td className="p-3 text-zinc-500">
                    {isEditing ? (
                       <select 
                         className="w-full border rounded px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700 bg-transparent"
                         value={editingRoomForm.room_type_id}
                         onChange={e => setEditingRoomForm({...editingRoomForm, room_type_id: e.target.value})}
                       >
                         {roomTypes.map((type: any) => <option key={type.id} value={type.id}>{type.name}</option>)}
                       </select>
                    ) : (rt?.name || 'Unknown')}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                       {isEditing ? (
                         <>
                           <button 
                             onClick={() => updateRoomMutation.mutate({ id: r.id, ...editingRoomForm })}
                             className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                           >
                             <Save className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setEditingRoomId(null)}
                             className="p-1 text-zinc-400 hover:bg-zinc-100 rounded transition-colors"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </>
                       ) : (
                         <>
                           <button 
                             onClick={() => {
                               setEditingRoomId(r.id);
                               setEditingRoomForm({ name: r.name, room_type_id: r.room_type_id });
                             }}
                             className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setModal({
                               isOpen: true,
                               title: "Delete Physical Room?",
                               message: "Deleting a room is permanent. Only proceed if there are no future bookings for this unit.",
                               type: 'danger',
                               onConfirm: () => deleteRoomMutation.mutate(r.id)
                             })}
                             className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Modal */}
      <Modal 
        {...modal} 
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
