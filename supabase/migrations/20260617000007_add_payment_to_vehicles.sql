-- Add payment fields to client_vehicles to link plans to specific vehicles
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS plan_active boolean DEFAULT false;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS plan_start date;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS plan_end date;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS plan_paid_at timestamp with time zone;
