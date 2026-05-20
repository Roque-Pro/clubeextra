-- Adiciona coluna para motivo de recusa na vistoria
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS rejection_reason text;
