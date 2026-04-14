-- SQL para adicionar commission_type à tabela employees
ALTER TABLE public.employees
ADD COLUMN commission_type text DEFAULT 'percentual'::text;

-- Para instaladores, use 'fixo', para vendedores use 'percentual'
-- Exemplo:
-- UPDATE public.employees SET commission_type = 'fixo' WHERE role = 'Instalador';
-- UPDATE public.employees SET commission_type = 'percentual' WHERE role = 'Vendedor';
