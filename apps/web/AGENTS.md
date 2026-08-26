<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Multi-Tenant Subdomain Routing Rules
- `apps/web/src/proxy.ts` is strictly mandatory for Next.js 16 multi-tenant subdomain resolution.
- **DO NOT** rename, move, delete, or ignore `apps/web/src/proxy.ts`.
- Next.js 16 requires the entrypoint file to be named `proxy.ts` (exporting a `proxy` function) to intercept and rewrite subdomain requests (e.g. `http://<tenant>.localhost:3000/admin/...` -> `/<tenant>/admin/...`).
- **DO NOT** add a `src/middleware.ts` file, as Next.js 16 will fail if both exist.
