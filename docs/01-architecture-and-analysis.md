# Office Attendance & Employee Management — Phase 1: Architecture & Database Design

## 1. Requirements Analysis — Contradictions & Ambiguities Resolved

Before writing schema, these decisions were made explicit because the spec left them open. Each is a real design choice with consequences — flagging them now avoids rework later.

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | "Employee ID must be unique" — is this the Supabase Auth user id, or a human-readable code (e.g. `EMP-0007`)? | Two separate identifiers: `profiles.id` (UUID, = `auth.users.id`, used for all foreign keys/RLS) and `employees.employee_code` (human-readable, unique, admin-assigned, used for display/search). Never reuse one for the other — auth ids must never be exposed as "the employee ID" in UI. |
| 2 | Spec says "do not overload one status column" but then lists a flat set of statuses (`PRESENT`, `MISSING_CHECK_OUT`, `WEEKLY_OFF`, `PAID_LEAVE`...) that mix three different concepts. | Split into three orthogonal columns on `attendance`: `attendance_state` (session lifecycle: `CHECKED_IN`, `CHECKED_OUT`, `INCOMPLETE`, `MISSING_CHECK_OUT`), `day_classification` (what kind of day it was for pay/off purposes: `NORMAL_WORKING_DAY`, `WEEKLY_OFF`, `PAID_LEAVE`, `UNPAID_LEAVE`, `ABSENT`), and `attendance_type` (`OFFICE`/`WORK_FROM_HOME`). "PRESENT" is a derived UI label, not a stored value (state=CHECKED_OUT or CHECKED_IN implies present). |
| 3 | "Do not automatically create an Absent record unless explicitly supported" vs. reports need absentee counts. | Absence is **not** written as a row at check-in time (there's nothing to check in). Instead a scheduled job (`fn_close_out_day`, meant to run once per employee-day after their scheduled end time + grace period has passed) synthesizes `ABSENT` rows for employees who had a schedule for that date, no leave, no WFH approval, and no attendance row. This runs server-side only, never from the client, and only for dates that have fully elapsed in the office timezone. |
| 4 | Break deduction rule interacts with the "12-hour window / missing checkout" rule — do incomplete sessions show negative or zero break-adjusted hours? | Working minutes, break deduction, regular/overtime split are **only computed when `check_out_at` is set**. While `attendance_state IN ('CHECKED_IN','INCOMPLETE','MISSING_CHECK_OUT')`, all duration fields stay `NULL`, not `0` — `NULL` means "not yet known," `0` means "computed as zero." This distinction matters for reports. |
| 5 | Weekly-off overtime rule ("all working time is overtime") vs. leave rule ("worked leave day = treat as fully normal, including break deduction") — do both deduct the 30 min break first? | Yes. Break deduction always happens first against `total_duration` to get `working_minutes`, for *any* day the employee actually clocks in/out (weekly off or not). Then `working_minutes` is split into regular/overtime according to day classification. This keeps one formula (`working_minutes = duration − break`) with a single follow-on branch, instead of two divergent calculations. |
| 6 | Can an employee check in more than once in a day (e.g., after being manually corrected)? Spec never says. | **Assumption:** one attendance row per `(employee_id, attendance_date)` — a single check-in/check-out pair per calendar day, enforced by a unique constraint. Multiple sessions per day (e.g. broken shifts) are out of scope for v1 and can be added later by dropping the per-day uniqueness and keying overtime aggregation off `(employee_id, attendance_date)` sums instead of one row. |
| 7 | Schedule / weekly-off "effective date" history must not let two ranges overlap for the same employee, but the spec doesn't say how conflicts are prevented. | PostgreSQL `EXCLUDE` constraints using `btree_gist` on `(employee_id, daterange(effective_from, effective_until))` guarantee non-overlapping ranges at the database level — this can't be bypassed by application bugs. |
| 8 | QR expiry "30 to 60 seconds" — needs one concrete number for the default implementation. | Configurable via `office_settings.qr_token_ttl_seconds`, defaulting to **45 seconds**. Admin can tune it between 30–60s without a code change. |
| 9 | Wi-Fi verification: the spec explicitly forbids "faking" it, but browsers can't read SSID/BSSID. | The web client never claims to verify Wi-Fi itself. It calls a `WifiVerificationProvider` interface. In the browser, the only implementation available is a **mock/dev provider** that is clearly labeled and, in non-development environments, always returns "unverified" (attendance is then rejected server-side) unless the office network is confirmed some other way (see §5). The real check happens through a Capacitor native plugin (Android) that reports the actual connected SSID/BSSID, which the server then matches against `office_settings`. The server is the only party that decides "Wi-Fi verified = true/false" for an OFFICE attendance action — client input is a signed claim, not a trusted fact (see RPC design). |
| 10 | Leave "counted vs. worked" needs two booleans per the spec's own example, but also needs a place to record *when* the "did they work" fact became known (leave is assigned in advance, work happens later same day). | `employee_leaves.worked_on_leave` and `leave_counted` start as `false`/`true` respectively when the leave is created. A trigger on `attendance` insert/update flips them (`worked_on_leave = true`, `leave_counted = false`) the moment a same-day attendance row is created for that employee — no separate batch job needed for this part. |

## 2. System Architecture

```
┌─────────────────────────┐        ┌───────────────────────────┐
│  Next.js (App Router)    │        │  Supabase Postgres          │
│  - Employee & Admin UI   │  HTTPS │  - RLS-protected tables     │
│  - Server Actions / Route│◄──────►│  - SECURITY DEFINER RPCs    │
│    Handlers (server-only │        │    for check-in/out, QR,    │
│    Supabase client with  │        │    leave counting, corrections
│    service-role key)     │        │  - pg_cron for day close-out│
└───────────┬──────────────┘        └───────────────────────────┘
            │
            │ Capacitor bridge (Android build only)
            ▼
┌─────────────────────────┐
│  Native Wi-Fi plugin      │
│  (reads real SSID/BSSID,  │
│   signs a short-lived     │
│   attestation the server   │
│   verifies)                │
└─────────────────────────┘
```

Key principles:

- **Nothing that affects pay or compliance is computed on the client.** Working minutes, overtime, lateness, weekly-off/leave classification, QR validity, and Wi-Fi validity are all decided inside Postgres functions (`SECURITY DEFINER`) invoked via RPC, never trusted from request bodies.
- **RLS is the last line of defense, not the only one.** Every table has RLS enabled; in addition, all writes that matter (check-in, check-out, attendance edits, leave assignment, WFH approval) go through RPC functions that re-check authorization internally, so a compromised or buggy RLS policy alone can't leak a write path.
- **History is append-only.** Schedules, weekly-offs, and attendance edits are never overwritten — new effective-dated rows or new log rows are inserted instead.
- **The frontend is structured for later Capacitor wrapping**: all attendance actions go through a thin `services/attendance.ts` client abstraction; the only piece that changes between the web build and the Android build is which `WifiVerificationProvider` implementation gets injected.

## 3. Entity-Relationship Summary

```
auth.users (Supabase managed)
   │ 1:1
   ▼
profiles ──────────────────────────────┐
   │ 1:1                                │ (admin actor references)
   ▼                                    │
employees                               │
   │ 1:N                                │
   ├── employee_schedules  (effective-dated) ◄── created_by → profiles
   ├── weekly_off_schedules (effective-dated) ◄── created_by → profiles
   ├── employee_leaves                        ◄── created_by → profiles
   ├── wfh_requests                            ◄── approved_by → profiles
   └── attendance ──1:N── attendance_edit_logs ◄── edited_by → profiles
              │
              ├── references office_qr_tokens (check-in / check-out token used)
              └── references wfh_requests (when attendance_type = WORK_FROM_HOME)

office_qr_tokens   (standalone, admin-generated, short-lived)
office_settings    (singleton config row: timezone, wifi allowlist, QR ttl, break/OT defaults)
```

Relationship notes:
- `profiles` mirrors `auth.users` 1:1 and carries `role` (`ADMIN`/`EMPLOYEE`) plus identity fields — this is what RLS policies check against, so it must never be writable by the employee themselves except for non-sensitive fields (e.g. avatar).
- `employees` extends `profiles` with employment data. Split from `profiles` so that "is this person an employee at all, with a code/department" is distinct from "is this person a registered auth user" (keeps room for future roles without touching employment data).
- `employee_schedules` and `weekly_off_schedules` are **versioned** — a given attendance row stores a **snapshot** of the schedule that applied on that date (`scheduled_start`, `scheduled_end`, `required_minutes_snapshot`, `break_minutes_snapshot`) so that later schedule changes never retroactively alter historical attendance, even though the row also keeps a nullable FK back to the schedule version for traceability.
- `attendance_edit_logs` has no FK-cascade delete from `attendance`; audit rows must survive even if attendance rows were ever hard-deleted (they shouldn't be, but the log is defensive).

Full SQL follows in `supabase/migrations/`.
