"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken, resolveTenantId } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children, tenantId }: { children: React.ReactNode; tenantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTenantId = resolveTenantId(tenantId);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = getAuthToken(activeTenantId);
    if (!token) {
      const loginUrl = `/${activeTenantId}/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    } else {
      setIsAuthorized(true);
    }
  }, [activeTenantId, pathname, router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Verifying session permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
