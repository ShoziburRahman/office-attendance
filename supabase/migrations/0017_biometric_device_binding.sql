-- ============================================================================
-- 0017_biometric_device_binding.sql
-- Implements secure device binding and biometric challenge-response system.
-- ============================================================================

-- 1. Employee Devices Table
-- Stores the public key and registration status for the one authorized device.
create table public.employee_devices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  public_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  device_name text,
  device_model text,
  platform text default 'android',
  app_version text,
  registered_at timestamptz default now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  last_authenticated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Enforce one active/pending device per employee.
  -- We use a partial unique index to allow multiple REVOKED devices but only one not-revoked.
  constraint uk_employee_active_device unique (employee_id)
);

-- Re-evaluating the unique constraint: if we want to allow only one active/pending device,
-- we should use a partial index instead of a table constraint.
alter table public.employee_devices drop constraint uk_employee_active_device;
create unique index ux_employee_active_device on public.employee_devices (employee_id)
where (status in ('PENDING', 'APPROVED'));

-- 2. Biometric Challenges Table
-- Stores short-lived nonces for the challenge-response flow.
create table public.biometric_challenges (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  device_id uuid not null references public.employee_devices(id) on delete cascade,
  challenge text not null,
  action text not null check (action in ('CHECK_IN', 'CHECK_OUT')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

-- 3. RLS Policies
alter table public.employee_devices enable row level security;
alter table public.biometric_challenges enable row level security;

-- Employees can view their own device status
create policy "Employees can view own device"
  on public.employee_devices for select
  using (auth.uid() = employee_id);

-- Employees can request registration (insert)
create policy "Employees can request device registration"
  on public.employee_devices for insert
  with check (auth.uid() = employee_id);

-- Admins can manage all devices
create policy "Admins can manage all devices"
  on public.employee_devices for all
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );

-- Employees can view their own challenges
create policy "Employees can view own challenges"
  on public.biometric_challenges for select
  using (auth.uid() = employee_id);

-- Only server-side (via service role) should insert/update challenges.
-- Since we are using Server Actions, they run as service role if configured,
-- or we can create a specific RPC for it.
-- For now, we'll keep it strict.
create policy "Admins can manage challenges"
  on public.biometric_challenges for all
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );

-- 4. Helper Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_employee_devices_updated_at
  before update on public.employee_devices
  for each row execute function public.handle_updated_at();
