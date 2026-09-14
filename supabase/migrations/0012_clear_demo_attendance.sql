-- ============================================================================
-- 0012_clear_demo_attendance.sql
-- Clears all attendance and requests to provide a clean slate for testing.
-- ============================================================================

-- Delete all attendance records
truncate table attendance cascade;

-- Delete all additional attendance requests
truncate table additional_attendance_requests cascade;

-- Delete all WFH requests
truncate table wfh_requests cascade;

-- Delete all QR tokens
truncate table office_qr_tokens cascade;
