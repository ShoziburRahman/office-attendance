-- Create Salary Calculations Table
CREATE TABLE public.salary_calculations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  year int NOT NULL,

  -- Earnings
  basic_salary numeric(12, 2) NOT NULL DEFAULT 0,
  overtime_hours numeric(5, 2) NOT NULL DEFAULT 0,
  overtime_rate numeric(12, 2) NOT NULL DEFAULT 0,
  overtime_amount numeric(12, 2) NOT NULL DEFAULT 0,
  other_earnings numeric(12, 2) NOT NULL DEFAULT 0,

  -- Attendance / Leave Snapshot
  salary_days int NOT NULL DEFAULT 30,
  working_days int NOT NULL DEFAULT 0,
  present_days int NOT NULL DEFAULT 0,
  paid_leave int NOT NULL DEFAULT 0,
  unpaid_leave int NOT NULL DEFAULT 0,

  -- Deductions
  unpaid_leave_deduction numeric(12, 2) NOT NULL DEFAULT 0,
  penalty_amount numeric(12, 2) NOT NULL DEFAULT 0,
  penalty_reason text,
  other_deductions numeric(12, 2) NOT NULL DEFAULT 0,

  -- Totals
  gross_salary numeric(12, 2) NOT NULL DEFAULT 0,
  total_deductions numeric(12, 2) NOT NULL DEFAULT 0,
  net_salary numeric(12, 2) NOT NULL DEFAULT 0,

  -- Metadata
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),

  -- Ensure one salary record per employee per month per year
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE public.salary_calculations ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins have full access to salary calculations"
  ON public.salary_calculations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Employees can view their own salary calculations (read-only)
CREATE POLICY "Employees can view their own salary calculations"
  ON public.salary_calculations
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());
