-- Migration to add more photo fields to client_vehicles
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_headlights_front_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_headlights_rear_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_mirrors_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_interior_rear_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_interior_front_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_dashboard_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_trunk_open_url text;
