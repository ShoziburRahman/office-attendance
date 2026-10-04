-- Add late grace period to office settings
ALTER TABLE office_settings
ADD COLUMN late_grace_minutes integer DEFAULT 5;
