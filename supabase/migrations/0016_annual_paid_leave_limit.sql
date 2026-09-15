-- ============================================================================
-- 0016_annual_paid_leave_limit.sql
-- Implements global annual paid leave limit tracking.
-- ============================================================================

alter table public.office_settings
add column annual_paid_leave_limit int not null default 10;
