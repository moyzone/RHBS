# Repository Agent Rules & Architecture Guidelines

## Architecture & Multi-Tenant Routing Rules
- **Next.js Subdomain Proxy (Next.js 16 Standard)**: `apps/web/src/proxy.ts` is strictly mandatory for multi-tenant subdomain resolution.
- **DO NOT** rename, move, delete, or ignore `apps/web/src/proxy.ts`.
- Next.js 16 uses `src/proxy.ts` (exporting a `proxy` function) to intercept and rewrite subdomain requests (e.g. `http://<tenant>.localhost:3000/admin/...` -> `/<tenant>/admin/...`).
- **DO NOT** create a separate `src/middleware.ts` file, as Next.js 16 enforces using `src/proxy.ts` exclusively.
- Dynamic route components live under `apps/web/src/app/[tenant]/...`.
