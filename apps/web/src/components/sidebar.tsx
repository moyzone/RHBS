"use client"

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Home, CalendarDays, BedDouble, Users, CreditCard, Menu, X, UserCircle, Brush, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { resolveTenantId } from '@/lib/api';

interface SidebarProps {
  tenantId: string;
}

export function Sidebar({ tenantId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const activeTenantId = resolveTenantId(tenantId);

  const basePath = pathname.startsWith(`/${activeTenantId}`) ? `/${activeTenantId}` : '';
  
  const navigation = [
    { name: 'Dashboard', href: `${basePath}/admin`, icon: Home },
    { name: 'Master Calendar', href: `${basePath}/admin/calendar`, icon: CalendarDays },
    { name: 'Room Management', href: `${basePath}/admin/rooms`, icon: BedDouble },
    { name: 'Housekeeping', href: `${basePath}/admin/housekeeping`, icon: Brush },
    { name: 'Staff Management', href: `${basePath}/admin/staff`, icon: Users },
    { name: 'Guest Profiles', href: `${basePath}/admin/guests`, icon: UserCircle },
    { name: 'Finance', href: `${basePath}/admin/billing`, icon: CreditCard },
    { name: 'Settings', href: `${basePath}/admin/settings`, icon: Shield },
  ];

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-zinc-900 border-b border-zinc-800 text-white p-4">
        <span className="font-bold tracking-tight text-lg">Restopia PMS</span>
        <button onClick={() => setIsOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-300 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-[var(--theme-color,#4f46e5)]">
              {activeTenantId.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-white uppercase tracking-wider text-base">
              {activeTenantId}
            </span>
          </div>
          <button className="md:hidden" onClick={closeSidebar}>
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-base font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-[var(--theme-color,#4f46e5)] text-white" 
                    : "hover:bg-zinc-800 hover:text-white"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
                {item.name}
              </a>
            )
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
           <div className="flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-zinc-400" />
              <div className="flex flex-col">
                 <span className="text-base font-medium text-white">System Admin</span>
                <span className="text-sm text-zinc-500">{tenantId} Account</span>
              </div>
           </div>
        </div>
      </div>
    </>
  );
}
