-- Create leave_audit_logs table
CREATE TABLE public.leave_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_leave_id UUID NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins have full access to leave_audit_logs"
ON public.leave_audit_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);
