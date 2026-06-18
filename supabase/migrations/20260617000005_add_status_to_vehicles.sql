-- Adiciona status para veículos do cliente
ALTER TABLE public.client_vehicles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Altera o padrão de plan_active para falso em novos clientes
ALTER TABLE public.clients ALTER COLUMN plan_active SET DEFAULT false;

-- Resetar todos os perfis para pendente (exigir nova vistoria)
UPDATE public.profiles SET status = 'pending';

-- Resetar todos os veículos para pendente
UPDATE public.client_vehicles SET status = 'pending';

-- Desativar planos de todos (exigir novo pagamento)
UPDATE public.clients SET plan_active = false;

-- Garante que o status do perfil também é usado
COMMENT ON COLUMN public.profiles.status IS 'pending, approved, rejected';
