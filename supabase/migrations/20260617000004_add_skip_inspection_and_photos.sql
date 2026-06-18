-- Adiciona coluna para desativar exigência de vistoria/fotos por cliente
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS skip_inspection boolean DEFAULT false;

-- Adiciona colunas para as 4 fotos do veículo na tabela de veículos
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_front_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_back_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_left_url text;
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS photo_right_url text;
