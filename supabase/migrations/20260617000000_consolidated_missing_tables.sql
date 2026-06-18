-- Consolidated Migration to Fix Schema based on ia.txt
-- This script creates missing tables and adds missing columns to existing tables.

-- 1. STORES (needed for sales and services)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stores_pkey PRIMARY KEY (id)
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  hire_date date NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sales_count integer DEFAULT 0,
  attendance_count integer DEFAULT 0,
  installations_count integer DEFAULT 0,
  store_name character varying,
  commission_percentage numeric DEFAULT 0.00,
  commission_type text DEFAULT 'percentual'::text,
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on employees" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  price numeric NOT NULL,
  supplier text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cost_price numeric DEFAULT 0,
  store text NOT NULL DEFAULT 'Loja 1'::text,
  code text,
  description text,
  is_prime boolean DEFAULT false,
  sale_price numeric,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. SALES
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  sale_type text NOT NULL DEFAULT 'pontual'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  payment_method character varying DEFAULT 'dinheiro'::character varying,
  store_name character varying DEFAULT 'Iguaçu Auto Vidros'::character varying,
  store_contact character varying DEFAULT '(45) 9999-9999'::character varying,
  store_address character varying DEFAULT 'Endereço da loja, Cidade - Estado'::character varying,
  quantity integer,
  unit_price numeric,
  sale_date timestamp with time zone DEFAULT now(),
  employee_id uuid REFERENCES public.employees(id),
  employee_name text,
  cost_value numeric,
  is_prime boolean DEFAULT false,
  prime_commission numeric,
  commission_type text DEFAULT 'percentual'::text,
  commission_value numeric DEFAULT 1,
  calculated_commission numeric,
  store_id uuid REFERENCES public.stores(id),
  main_seller_id uuid REFERENCES public.employees(id),
  main_seller_name text,
  main_seller_commission_percentage numeric DEFAULT 0,
  CONSTRAINT sales_pkey PRIMARY KEY (id)
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on sales" ON public.sales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. REPLACEMENTS
CREATE TABLE IF NOT EXISTS public.replacements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text NOT NULL,
  item text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  employee_name text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT replacements_pkey PRIMARY KEY (id)
);

ALTER TABLE public.replacements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on replacements" ON public.replacements FOR SELECT TO authenticated USING (true);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  expense_type text NOT NULL DEFAULT 'pontual'::text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  related_employee_id uuid REFERENCES public.employees(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all on expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. ASSETS
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_type text NOT NULL,
  value numeric NOT NULL,
  acquisition_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assets_pkey PRIMARY KEY (id)
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all on assets" ON public.assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. PRODUCT MOVEMENTS
CREATE TABLE IF NOT EXISTS public.product_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_movements_pkey PRIMARY KEY (id)
);

ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on product_movements" ON public.product_movements FOR SELECT TO authenticated USING (true);

-- 9. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text NOT NULL,
  vehicle text,
  plate text,
  service_type text NOT NULL,
  description text,
  value numeric DEFAULT 0,
  employee_id uuid REFERENCES public.employees(id),
  employee_name text,
  installations integer DEFAULT 0,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  notes text,
  store_id uuid REFERENCES public.stores(id),
  CONSTRAINT services_pkey PRIMARY KEY (id)
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on services" ON public.services FOR SELECT TO authenticated USING (true);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_name text NOT NULL,
  details text,
  user_email text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read on audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 11. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text NOT NULL,
  service_type text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time without time zone NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  vehicle_id uuid REFERENCES public.client_vehicles(id),
  original_scheduled_date date,
  original_scheduled_time time without time zone,
  time_changed_at timestamp with time zone,
  time_change_reason text,
  is_plan_replacement boolean DEFAULT false,
  payment_status text DEFAULT 'pending'::text,
  appointment_video_url text,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on appointments" ON public.appointments FOR SELECT TO authenticated USING (true);

-- 12. SALE PRODUCTS EMPLOYEES
CREATE TABLE IF NOT EXISTS public.sale_products_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  subtotal numeric NOT NULL CHECK (subtotal >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  employee_name text,
  commission_type text DEFAULT 'percentual'::text,
  commission_value numeric DEFAULT 0,
  CONSTRAINT sale_products_employees_pkey PRIMARY KEY (id)
);

ALTER TABLE public.sale_products_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on sale_products_employees" ON public.sale_products_employees FOR SELECT TO authenticated USING (true);

-- 13. PRODUCT DOCUMENTS
CREATE TABLE IF NOT EXISTS public.product_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  file_size integer,
  CONSTRAINT product_documents_pkey PRIMARY KEY (id)
);

ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read on product_documents" ON public.product_documents FOR SELECT TO authenticated USING (true);

-- 14. PLAN PAYMENTS
CREATE TABLE IF NOT EXISTS public.plan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL'::text,
  status text DEFAULT 'pending'::text,
  stripe_payment_id text,
  paid_at timestamp with time zone,
  payment_period_start date NOT NULL,
  payment_period_end date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plan_payments_pkey PRIMARY KEY (id)
);

ALTER TABLE public.plan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read on plan_payments" ON public.plan_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 15. UPDATING EXISTING TABLES (PROFILES & CLIENTS)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS store_name character varying DEFAULT 'IGUAÇU AUTO VIDROS SOM E ACESSÓRIOS'::character varying,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS cpf text;

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS plan_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'free'::text,
ADD COLUMN IF NOT EXISTS plan_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS bulk_upload_enabled boolean DEFAULT false;

-- 16. UPDATING CLIENT_VEHICLES
ALTER TABLE public.client_vehicles
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text,
ADD COLUMN IF NOT EXISTS photo_headlights_front_url text,
ADD COLUMN IF NOT EXISTS photo_headlights_rear_url text,
ADD COLUMN IF NOT EXISTS photo_mirrors_url text,
ADD COLUMN IF NOT EXISTS photo_interior_rear_url text,
ADD COLUMN IF NOT EXISTS photo_interior_front_url text,
ADD COLUMN IF NOT EXISTS photo_dashboard_url text,
ADD COLUMN IF NOT EXISTS photo_trunk_open_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS plan_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_start date,
ADD COLUMN IF NOT EXISTS plan_end date,
ADD COLUMN IF NOT EXISTS plan_paid_at timestamp with time zone;
