-- ============================================================================
-- 0001_schema.sql
-- Office Attendance & Employee Management — core schema
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";   -- needed for EXCLUDE constraints on ranges + equality

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('ADMIN', 'EMPLOYEE');

create type attendance_type as enum ('OFFICE', 'WORK_FROM_HOME');

-- Session lifecycle only. Never mixed with day classification or attendance type.
create type attendance_state as enum (
  'CHECKED_IN',        -- checked in, not yet checked out, within the 12h window
  'CHECKED_OUT',        -- completed normally
  'INCOMPLETE',          -- 12h window expired without checkout, awaiting admin review
  'MISSING_CHECK_OUT'  -- admin has reviewed and confirmed a checkout is genuinely missing
                          -- (INCOMPLETE is the system-detected state; MISSING_CHECK_OUT is
                          --  the admin-acknowledged state prior to correction)
);

-- What kind of day this was, independent of whether/how the employee attended.
create type day_classification as enum (
  'NORMAL_WORKING_DAY',
  'WEEKLY_OFF',
  'PAID_LEAVE',
  'UNPAID_LEAVE',
  'ABSENT'
);

create type leave_type as enum ('PAID', 'UNPAID');

create type wfh_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

create type qr_token_status as enum ('ACTIVE', 'USED', 'EXPIRED');

create type additional_attendance_status as enum ('PENDING', 'APPROVED', 'REJECTED');

-- How a given session's identity/location was established. Kept separate from
-- attendance_type so reports can distinguish "how we know this was really them"
-- from "office vs WFH".
create type verification_method as enum ('WIFI_AND_QR', 'WFH_APPROVAL', 'ADMIN_MANUAL_ENTRY');

-- ============================================================================
-- OFFICE SETTINGS (singleton configuration row)
-- ============================================================================

