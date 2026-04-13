# Análise do Sistema Atual de Vendas e Comissões

## 📋 Estrutura Atual

### 1. **Paginas Principais**
- **SalesNew.tsx** - Página principal de vendas (mais atual)
- **Sales.tsx** - Versão anterior de vendas (ainda existe)
- **Financial.tsx** - Aba financeira (comissões, caixa, vendas, etc.)
- **AdminPanel.tsx** - Cadastro de funcionários com comissão padrão

### 2. **Fluxo Atual de Vendas (SalesNew.tsx)**

#### Estrutura de Dados:
```typescript
interface Employee {
    id: string;
    name: string;
    commission_percentage?: number;  // Comissão padrão do funcionário
}

interface SaleItemEmployee {
    employee_id: string;
    employee_name: string;
    commission_type: string;        // "percentual" ou "fixo"
    commission_value: number;       // Valor em % ou R$
}

interface SaleItem {
    product_id: string;
    employees: SaleItemEmployee[];  // Array de colaboradores por produto
    quantity: number;
    unit_price?: number;
    product_name?: string;
}
```

#### Fluxo Atual:
1. **Seleção de Produto**: Usuário seleciona um produto
2. **Seleção de Colaborador por Produto**: Seleciona o colaborador responsável por aquele produto
3. **Comissão por Produto**: 
   - Puxado do cadastro do funcionário (linha 252): `commission_percentage = employee.commission_percentage || 1`
   - Tipo: sempre "percentual" (linha 257)
   - Valor: do cadastro (linha 258)
4. **Múltiplos colaboradores por produto**: Permite adicionar vários colaboradores no mesmo produto (linha 254-265)
5. **Armazenamento**: Tabela `sale_products_employees` (linha 344, 502)

### 3. **Cálculo de Comissão Atual (linhas 468-499)**

```
Para cada produto:
  Para cada colaborador no produto:
    subtotal = unit_price * quantity
    commission = commission_type === "percentual" 
                  ? (subtotal * commission_value) / 100
                  : commission_value
    totalCalculatedCommission += commission

Armazenar em Sales:
  - commission_type: "fixo"
  - commission_value: totalCalculatedCommission
  - calculated_commission: totalCalculatedCommission
```

### 4. **Cadastro de Funcionário (AdminPanel.tsx)**

Cada funcionário tem:
- `id`
- `name`
- `role`
- `salary`
- `commission_percentage` - Comissão padrão (1%, 2%, etc.)
- `active`

### 5. **Aba de Comissões/Vendas (Financial.tsx)**

Status: **Não localizada aba específica de comissões**
- Há aba de "vendas" mas não computação de comissões por funcionário
- Vendas são visualizadas mas sem breakdown de comissões por vendedor

---

## 🔴 Problemas Identificados (Scenario Atual)

1. **Sem seleção de vendedor principal**: Não há seleção de quem é o vendedor geral da venda
2. **Comissão fixa do colaborador**: Não pode ser sobrescrita por produto (já puxado do cadastro)
3. **Sem diferenciação de comissões**: Uma mesma pessoa não pode ter comissão diferente em produtos diferentes
4. **Sem aba consolidada de comissões**: Não há visualização clara das comissões por funcionário

---

## ✅ Cenário Solicitado (Nova Dinâmica)

### Seleção em 2 Momentos:

1. **Seleção 1 - Vendedor Principal (No topo da venda)**
   - Quem está fazendo a venda
   - Recebe comissão padrão (do cadastro)
   - Aplicável a TODA a venda

2. **Seleção 2 - Colaborador por Produto**
   - Colaborador responsável por aquele produto específico
   - **Permite sobrescrever a comissão** (% ou R$)
   - Pode ser diferente para cada produto

### Fluxo de Comissões Desejado:

```
Total Comissões Venda = 
  Comissão Vendedor Principal (sobre total da venda) +
  Comissão de cada Colaborador por Produto (com possível override)
```

### Campos Necessários:

Na tabela `sales`:
- `main_seller_id` - ID do vendedor principal
- `main_seller_name` - Nome do vendedor
- `main_seller_commission_percentage` - % padrão do vendedor

Na tabela `sale_products_employees`:
- `commission_type_override` - Se há override (True/False)
- `commission_value_original` - Comissão original do funcionário
- `commission_value_override` - Comissão customizada (se houver override)

---

## 📊 Impactos a Computar

### 1. **Na Venda**
- ✅ Armazenar vendedor principal
- ✅ Calcular comissão do vendedor principal
- ✅ Calcular comissões dos colaboradores (com override)
- ✅ Total de comissão = vendedor + colaboradores

### 2. **Nas Comissões (Financial.tsx)**
- [ ] Aba "Comissões" com breakdown por funcionário
- [ ] Mostrar comissões do vendedor principal
- [ ] Mostrar comissões como colaborador de produtos
- [ ] Total de comissão por funcionário (soma das duas)
- [ ] Filtro por período
- [ ] Detalhe de cada venda com comissão

### 3. **Em Movimentações**
- [ ] Log de auditoria das comissões
- [ ] Rastreabilidade de overrides

### 4. **Em Relatórios**
- [ ] Relatório de comissões por funcionário
- [ ] Relatório de comissões por período
- [ ] Comparativo: comissão default vs. realizada

---

## 🎯 Checklist de Implementação

- [ ] **UI - Página de Vendas (SalesNew.tsx)**
  - [ ] Adicionar seleção de "Vendedor Principal" no topo
  - [ ] Campos de override de comissão por colaborador/produto
  - [ ] Exibir comissão final de cada item

- [ ] **Lógica - Cálculo de Comissões**
  - [ ] Calcular comissão do vendedor principal
  - [ ] Permitir override de comissão por produto
  - [ ] Somar todas as comissões corretamente

- [ ] **Banco de Dados**
  - [ ] Adicionar campos em `sales` table
  - [ ] Adicionar campos em `sale_products_employees` table
  - [ ] Fazer migration

- [ ] **Financial.tsx**
  - [ ] Criar aba "Comissões"
  - [ ] Visualizar comissões por funcionário
  - [ ] Detalhar comissões de cada venda

- [ ] **AdminPanel.tsx**
  - [ ] Validar comissão padrão

---

## 🔑 Principais Tabelas/Interfaces a Modificar

1. `SalesNew.tsx` - Interface `SaleItem` e lógica
2. `Financial.tsx` - Adicionar aba de comissões
3. `AdminPanel.tsx` - Interface `Employee` e exibição
4. Database schema - `sales` e `sale_products_employees`
