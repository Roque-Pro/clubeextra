-- Add cooperative fields to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_cooperative BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS value_per_car NUMERIC DEFAULT 0;
