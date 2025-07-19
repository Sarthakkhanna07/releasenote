-- Add public_portal_url column to organizations
ALTER TABLE public.organizations
ADD COLUMN public_portal_url text; 