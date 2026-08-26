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

  // Direct localhost, IP address, or base domain access
  if (
    isIpAddress ||
    currentHost === "localhost" || 
    currentHost === "127.0.0.1" || 
    currentHost === "restopia.in"
  ) {
    if (url.pathname === "/") {
      return NextResponse.redirect(new URL("/hotelflora/admin", req.url));
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      const targetPath = url.pathname.replace(/^\/admin/, "/hotelflora/admin");
      return NextResponse.redirect(new URL(targetPath, req.url));
    }
    return NextResponse.next();
  }

  // Subdomain root redirect to /admin (e.g. hotelflora.localhost/ -> hotelflora.localhost/admin)
  if (url.pathname === "/") {
    return NextResponse.redirect(new URL("/admin", req.url));
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
