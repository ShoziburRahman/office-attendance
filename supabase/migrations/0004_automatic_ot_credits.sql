-- Create automatic_ot_credits table to track monthly weekend entitlement adjustments
CREATE TABLE public.automatic_ot_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    entitlement INTEGER NOT NULL,
    actual_offs INTEGER NOT NULL,
    ot_credit_days INTEGER DEFAULT 0,
    excess_offs INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_employee_month_year UNIQUE (employee_id, month, year)
);

-- Enable RLS
ALTER TABLE public.automatic_ot_credits ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to automatic_ot_credits"
ON public.automatic_ot_credits
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);

-- Employees can only view their own credits
CREATE POLICY "Employees can view own automatic_ot_credits"
ON public.automatic_ot_credits
FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT id FROM public.employees WHERE id = auth.uid() -- This assumes auth.uid() is the employee id
    )
);

-- Note: In this app, auth.uid() usually matches profile.id.
-- The mapping from profile.id to employee.id needs to be correct.
-- If profile.id != employee.id, the policy above should be adjusted.
