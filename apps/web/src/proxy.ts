import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  
  // Get hostname of request and remove port
  const hostname = req.headers.get("host") || "";
  const domain = hostname.split(':')[0];

  // Extract the potential subdomain
  let currentHost = domain
    .replace(".localhost", "")
    .replace(".restopia.in", "");

  // Bypass if it's the main domain or direct local access without a subdomain
  if (
    currentHost === "localhost" || 
    currentHost === "127.0.0.1" || 
    currentHost === "restopia.in"
  ) {
    return NextResponse.next();
  }

  // Bypass internal Next.js requests and API routes
  if (
    url.pathname.startsWith('/_next') || 
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') // Skip files with extensions
  ) {
    return NextResponse.next();
  }

  // Rewrite request mapping subdomain to [tenant] segment
  // If the path already has the tenant prefix, don't add it again
  if (url.pathname.startsWith(`/${currentHost}`)) {
    return NextResponse.next();
  }

  url.pathname = `/${currentHost}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
