import React from 'react';

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-zinc-500">Welcome to {tenant} property management system.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-2">Today's Check-ins</h3>
          <p className="text-3xl font-bold text-[var(--theme-color,#4f46e5)]">12</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-2">Occupancy Rate</h3>
          <p className="text-3xl font-bold text-[var(--theme-color,#4f46e5)]">84%</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-2">Active Guests</h3>
          <p className="text-3xl font-bold text-[var(--theme-color,#4f46e5)]">34</p>
        </div>
      </div>
    </div>
  );
}
