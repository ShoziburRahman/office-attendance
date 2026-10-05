
-- 1. Ensure the 'apks' bucket exists (this is a helper, usually done in UI)
-- 2. Create RLS policies for the 'apks' bucket

-- Allow public read access to APKs (so employees can download them)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'apks');

-- Allow admins to upload/update/delete APKs
CREATE POLICY "Admin Full Access" 
ON storage.objects FOR ALL 
TO authenticated
USING (
  bucket_id = 'apks' 
  AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

