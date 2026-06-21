-- Adiciona colunas para 5 fotos de serviço na tabela public.replacements
ALTER TABLE public.replacements ADD COLUMN IF NOT EXISTS photo_url_1 text;
ALTER TABLE public.replacements ADD COLUMN IF NOT EXISTS photo_url_2 text;
ALTER TABLE public.replacements ADD COLUMN IF NOT EXISTS photo_url_3 text;
ALTER TABLE public.replacements ADD COLUMN IF NOT EXISTS photo_url_4 text;
ALTER TABLE public.replacements ADD COLUMN IF NOT EXISTS photo_url_5 text;

-- Adiciona colunas para 5 fotos de serviço na tabela public.services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url_1 text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url_2 text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url_3 text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url_4 text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS photo_url_5 text;
