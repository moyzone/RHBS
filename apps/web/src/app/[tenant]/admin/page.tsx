"use client"

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useParams } from 'next/navigation';
import {
  Users, BedDouble, Calendar, CreditCard, Brush, TrendingUp, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  checkins_today: number;
  occupancy_rate: number;
  occupied_rooms: number;
  total_rooms: number;
  active_guests: number;
  dirty_rooms: number;
  clean_rooms: number;
  cleaning_rooms: number;
  today_revenue: number;
  total_bookings: number;
}

export default function DashboardPage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats', tenant],
    queryFn: () => fetchApi<DashboardStats>(tenant, '/dashboard/stats'),
    refetchInterval: 10000
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 capitalize">{tenant} Dashboard</h1>
          <p className="text-zinc-500">Live operational overview & revenue statistics</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${tenant}/admin/calendar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-color,#4f46e5)] text-white text-sm font-medium rounded-lg shadow hover:opacity-90 transition-opacity"
          >
            <Calendar className="w-4 h-4" />
            Master Calendar
          </Link>
          <Link
            href={`/${tenant}/admin/rooms`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <BedDouble className="w-4 h-4" />
            Manage Rooms
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Check-ins Today</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {isLoading ? '...' : stats?.checkins_today ?? 0}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-[var(--theme-color,#4f46e5)] rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Occupancy Rate</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {isLoading ? '...' : `${stats?.occupancy_rate ?? 0}%`}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats?.occupied_rooms ?? 0} / {stats?.total_rooms ?? 0} Rooms Occupied
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Current Active Guests</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {isLoading ? '...' : stats?.active_guests ?? 0}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 mb-1">Today's Revenue</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {isLoading ? '...' : `₹${(stats?.today_revenue ?? 0).toLocaleString('en-IN')}`}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Housekeeping & Inventory Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Brush className="w-5 h-5 text-indigo-500" />
              Housekeeping Status
            </h3>
            <Link href={`/${tenant}/admin/housekeeping`} className="text-xs text-[var(--theme-color,#4f46e5)] hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Clean & Ready
              </span>
              <span className="font-bold">{stats?.clean_rooms ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="w-4 h-4" /> Needs Cleaning (Dirty)
              </span>
              <span className="font-bold">{stats?.dirty_rooms ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-4 h-4" /> Cleaning in Progress
              </span>
              <span className="font-bold">{stats?.cleaning_rooms ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-lg">Quick Property Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link href={`/${tenant}/admin/calendar`} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-[var(--theme-color,#4f46e5)] transition-colors group">
              <Calendar className="w-6 h-6 text-zinc-500 group-hover:text-[var(--theme-color,#4f46e5)] mb-2" />
              <div className="font-medium text-sm">New Booking</div>
              <div className="text-xs text-zinc-500">Add reservation</div>
            </Link>

            <Link href={`/${tenant}/admin/billing`} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-[var(--theme-color,#4f46e5)] transition-colors group">
              <CreditCard className="w-6 h-6 text-zinc-500 group-hover:text-[var(--theme-color,#4f46e5)] mb-2" />
              <div className="font-medium text-sm">Create Invoice</div>
              <div className="text-xs text-zinc-500">Billing & GST tax</div>
            </Link>

            <Link href={`/${tenant}/admin/guests`} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-[var(--theme-color,#4f46e5)] transition-colors group">
              <Users className="w-6 h-6 text-zinc-500 group-hover:text-[var(--theme-color,#4f46e5)] mb-2" />
              <div className="font-medium text-sm">Guest Directory</div>
              <div className="text-xs text-zinc-500">ID proofs & history</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
