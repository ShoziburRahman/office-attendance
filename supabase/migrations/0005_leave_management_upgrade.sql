-- Create leave_types table
CREATE TABLE public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    deducts_annual_balance BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add columns to employee_leaves
ALTER TABLE public.employee_leaves
ADD COLUMN leave_type_id UUID REFERENCES public.leave_types(id),
ADD COLUMN snapshot_is_paid BOOLEAN,
ADD COLUMN snapshot_deducts_balance BOOLEAN;

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- Admins have full access to leave_types
CREATE POLICY "Admins have full access to leave_types"
ON public.leave_types
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);

-- Employees can view active leave types
CREATE POLICY "Employees can view active leave_types"
ON public.leave_types
FOR SELECT
TO authenticated
USING (is_active = true);

-- Seed default leave types
INSERT INTO public.leave_types (name, is_paid, deducts_annual_balance)
VALUES
('General Paid Leave', true, true),
('General Unpaid Leave', false, false);

-- Migration script to update existing leaves
-- This should be run as a one-time operation.
-- We use a temporary function or just a set of updates.
DO $$
DECLARE
    paid_type_id UUID;
    unpaid_type_id UUID;
BEGIN
    SELECT id INTO paid_type_id FROM public.leave_types WHERE name = 'General Paid Leave';
    SELECT id INTO unpaid_type_id FROM public.leave_types WHERE name = 'General Unpaid Leave';

    UPDATE public.employee_leaves
    SET
        leave_type_id = CASE WHEN leave_type = 'PAID' THEN paid_type_id ELSE unpaid_type_id END,
        snapshot_is_paid = CASE WHEN leave_type = 'PAID' THEN true ELSE false END,
        snapshot_deducts_balance = CASE WHEN leave_type = 'PAID' THEN true ELSE false END
    WHERE leave_type_id IS NULL;
END $$;
