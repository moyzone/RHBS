# Repository Agent Rules & Architecture Guidelines

## Architecture & Multi-Tenant Routing Rules
- **Next.js Subdomain Middleware**: `apps/web/src/middleware.ts` is strictly mandatory for multi-tenant subdomain resolution.
- **DO NOT** rename, move, delete, or ignore `apps/web/src/middleware.ts` or `apps/web/src/proxy.ts`.
- Next.js requires the entrypoint file to be named `middleware.ts` (exporting a `middleware` function) to intercept and rewrite subdomain requests (e.g. `http://<tenant>.localhost:3000/admin/...` -> `/<tenant>/admin/...`).
- Dynamic route components live under `apps/web/src/app/[tenant]/...`.
