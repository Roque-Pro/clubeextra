-- Adicionar campos de comissão à tabela sale_products_employees
ALTER TABLE public.sale_products_employees
ADD COLUMN employee_name text,
ADD COLUMN commission_type text DEFAULT 'percentual'::text,
ADD COLUMN commission_value numeric DEFAULT 0;
