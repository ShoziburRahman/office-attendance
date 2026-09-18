-- ============================================================================
-- 0022_add_base_salary_to_employees.sql
-- Adds base_salary to the employees table for default payroll calculations.
-- ============================================================================

alter table employees
add column base_salary numeric(12, 2) check (base_salary >= 0);

comment on column employees.base_salary is 'The default monthly base salary for the employee.';