create table office_settings (
  id                      boolean primary key default true constraint office_settings_singleton check (id = true),
  office_timezone         text not null default 'Asia/Dhaka',
  default_required_minutes int not null default 480,
  default_break_minutes    int not null default 30,
  min_minutes_before_checkout int not null default 240,  -- 4 hours
  max_session_minutes      int not null default 720,     -- 12 hours
  qr_token_ttl_seconds      int not null default 45 check (qr_token_ttl_seconds between 15 and 120),
  office_wifi_ssids         text[] not null default '{}',   -- allowlisted SSIDs
  office_wifi_bssids        text[] not null default '{}',   -- allowlisted BSSIDs (preferred; harder to spoof than SSID)
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

insert into office_settings (id) values (true);

-- ============================================================================
-- PROFILES  (1:1 with auth.users)
-- ============================================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'EMPLOYEE',
  full_name     text not null,
  email         text not null,
  phone         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- ============================================================================
-- EMPLOYEES (extends profiles with employment data)
-- ============================================================================

create table employees (
  id              uuid primary key references profiles(id) on delete cascade,
  employee_code   text not null unique,
  department      text not null,
  position        text not null,
  joining_date    date not null,
  is_active       boolean not null default true,
  deactivated_at  timestamptz,
  -- LEVEL 3 permission (see docs §addendum): admin-granted standing permission
  -- to have more than one attendance session on the same calendar day, with
  -- no per-date approval needed. Default NO per spec.
  allow_multiple_sessions boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_employee_code_format check (employee_code ~ '^[A-Za-z0-9_-]{2,32}$')
);

create index idx_employees_is_active on employees(is_active);
create index idx_employees_department on employees(department);

-- ============================================================================
-- EMPLOYEE SCHEDULES (effective-dated, non-overlapping per employee)
-- ============================================================================

create table employee_schedules (
  id                  uuid primary key default uuid_generate_v4(),
  employee_id         uuid not null references employees(id) on delete cascade,
  start_time          time not null,
  end_time            time not null,
  required_minutes    int not null default 480 check (required_minutes > 0),
  break_minutes       int not null default 30 check (break_minutes >= 0),
  effective_from      date not null,
  effective_until     date,  -- null = open-ended / currently active
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now(),
  constraint chk_schedule_dates check (effective_until is null or effective_until >= effective_from),
  -- prevent overlapping schedule ranges for the same employee
  constraint excl_schedule_overlap exclude using gist (
    employee_id with =,
    daterange(effective_from, coalesce(effective_until, 'infinity'::date), '[]') with &&
  )
);

create index idx_employee_schedules_employee on employee_schedules(employee_id, effective_from desc);

-- ============================================================================
-- WEEKLY OFF SCHEDULES (effective-dated, non-overlapping per employee)
-- ============================================================================

create table weekly_off_schedules (
  id                uuid primary key default uuid_generate_v4(),
  employee_id       uuid not null references employees(id) on delete cascade,
  day_of_week       smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  effective_from    date not null,
  effective_until   date,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  constraint chk_weekly_off_dates check (effective_until is null or effective_until >= effective_from),
  constraint excl_weekly_off_overlap exclude using gist (
    employee_id with =,
    daterange(effective_from, coalesce(effective_until, 'infinity'::date), '[]') with &&
  )
);

create index idx_weekly_off_employee on weekly_off_schedules(employee_id, effective_from desc);

-- ============================================================================
-- EMPLOYEE LEAVES
-- ============================================================================

create table employee_leaves (
  id                uuid primary key default uuid_generate_v4(),
  employee_id       uuid not null references employees(id) on delete cascade,
  leave_date        date not null,
  leave_type        leave_type not null,
  reason            text,
  notes             text,
  worked_on_leave   boolean not null default false,
  leave_counted     boolean not null default true,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (employee_id, leave_date)
);

create index idx_employee_leaves_employee_date on employee_leaves(employee_id, leave_date);

-- ============================================================================
-- WFH REQUESTS
-- ============================================================================

create table wfh_requests (
  id             uuid primary key default uuid_generate_v4(),
  employee_id    uuid not null references employees(id) on delete cascade,
  request_date   date not null,
  status         wfh_status not null default 'PENDING',
  reason         text,
  admin_notes    text,
  approved_by    uuid references profiles(id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Only one non-cancelled/rejected request per employee per date
create unique index uq_wfh_active_request
  on wfh_requests(employee_id, request_date)
  where status in ('PENDING', 'APPROVED');

create index idx_wfh_requests_status on wfh_requests(status);

-- ============================================================================
-- ADDITIONAL ATTENDANCE REQUESTS (LEVEL 2 permission: one extra session,
-- one specific date, one specific employee — separate concept from WFH)
-- ============================================================================

create table additional_attendance_requests (
  id                     uuid primary key default uuid_generate_v4(),
  employee_id            uuid not null references employees(id) on delete cascade,
  requested_date         date not null,
  reason                 text,
  status                 additional_attendance_status not null default 'PENDING',
  requested_at           timestamptz not null default now(),
  approved_by            uuid references profiles(id),
  approved_at            timestamptz,
  admin_notes            text,
  -- Which session number this approval unlocks (always "current completed
  -- sessions for that date + 1" at the moment of approval/consumption).
  allowed_session_number int,
  used                   boolean not null default false,
  used_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Only one live (pending or approved-but-unused) request per employee per date —
-- mirrors the WFH uniqueness pattern, kept as a fully separate table/concept.
create unique index uq_additional_attendance_live_request
  on additional_attendance_requests(employee_id, requested_date)
  where status = 'PENDING' or (status = 'APPROVED' and used = false);

create index idx_additional_attendance_status on additional_attendance_requests(status);

-- ============================================================================
-- OFFICE QR TOKENS
-- ============================================================================

create table office_qr_tokens (
  id           uuid primary key default uuid_generate_v4(),
  token        text not null unique,          -- opaque random token, high entropy
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  status       qr_token_status not null default 'ACTIVE',
  used_by      uuid references employees(id),
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_qr_tokens_status_expiry on office_qr_tokens(status, expires_at);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

create table attendance (
  id                        uuid primary key default uuid_generate_v4(),
  employee_id               uuid not null references employees(id) on delete cascade,
  attendance_date           date not null,
  -- 1 for an employee's first session that day, 2 for a second approved/permitted
  -- session, etc. See docs addendum for the three-level permission model that
  -- decides whether session_number > 1 is allowed.
  session_number            int not null default 1 check (session_number >= 1),
  attendance_type           attendance_type not null,
  verification_method       verification_method not null default 'WIFI_AND_QR',
  -- Set only when this session exists because of an approved additional-attendance
  -- request (LEVEL 2 permission). NULL for session_number = 1 and for LEVEL 3 employees.
  additional_session_approval_id uuid references additional_attendance_requests(id),

  check_in_at               timestamptz not null,
  check_out_at              timestamptz,

  -- Schedule snapshot at time of check-in — never recomputed from a later schedule version.
  schedule_id               uuid references employee_schedules(id),
  scheduled_start           time,
  scheduled_end             time,
  required_minutes_snapshot int,
  break_minutes_snapshot    int,

  day_classification        day_classification not null,
  attendance_state          attendance_state not null default 'CHECKED_IN',
  worked_on_weekly_off      boolean not null default false,

  -- Computed only once check_out_at is set. NULL means "not yet known", never 0.
  total_duration_minutes    int,
  working_minutes           int,
  regular_minutes           int,
  overtime_minutes          int,

  late_minutes              int not null default 0,
  is_late                   boolean not null default false,

  check_in_wifi_verified    boolean not null default false,
  check_in_qr_token_id      uuid references office_qr_tokens(id),
  check_out_wifi_verified   boolean,
  check_out_qr_token_id     uuid references office_qr_tokens(id),

  wfh_request_id            uuid references wfh_requests(id),

  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint chk_checkout_after_checkin check (check_out_at is null or check_out_at > check_in_at),
  constraint chk_office_requires_qr_and_wifi check (
    attendance_type <> 'OFFICE' or (check_in_wifi_verified and check_in_qr_token_id is not null)
  ),
  constraint chk_wfh_requires_approval_ref check (
    attendance_type <> 'WORK_FROM_HOME' or wfh_request_id is not null
  ),
  -- Multiple sessions per employee per day are supported (LEVEL 2/3 permissions);
  -- session_number disambiguates them. This replaces the earlier
  -- UNIQUE(employee_id, attendance_date) constraint — see docs addendum.
  unique (employee_id, attendance_date, session_number)
);

-- Only one active (not-yet-checked-out) session per employee, globally,
-- regardless of session_number — an employee can never have two open
-- sessions at once even if they're permitted multiple sessions per day.
create unique index uq_attendance_one_active_session
  on attendance(employee_id)
  where check_out_at is null;

create index idx_attendance_employee_date on attendance(employee_id, attendance_date desc);
create index idx_attendance_employee_date_session on attendance(employee_id, attendance_date, session_number);
create index idx_attendance_date on attendance(attendance_date);
create index idx_attendance_state on attendance(attendance_state);
create index idx_attendance_day_classification on attendance(day_classification);

-- ============================================================================
-- ATTENDANCE EDIT LOGS (append-only audit trail)
-- ============================================================================

create table attendance_edit_logs (
  id               uuid primary key default uuid_generate_v4(),
  attendance_id    uuid not null,   -- intentionally NOT cascading; audit must outlive the row
  field_name       text not null,
  old_value        text,
  new_value        text,
  edited_by        uuid not null references profiles(id),
  edited_at        timestamptz not null default now(),
  reason           text not null
);

create index idx_attendance_edit_logs_attendance on attendance_edit_logs(attendance_id, edited_at desc);

-- ============================================================================
-- updated_at maintenance trigger (generic, reused by several tables)
-- ============================================================================

create or replace function fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function fn_set_updated_at();
create trigger trg_employees_updated_at before update on employees
  for each row execute function fn_set_updated_at();
create trigger trg_employee_leaves_updated_at before update on employee_leaves
  for each row execute function fn_set_updated_at();
create trigger trg_wfh_requests_updated_at before update on wfh_requests
  for each row execute function fn_set_updated_at();
create trigger trg_attendance_updated_at before update on attendance
  for each row execute function fn_set_updated_at();
create trigger trg_office_settings_updated_at before update on office_settings
  for each row execute function fn_set_updated_at();
create trigger trg_additional_attendance_updated_at before update on additional_attendance_requests
  for each row execute function fn_set_updated_at();
