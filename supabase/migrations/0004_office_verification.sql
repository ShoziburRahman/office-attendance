-- ============================================================================
-- 0004_office_verification.sql
-- Transition to Fixed QR, GPS Geofencing, and enhanced verification records.
-- ============================================================================

-- 1. Update Office Settings
alter table office_settings
  add column office_latitude numeric,
  add column office_longitude numeric,
  add column allowed_radius int,
  add column location_accuracy_threshold int default 100,
  add column fixed_qr_token text;

-- 2. Update Attendance Record for verification details
alter table attendance
  add column latitude numeric,
  add column longitude numeric,
  add column location_accuracy numeric,
  add column location_verified boolean default false,
  add column qr_verified boolean default false,
  add column wifi_verified boolean default false;

-- 3. (Optional) Migration of old data: mark old check-ins as verified
update attendance set
  qr_verified = (check_in_qr_token_id is not null),
  wifi_verified = check_in_wifi_verified
where check_out_at is null or check_out_at is not null;

-- 4. Remove old dynamic QR requirement from constraints if needed
-- The original constraint was:
-- constraint chk_office_requires_qr_and_wifi check (
--   attendance_type <> 'OFFICE' or (check_in_wifi_verified and check_in_qr_token_id is not null)
-- )
-- We replace it with a more general verification check.

alter table attendance drop constraint chk_office_requires_qr_and_wifi;

alter table attendance add constraint chk_office_verification_required check (
  attendance_type <> 'OFFICE' or (qr_verified and wifi_verified and location_verified)
);
