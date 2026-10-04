import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { notFound } from 'next/navigation';

async function getTenantTheme(tenantId: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/dev/token?tenant_id=${tenantId}`, {
      method: 'POST',
      cache: 'no-store'
    });
    if (!res.ok) return "#4f46e5";
    const data = await res.json();
    return data.theme_color || "#4f46e5";
  } catch (error) {
    return "#4f46e5";
  }
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  
  if (!tenant) {
    notFound();
  }

  const themeColor = await getTenantTheme(tenant);

  return (
    <AuthGuard tenantId={tenant}>
      <div 
        className="bg-gray-50 dark:bg-zinc-950 min-h-screen"
        style={{ '--theme-color': themeColor } as React.CSSProperties}
      >
        <Sidebar tenantId={tenant} />
        
        {/* Main Content Area */}
        <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
          <main className="flex-1 w-full relative">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
