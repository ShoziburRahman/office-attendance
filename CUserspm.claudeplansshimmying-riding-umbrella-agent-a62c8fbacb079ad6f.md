# Plan: Identify Server-Side Functionality for Static Export

Goal: Provide a complete list of server-side logic that must be converted to client-side logic to enable `output: 'export'`.

## Steps:

1.  **Analyze Server Actions**
    *   Read and analyze the following files for `"use server"`:
        *   `src/app/employee/actions.ts`
        *   `src/app/admin/employees/actions.ts`
        *   `src/app/admin/attendance/actions.ts`
        *   `src/app/admin/settings/actions.ts`
        *   `src/app/admin/office-qr/actions.ts`
        *   `src/app/admin/wfh/actions.ts`
        *   `src/app/admin/wfh/page.tsx`
        *   `src/app/login/actions.ts`
    *   For each action, check:
        *   Does it only call Supabase via `@/lib/supabase/server`?
        *   Does it use server-only Node.js features (e.g., `fs`, `process`, `next/headers`, `cookies()`)?
        *   Does it perform logic that *must* happen on a server?

2.  **Map Server Action Usage**
    *   For each server action identified, search the codebase to find which components call them.

3.  **Analyze Route Handlers**
    *   Verify if any `route.ts` files were missed (although initial glob returned none).

4.  **Analyze Session Management**
    *   Read `src/lib/auth/session.ts`.
    *   Determine how session validation is handled.
    *   Assess if this logic can be migrated to the client side (using Supabase client-side auth).

5.  **Synthesize Findings**
    *   List all broken functionality.
    *   Categorize by:
        *   Server Actions (and the components using them).
        *   Session/Auth logic.
        *   Other server-side dependencies.
