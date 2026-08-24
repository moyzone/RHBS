<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Multi-Tenant Subdomain Routing Rules
- `apps/web/src/middleware.ts` is strictly mandatory for Next.js multi-tenant subdomain resolution.
- **DO NOT** rename, move, delete, or ignore `apps/web/src/middleware.ts` or `apps/web/src/proxy.ts`.
- Next.js requires the entrypoint file to be named `middleware.ts` (exporting a `middleware` function) to intercept and rewrite subdomain requests (e.g. `http://<tenant>.localhost:3000/admin/...` -> `/<tenant>/admin/...`).
