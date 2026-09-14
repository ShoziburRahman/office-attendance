# Addendum: Multiple Attendance Sessions Per Day

This supersedes the "one attendance row per employee per calendar day" assumption
from `01-architecture-and-analysis.md` §1 item 6. That row is now historical —
here is the replacement design.

## Three-level permission model (as specified)

| Level | Who | Scope | Where it lives |
|-------|-----|-------|-----------------|
| 1 | Every employee | One session per calendar day, always allowed | Default behavior, no table needed |
| 2 | Any employee, per admin approval | Exactly one extra session, one specific date, single-use | `additional_attendance_requests` |
| 3 | Employees the admin has flagged | Unlimited extra sessions per day, standing permission | `employees.allow_multiple_sessions` |

`fn_check_in` evaluates these in order every time an employee who has already
completed a session that day tries to check in again: Level 3 first (no lookup
needed beyond the employee row), then Level 2 (an approved, unused request for
that exact date), otherwise it rejects with a specific error code
(`ADDITIONAL_ATTENDANCE_APPROVAL_REQUIRED`) that the frontend uses to show the
**Request Additional Check In** button instead of a generic error.

## Schema changes

- `attendance` gains `session_number` (starts at 1), `verification_method`, and
  `additional_session_approval_id`. The uniqueness constraint changed from
  `UNIQUE(employee_id, attendance_date)` to
  `UNIQUE(employee_id, attendance_date, session_number)`, exactly as specified.
- The **one-active-session-at-a-time** rule is unchanged and still enforced
  globally per employee (`uq_attendance_one_active_session`), regardless of
  `allow_multiple_sessions` — an employee can never have two open sessions
  simultaneously, only sequential ones.
- `additional_attendance_requests` is a distinct table from `wfh_requests`,
  as required — a WFH approval never implies multi-session permission, and
  vice versa. Its own partial unique index (`uq_additional_attendance_live_request`)
  prevents an employee from having two live (pending, or approved-and-unused)
  requests for the same date, mirroring the WFH pattern without merging the two
  concepts.
- `used` / `used_at` / `allowed_session_number` on the request row are only ever
  written inside `fn_check_in` at the moment the extra session is actually
  created — a request being "approved" is necessary but not sufficient; it's
  only consumed on successful use, so an admin can approve ahead of time
  without it silently expiring or being usable twice.

## One design decision worth flagging

The spec's suggested `additional_attendance_permission` field list didn't
specify uniqueness rules for concurrent requests. I added
`uq_additional_attendance_live_request` (partial unique index) so an employee
can't spam multiple pending requests for the same date — if you'd rather allow
that (e.g. to let them resubmit with a different reason before the first is
decided), tell me and I'll relax it to allow multiple `PENDING` rows and have
the admin dashboard just show the most recent one.

## Everything else from Phase 1 is unaffected

Check-in/out confirmation flow, the 4-hour lock, the 12-hour window,
Wi-Fi+QR requirement for OFFICE sessions, WFH approval requirement, late
calculation, weekly-off/leave classification, and the admin correction +
audit-log flow all apply **per session**, independently, exactly as before —
`fn_check_out` already operated on a specific `attendance_id`, so it required
no changes.
