<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Working rules
- Use pnpm only. Never npm or yarn.
- Never put secrets (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY) in NEXT_PUBLIC_ variables or client code.
- I'm a command-line beginner: give one terminal command at a time, say which folder to be in, what success looks like, then wait for me to confirm.
- Before changing anything, list every file you will create or modify and wait for my approval.
<!-- END:nextjs-agent-rules -->
