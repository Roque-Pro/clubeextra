# Fix: Botão de Excluir Veículo não Funciona

## Problema
No painel do cliente, o botão de excluir veículo mostra mensagem de sucesso, mas o veículo não é deletado do banco de dados.

## Causa Raiz
A tabela `client_vehicles` não possui políticas RLS (Row Level Security) configuradas corretamente para permitir que clientes deletem seus próprios veículos. Sem as políticas corretas, a operação DELETE é bloqueada silenciosamente pelo Supabase.

## Solução

### 1. Executar a Migração SQL

No console SQL do Supabase, execute:

```bash
# Copie e cole todo o conteúdo do arquivo:
# supabase/migrations/20260330_create_client_vehicles_table.sql
```

Ou execute esta versão simplificada:

```sql
-- Habilitar RLS
ALTER TABLE public.client_vehicles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON public.client_vehicles;

-- Política de SELECT: usuários veem seus próprios veículos OU admins veem todos
CREATE POLICY "Users can view their own vehicles"
  ON public.client_vehicles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Política de INSERT: usuários adicionam veículos apenas para suas contas
CREATE POLICY "Users can insert their own vehicles"
  ON public.client_vehicles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Política de UPDATE: usuários atualizam apenas seus veículos
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

-- Política de DELETE: usuários deletam apenas seus veículos
CREATE POLICY "Users can delete their own vehicles"
  ON public.client_vehicles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Política de ADMIN: admins podem gerenciar todos os veículos
CREATE POLICY "Admins can manage all vehicles"
  ON public.client_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
```

### 2. Verificar a Função `has_role`

Verifique se a função `has_role` existe no seu banco:

```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'has_role';
```

Se não existir, crie-a:

```sql
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
```

### 3. Criar Índices (Opcional mas Recomendado)

```sql
CREATE INDEX IF NOT EXISTS idx_client_vehicles_client_id ON public.client_vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_vehicles_is_primary ON public.client_vehicles(is_primary);
```

## Mudanças no Código Frontend

Foram adicionados logs detalhados na função `handleDeleteVehicle` do `ClientDashboard.tsx` para ajudar a diagnosticar problemas:

- `console.log("Deletando veículo:", vehicleId)` - Mostra qual veículo está sendo deletado
- `console.log("Resultado da deleção - Error:", error, "Count:", count)` - Mostra se a deleção foi bem-sucedida
- Melhor tratamento de erros com mensagem mais informativa

## Como Testar

1. **Abra o Developer Tools (F12)** no navegador
2. **Vá para a aba Console**
3. **Faça login como cliente**
4. **Vá para o painel e tente deletar um veículo**
5. **Observe os logs no console:**
   - Se vir `Resultado da deleção - Error: null, Count: 1` → Deleção bem-sucedida
   - Se vir `Resultado da deleção - Error: {...}, Count: null` → Erro de permissão RLS
   - Se a operação nem atingir o banco → Problema de política RLS

## Checklist de Resolução

- [ ] Executar SQL de configuração de RLS no Supabase
- [ ] Verificar se `has_role` função existe
- [ ] Verificar se `user_roles` tabela tem os dados corretos
- [ ] Testar deleção com Developer Tools aberto
- [ ] Confirmar que veículo foi deletado do banco

## Se ainda não funcionar

1. Verifique se o cliente tem um `user_id` associado na tabela `clients`
2. Verifique se existe um registro na tabela `user_roles` com role='admin' para seu usuário teste
3. Verifique os logs de erro detalhados no console do navegador
4. Consulte os logs do Supabase em: https://app.supabase.io → Projeto → Logs
