# Setup de Fotos de Veículos

## Resumo das Alterações

O sistema agora exige que os usuários façam upload obrigatório de foto ao cadastrar um novo veículo.

## Banco de Dados

### 1. Executar SQL no Supabase (Console SQL)

```sql
-- Adicionar coluna de foto ao client_vehicles
ALTER TABLE public.client_vehicles
ADD COLUMN vehicle_photo_url text;
```

## Supabase Storage

### 2. Criar Bucket de Armazenamento

No console do Supabase, ir para **Storage** > **Create New Bucket**:

- **Name**: `vehicle-photos`
- **Privacy**: `Public` (para acessar URLs públicas)
- **File size limit**: 5 MB (ou mais, conforme preferência)

### 3. Políticas de RLS (Row Level Security)

Adicionar a seguinte política no bucket `vehicle-photos`:

```sql
-- Permitir apenas leitura pública (qualquer pessoa pode visualizar)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicle-photos');

-- Permitir usuários autenticados fazer upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-photos' 
  AND auth.role() = 'authenticated'
);

-- Permitir usuários deletar apenas suas próprias fotos
CREATE POLICY "User Delete Own Files" ON storage.objects FOR DELETE
USING (
  bucket_id = 'vehicle-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Frontend - ClientDashboard.tsx

### Alterações Implementadas:

1. **Upload de Foto Obrigatório**
   - Campo de foto com drag-and-drop
   - Preview da imagem selecionada
   - Validação: tipo (apenas imagens) e tamanho (máx 5MB)

2. **Funções Adicionadas:**
   - `handleVehiclePhotoChange()`: Valida e cria preview da imagem
   - `uploadVehiclePhoto()`: Faz upload da foto no Supabase Storage
   - Modifica `handleConfirmAddVehicle()`: Agora faz upload antes de salvar no BD

3. **UI/UX:**
   - Drop zone com ícone intuitivo
   - Preview da imagem selecionada
   - Botão para remover foto selecionada
   - Foto exibida na lista de veículos (thumbnail)

## Fluxo de Cadastro

```
1. Usuário clica em "Adicionar Veículo"
2. Dialog abre com 3 campos:
   - Veículo (marca e modelo)
   - Placa
   - Foto do Veículo (OBRIGATÓRIO)
3. Usuário seleciona foto (máx 5MB)
4. Clica "Verificar com IA" para validar veículo
5. Se validação OK, clica "Confirmar e Adicionar"
6. Sistema faz upload da foto no Storage
7. Se upload OK, salva na BD com URL da foto
8. Veículo aparece na lista com thumbnail
```

## Estrutura de Armazenamento

As fotos são organizadas por cliente:
```
vehicle-photos/
├── client-id-1/
│   ├── ABC-1234_1234567890.jpg
│   └── XYZ-5678_1234567891.png
├── client-id-2/
│   └── DEF-9012_1234567892.jpg
```

## Testes

Para testar:

1. Login como cliente
2. Ir para dashboard do cliente
3. Clicar "Adicionar Veículo"
4. Tentar submeter SEM foto → erro "Foto do veículo é obrigatória"
5. Selecionar foto → preview aparece
6. Completar cadastro → foto é uploaded e thumbnail aparece na lista

## Rollback (Se Necessário)

Para reverter as alterações:

```sql
-- Remover coluna de fotos
ALTER TABLE public.client_vehicles
DROP COLUMN vehicle_photo_url;
```

E deletar o bucket `vehicle-photos` no Supabase Console.
