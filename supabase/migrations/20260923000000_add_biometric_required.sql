ALTER TABLE employees ADD COLUMN biometric_required BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN employees.biometric_required IS 'If false, biometric verification is skipped during check-in/out for this employee.';
