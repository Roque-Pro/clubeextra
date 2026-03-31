-- ============================================
-- FIX: Habilitar DELETE de veículos do cliente
-- Execute este script no Console SQL do Supabase
-- ============================================

-- 1. Habilitar RLS na tabela
ALTER TABLE public.client_vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON public.client_vehicles;

-- 3. Criar função has_role se não existir
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. SELECT - usuários veem seus próprios veículos OU admins veem todos
CREATE POLICY "Users can view their own vehicles"
  ON public.client_vehicles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- 5. INSERT - usuários adicionam veículos apenas para suas contas
CREATE POLICY "Users can insert their own vehicles"
  ON public.client_vehicles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- 6. UPDATE - usuários atualizam apenas seus veículos
CREATE POLICY "Users can update their own vehicles"
  ON public.client_vehicles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- 7. DELETE - ISTO VAI CORRIGIR O PROBLEMA
CREATE POLICY "Users can delete their own vehicles"
  ON public.client_vehicles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- 8. Admins podem gerenciar todos os veículos
CREATE POLICY "Admins can manage all vehicles"
  ON public.client_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. Criar índices para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_client_vehicles_client_id ON public.client_vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_vehicles_is_primary ON public.client_vehicles(is_primary);
