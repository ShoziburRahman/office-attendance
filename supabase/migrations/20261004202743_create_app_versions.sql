CREATE TABLE IF NOT EXISTS public.app_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code int4 NOT NULL,
    version_name text NOT NULL,
    apk_url text NOT NULL,
    release_notes text,
    force_update boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Ensure version_code is unique to prevent duplicate versions
ALTER TABLE public.app_versions ADD CONSTRAINT app_versions_version_code_key UNIQUE (version_code);

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Public read access so the app can check for updates
CREATE POLICY "Allow public read access for app versions" 
ON public.app_versions FOR SELECT 
USING (true);

-- Admin only write access
CREATE POLICY "Allow admin full access to app versions" 
ON public.app_versions FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);
