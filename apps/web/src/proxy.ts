/**
 * Next.js 16 Multi-Tenant Subdomain Proxy Handler
 * Primary entrypoint for subdomain interception and tenant route rewriting.
 * DO NOT delete or bypass this logic without updating multi-tenant routing specifications.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // Pass through Next.js internal files, static assets, and API endpoints
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract hostname without port
  const hostname = req.headers.get("host") || "";
  const domain = hostname.split(':')[0];

  // Check if domain is an IP address (IPv4 or IPv6)
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain === "::1";

  // Extract potential tenant subdomain
  const currentHost = domain
    .replace(".localhost", "")
    .replace(".restopia.in", "");

  const isLocalOrBase = 
    isIpAddress ||
    currentHost === "localhost" || 
    currentHost === "127.0.0.1" || 
    currentHost === "restopia.in";

  // Helper to normalize calendar typos and aliases
  let cleanPath = url.pathname;
  cleanPath = cleanPath.replace(/\/(calender|master-calendar|master-calender|mastercalendar|mastercalender)/g, '/calendar');

  // Known admin subroutes
  const knownAdminSections = [
    'calendar', 'rooms', 'housekeeping', 'staff', 'guests', 'billing', 'settings'
  ];

  // Direct localhost, IP address, or base domain access
  if (isLocalOrBase) {
    if (url.pathname === "/") {
      return NextResponse.redirect(new URL("/hotelflora/admin", req.url));
    }
    // Handle /hotelflora root
    if (url.pathname === "/hotelflora" || url.pathname === "/hotelflora/") {
      return NextResponse.redirect(new URL("/hotelflora/admin", req.url));
    }
    // Handle typos or direct section under /hotelflora/...
    if (url.pathname.startsWith("/hotelflora/")) {
      const rest = url.pathname.replace(/^\/hotelflora\//, '');
      if (rest === "calender" || rest === "master-calendar" || rest === "master-calender") {
        return NextResponse.redirect(new URL("/hotelflora/admin/calendar", req.url));
      }
      if (rest.startsWith("admin/calender") || rest.startsWith("admin/master-calendar")) {
        return NextResponse.redirect(new URL("/hotelflora/admin/calendar", req.url));
      }
      if (knownAdminSections.includes(rest)) {
        return NextResponse.redirect(new URL(`/hotelflora/admin/${rest}`, req.url));
      }
      return NextResponse.next();
    }
    // Handle /admin or /admin/...
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return NextResponse.redirect(new URL("/hotelflora/admin", req.url));
    }
    if (url.pathname.startsWith("/admin/")) {
      const section = cleanPath.replace(/^\/admin\//, '');
      return NextResponse.redirect(new URL(`/hotelflora/admin/${section}`, req.url));
    }
    // Handle direct top-level sections e.g. /calendar, /rooms, /calender
    const topSection = cleanPath.replace(/^\//, '').split('/')[0];
    if (knownAdminSections.includes(topSection)) {
      const rest = cleanPath.replace(/^\/[^/]+/, '');
      return NextResponse.redirect(new URL(`/hotelflora/admin/${topSection}${rest}`, req.url));
    }

    return NextResponse.next();
  }

  // Subdomain root redirect to /admin (e.g. hotelflora.localhost/ -> hotelflora.localhost/admin)
  if (url.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Normalize subdomain typos (e.g. /admin/calender -> /admin/calendar, /calender -> /admin/calendar)
  const subSection = cleanPath.replace(/^\/(admin\/)?/, '').split('/')[0];
  if (url.pathname.includes('calender') || url.pathname.includes('master-calendar') || url.pathname.includes('mastercalender')) {
    return NextResponse.redirect(new URL(`/admin/calendar`, req.url));
  }

  // If path is a top-level section on subdomain e.g. hotelflora.localhost/calendar -> rewrite to /hotelflora/admin/calendar
  if (knownAdminSections.includes(url.pathname.replace(/^\//, '').split('/')[0])) {
    const sec = url.pathname.replace(/^\//, '');
    url.pathname = `/${currentHost}/admin/${sec}`;
    return NextResponse.rewrite(url);
  }

  // If the pathname already starts with the tenant subdomain path (e.g. /hotelflora/admin/rooms),
  // pass through to avoid infinite rewrite loops
  if (url.pathname.startsWith(`/${currentHost}`)) {
    return NextResponse.next();
  }

  // Construct target URL mapping subdomain -> [tenant] path (e.g. hotelflora.localhost/admin/rooms -> /hotelflora/admin/rooms)
  const targetPath = `/${currentHost}${url.pathname}`;
  url.pathname = targetPath;

  return NextResponse.rewrite(url);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
