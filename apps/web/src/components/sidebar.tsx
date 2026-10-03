"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Home, CalendarDays, BedDouble, Users, CreditCard, Menu, X, UserCircle, Brush, Shield, LogOut, Hotel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTenantId, fetchApi, clearAuthToken, getAuthToken } from "@/lib/api";

interface SidebarProps {
  tenantId: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface TenantProfile {
  id: string;
  name: string;
  theme_color?: string;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function getInitials(name: string): string {
  if (!name) return "US";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const roleAccessMap: Record<string, string[]> = {
  "Dashboard": ["Owner", "Manager", "Front Desk", "Housekeeping", "Accountant"],
  "Master Calendar": ["Owner", "Manager", "Front Desk"],
  "Room Management": ["Owner", "Manager", "Front Desk", "Housekeeping"],
  "Housekeeping": ["Owner", "Manager", "Front Desk", "Housekeeping"],
  "Guest Profiles": ["Owner", "Manager", "Front Desk", "Accountant"],
  "Finance": ["Owner", "Manager", "Accountant"],
  "Staff Management": ["Owner", "Manager"],
  "Settings": ["Owner", "Manager"],
};

export function Sidebar({ tenantId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const activeTenantId = resolveTenantId(tenantId);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    // First try fast JWT decoding from storage/cookie
    const token = getAuthToken(activeTenantId);
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && isMounted) {
        setUserProfile({
          user_id: decoded.user_id || "user_123",
          name: decoded.name || "Sarah Connor",
          email: decoded.email || "sarah@hotelflora.com",
          role: decoded.role || "Front Desk",
          tenant_id: decoded.tenant_id || activeTenantId,
        });
      }
    }

    // Fetch authoritative user profile & tenant info from backend GET /api/auth/me
    async function loadSession() {
      try {
        const res = await fetchApi<{ user: UserProfile; tenant: TenantProfile }>(activeTenantId, "/auth/me");
        if (isMounted && res) {
          if (res.user) setUserProfile(res.user);
          if (res.tenant) setTenantProfile(res.tenant);
        }
      } catch (err) {
        // Fallback handled by JWT decode or default fallback
      }
    }

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  // Housekeeping staff auto-redirection directly to Housekeeping board
  useEffect(() => {
    if (userProfile?.role === "Housekeeping") {
      const basePath = `/${activeTenantId}`;
      if (pathname === `${basePath}/admin` || pathname === `${basePath}/admin/`) {
        router.replace(`${basePath}/admin/housekeeping`);
      }
    }
  }, [userProfile, activeTenantId, pathname, router]);

  const basePath = pathname.startsWith(`/${activeTenantId}`) ? `/${activeTenantId}` : '';
  
  const allNavigation = [
    { name: "Dashboard", href: `${basePath}/admin`, icon: Home },
    { name: "Master Calendar", href: `${basePath}/admin/calendar`, icon: CalendarDays },
    { name: "Room Management", href: `${basePath}/admin/rooms`, icon: BedDouble },
    { name: "Housekeeping", href: `${basePath}/admin/housekeeping`, icon: Brush },
    { name: "Staff Management", href: `${basePath}/admin/staff`, icon: Users },
    { name: "Guest Profiles", href: `${basePath}/admin/guests`, icon: UserCircle },
    { name: "Finance", href: `${basePath}/admin/billing`, icon: CreditCard },
    { name: "Settings", href: `${basePath}/admin/settings`, icon: Shield },
  ];

  const userRole = userProfile?.role || "Manager"; // default fallback role

  // Filter navigation items based on current user role
  const navigation = allNavigation.filter((item) => {
    const allowedRoles = roleAccessMap[item.name];
    if (!allowedRoles) return true;
    return allowedRoles.includes(userRole);
  });

  const closeSidebar = () => setIsOpen(false);

  const handleLogout = () => {
    clearAuthToken(activeTenantId);
    router.push(`/${activeTenantId}/login`);
  };

  const propertyName = tenantProfile?.name || (activeTenantId === "hotelflora" ? "Hotel Flora" : activeTenantId.toUpperCase());
  const themeColor = tenantProfile?.theme_color || "#4f46e5";

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between bg-zinc-900 border-b border-zinc-800 text-white p-4">
        <div className="flex items-center space-x-2">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: themeColor }}
          >
            {propertyName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold tracking-tight text-base truncate max-w-[180px]">
            {propertyName}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {userRole}
          </span>
          <button onClick={() => setIsOpen(true)} className="p-1 hover:text-zinc-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-300 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
              style={{ backgroundColor: themeColor }}
            >
              {propertyName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white tracking-wide text-sm truncate">
                {propertyName}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase truncate">
                Restopia Portal
              </span>
            </div>
          </div>
          <button className="md:hidden" onClick={closeSidebar}>
            <X className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.href === `${basePath}/admin` 
              ? (pathname === `${basePath}/admin` || pathname === `${basePath}/admin/`)
              : (pathname === item.href || pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 group",
                  isActive 
                    ? "bg-[var(--theme-color,#4f46e5)] text-white shadow-md shadow-indigo-500/20" 
                    : "hover:bg-zinc-800/80 hover:text-white text-zinc-400"
                )}
              >
                <item.icon className={cn("mr-3 h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200")} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer & Logout Flow */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm border border-white/10"
                style={{ backgroundColor: themeColor }}
              >
                {userProfile?.name ? getInitials(userProfile.name) : "US"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {userProfile?.name || "Staff Member"}
                </span>
                <span className="inline-flex items-center text-[10px] font-medium text-indigo-400 truncate mt-0.5">
                  {userRole}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
