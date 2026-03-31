-- Adicionar coluna de foto ao client_vehicles
ALTER TABLE public.client_vehicles
ADD COLUMN vehicle_photo_url text;

-- Criar bucket no Storage se não existir (executar via console do Supabase)
-- Para isso, use a interface do Supabase: Storage > Create a new bucket > Escolha "vehicle-photos"

-- Comentário: A coluna vehicle_photo_url armazenará a URL pública da foto armazenada no bucket 'vehicle-photos'
