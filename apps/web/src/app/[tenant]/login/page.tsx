"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchTenantPublicMetadata, loginTenant, TenantPublicMetadata } from "@/lib/api";
import { Eye, EyeOff, Lock, Mail, Hotel, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function TenantLoginPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tenantId = (params?.tenant as string) || "hotelflora";
  const redirectUrl = searchParams.get("redirect") || `/${tenantId}/admin`;

  const [tenantMeta, setTenantMeta] = useState<TenantPublicMetadata>({
    id: tenantId,
    name: tenantId === "hotelflora" ? "Hotel Flora" : tenantId.replace(/-/g, " ").toUpperCase(),
    theme_color: "#4f46e5",
    business_type: "Hotel"
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const meta = await fetchTenantPublicMetadata(tenantId);
        if (isMounted && meta) {
          setTenantMeta(meta);
        }
      } catch (err) {
        console.error("Failed to load tenant metadata", err);
      } finally {
        if (isMounted) setIsLoadingMeta(false);
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter both work email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginTenant(tenantId, email.trim(), password);
      
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("remembered_email", email.trim());
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("remembered_email");
      }

      setSuccessMsg("Authentication successful! Redirecting...");

      setTimeout(() => {
        router.push(redirectUrl);
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const accentColor = tenantMeta.theme_color || "#4f46e5";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glowing Spheres */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: accentColor }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl shadow-black/60 transition-all duration-300">
        
        {/* Accent Top Border */}
        <div 
          className="absolute top-0 left-8 right-8 h-1 rounded-b-full transition-all duration-500"
          style={{ backgroundColor: accentColor }}
        />

        {/* Tenant Header / Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          {tenantMeta.logo_url ? (
            <img 
              src={tenantMeta.logo_url} 
              alt={tenantMeta.name} 
              className="h-16 w-auto object-contain mb-3 rounded-lg shadow-md"
            />
          ) : (
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/10 border border-white/10"
              style={{ backgroundColor: accentColor }}
            >
              <Hotel className="w-7 h-7 text-white" />
            </div>
          )}

          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {tenantMeta.name}
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
            {tenantMeta.business_type || "Hotel Management Portal"}
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Work Email Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hotel.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-300">Remember Me</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: accentColor }}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Portal</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Restopia Hotel Management System &bull; Enterprise Auth
        </div>
      </div>
    </div>
  );
}
