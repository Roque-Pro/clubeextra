import { useState, useEffect } from "react";
import { Search, Plus, AlertTriangle, Barcode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FinancialAuthModal } from "@/components/FinancialAuthModal";
import { StoreCashBox } from "@/components/StoreCashBox";
import { Package } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  salary?: number;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  price: number;
  supplier: string;
  store?: string;
  cost_price?: number;
  code?: string;
  description?: string;
}

interface Asset {
  id: string;
  name: string;
  asset_type: "Imóvel" | "Veículo" | "Equipamento" | "Outro";
  value: number;
  acquisition_date?: string;
  notes?: string;
  created_at?: string;
}

const Financial = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"caixa" | "receitas" | "despesas" | "patrimonio" | "estoque" | "vendas" | "comissoes">("caixa");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: "", category: "Compra", amount: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [financialAuthOpen, setFinancialAuthOpen] = useState(true);
  const [financialAuthenticated, setFinancialAuthenticated] = useState(false);
  const [commissions, setCommissions] = useState<any[]>([]);

  // Verificar autenticação ao montar
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("financial_auth") === "true";
    setFinancialAuthenticated(isAuthenticated);
    if (!isAuthenticated) {
      setFinancialAuthOpen(true);
    } else {
      setFinancialAuthOpen(false);
    }
  }, []);

  // Limpar autenticação quando sair da página
  useEffect(() => {
    return () => {
      sessionStorage.removeItem("financial_auth");
      sessionStorage.removeItem("financial_auth_time");
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("hire_date", { ascending: false });

      if (error) throw error;
      if (data) {
        const mappedEmployees = data.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          salary: emp.salary,
          active: emp.active || true,
        }));
        setEmployees(mappedEmployees);
      }
    } catch (error: any) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar patrimônio:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar despesas:", error);
    }
  };

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sale_date", { ascending: false });

      if (error) throw error;
      setSales(data || []);
      
      // Calcular comissões
      if (data && data.length > 0) {
        const commissionsMap: Record<string, any> = {};
        
        for (const sale of data) {
          // Comissão do vendedor principal
          if (sale.main_seller_id) {
            if (!commissionsMap[sale.main_seller_id]) {
              commissionsMap[sale.main_seller_id] = {
                employee_id: sale.main_seller_id,
                employee_name: sale.main_seller_name || "Desconhecido",
                total_commission: 0,
                sales_details: [],
              };
            }
            
            const mainSellerComm = (sale.amount * (sale.main_seller_commission_percentage || 0)) / 100;
            commissionsMap[sale.main_seller_id].total_commission += mainSellerComm;
            commissionsMap[sale.main_seller_id].sales_details.push({
              sale_id: sale.id,
              sale_date: sale.sale_date,
              sale_amount: sale.amount,
              commission_type: "Vendedor Principal",
              commission_percentage: sale.main_seller_commission_percentage,
              commission_value: mainSellerComm,
            });
          }
        }
        
        // Comissões dos colaboradores por produto
        try {
          const { data: saleProducts, error: saleProductsError } = await supabase
            .from("sale_products_employees")
            .select("*");
          
          if (!saleProductsError && saleProducts) {
            for (const saleProduct of saleProducts) {
              if (saleProduct.employee_id) {
                if (!commissionsMap[saleProduct.employee_id]) {
                  commissionsMap[saleProduct.employee_id] = {
                    employee_id: saleProduct.employee_id,
                    employee_name: saleProduct.employee_name || "Desconhecido",
                    total_commission: 0,
                    sales_details: [],
                  };
                }
                
                const subtotal = saleProduct.subtotal || ((saleProduct.unit_price || 0) * saleProduct.quantity);
                const empComm = saleProduct.commission_type === "percentual" 
                  ? (subtotal * saleProduct.commission_value) / 100 
                  : saleProduct.commission_value;
                
                commissionsMap[saleProduct.employee_id].total_commission += empComm;
                
                const sale = data.find(s => s.id === saleProduct.sale_id);
                commissionsMap[saleProduct.employee_id].sales_details.push({
                  sale_id: saleProduct.sale_id,
                  sale_date: sale?.sale_date || new Date().toISOString(),
                  sale_amount: sale?.amount || 0,
                  commission_type: "Colaborador em Produto",
                  commission_percentage: saleProduct.commission_type === "percentual" ? saleProduct.commission_value : null,
                  commission_value: empComm,
                });
              }
            }
          }
        } catch (err) {
          console.error("Erro ao carregar comissões de colaboradores:", err);
        }
        
        setCommissions(Object.values(commissionsMap));
      }
    } catch (error: any) {
      console.error("Erro ao carregar vendas:", error);
    }
  };

  useEffect(() => {
    if (financialAuthenticated) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchEmployees(), fetchProducts(), fetchAssets(), fetchExpenses(), fetchSales()]);
        setLoading(false);
      };
      loadData();
    }
  }, [financialAuthenticated]);

  // Cálculos
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.quantity <= (p.min_quantity || 1));
  const mostStockedProduct = products.length > 0 ? [...products].sort((a, b) => b.quantity - a.quantity)[0] : null;
  const leastStockedProduct = products.length > 0 ? [...products].sort((a, b) => a.quantity - b.quantity)[0] : null;
  const mostValuableProducts = products
    .map(p => ({ ...p, totalValue: p.quantity * p.price }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 3);

  const topCategory = Object.entries(
    products.reduce((acc: Record<string, number>, p) => {
      acc[p.category] = (acc[p.category] || 0) + (p.quantity * p.price);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast({
        title: "Preencha os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        description: expenseForm.description,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        notes: expenseForm.notes,
        expense_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Despesa adicionada",
        description: "A despesa foi registrada com sucesso",
      });

      setExpenseForm({ description: "", category: "Compra", amount: "", notes: "" });
      setExpenseDialogOpen(false);
      await fetchExpenses();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({
        title: "Erro ao adicionar despesa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!financialAuthenticated) {
    return (
      <>
        <PageHeader 
          title="Financeiro" 
          description="Acesso restrito - Autenticação requerida"
        />
        <FinancialAuthModal
          isOpen={financialAuthOpen}
          onAuthSuccess={() => {
            setFinancialAuthOpen(false);
            setFinancialAuthenticated(true);
          }}
          onClose={() => {
            window.history.back();
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Financeiro" 
        description="Gestão financeira completa da empresa 🔒"
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      ) : (
        <>
          {/* FILTROS */}
          <div className="glass-card p-4 border border-border rounded-lg flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Período:</Label>
              <Select defaultValue="current_month">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Este Mês</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="current_year">Este Ano</SelectItem>
                  <SelectItem value="all_time">Todo o Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SEÇÃO DE RESUMO - CONSOLIDADO DO SISTEMA */}
          <div className="glass-card border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-foreground">📊 Resumo Consolidado do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total de Vendas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 rounded-lg border border-success/30 bg-gradient-to-br from-success/10 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">💰 Total de Vendas</p>
                    <p className="text-2xl font-bold text-success">R$ {(
                      sales.reduce((sum, s) => sum + (s.amount || 0), 0)
                    ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </motion.div>

              {/* Valor Total em Estoque */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-4 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">📦 Valor Total em Estoque</p>
                    <p className="text-2xl font-bold text-orange-500">R$ {totalInventoryValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </motion.div>

              {/* Top Categoria */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-4 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">🏆 Top Categoria</p>
                    <p className="text-lg font-bold text-foreground">{topCategory?.[0] || "—"}</p>
                    <p className="text-sm text-primary mt-1">R$ {topCategory?.[1]?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0"}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* KPI CARDS - RESUMO EXECUTIVO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Receitas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-lg border border-success/30 bg-gradient-to-br from-success/10 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">💰 Receitas</p>
                  <p className="text-2xl font-bold text-success">R$ {(
                    sales.reduce((sum, s) => sum + (s.amount || 0), 0)
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">Vendas de Produtos</p>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Total Despesas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-lg border border-destructive/30 bg-gradient-to-br from-destructive/10 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">💸 Despesas</p>
                  <p className="text-2xl font-bold text-destructive">R$ {(
                    expenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
                    employees.reduce((sum, e) => sum + (e.salary || 0), 0)
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">Salários + Compras</p>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Lucro Líquido */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">📈 Lucro Líquido</p>
                  <p className="text-2xl font-bold text-primary">R$ {(
                    sales.reduce((sum, s) => sum + (s.amount || 0), 0) -
                    (expenses.reduce((sum, e) => sum + (e.amount || 0), 0) + employees.reduce((sum, e) => sum + (e.salary || 0), 0))
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">Vendas - Despesas - Salários</p>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Patrimônio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">💎 Patrimônio</p>
                  <p className="text-2xl font-bold text-cyan-500">R$ {assets.reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">{assets.length} assets</p>
                </div>
              </div>
            </motion.div>

            {/* Card 5: Estoque */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6 rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">📦 Estoque</p>
                  <p className="text-2xl font-bold text-orange-500">R$ {totalInventoryValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-1">{products.length} produtos</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ABAS DE TABELAS DETALHADAS */}
          <div className="glass-card border border-border rounded-lg">
            <div className="border-b border-border">
              <div className="flex gap-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("caixa")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "caixa"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  🏪 Caixa por Loja
                </button>
                <button
                  onClick={() => setActiveTab("receitas")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "receitas"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  💰 Receitas
                </button>
                <button
                  onClick={() => setActiveTab("despesas")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "despesas"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  💸 Despesas
                </button>
                <button
                  onClick={() => setActiveTab("patrimonio")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "patrimonio"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  💎 Patrimônio
                </button>
                <button
                  onClick={() => setActiveTab("estoque")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "estoque"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  📦 Estoque
                </button>
                <button
                  onClick={() => setActiveTab("vendas")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "vendas"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  🛒 Vendas
                </button>
                <button
                  onClick={() => setActiveTab("comissoes")}
                  className={cn(
                    "px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
                    activeTab === "comissoes"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  💰 Comissões
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* TAB: CAIXA POR LOJA */}
              {activeTab === "caixa" && (
                <StoreCashBox />
              )}

              {/* TAB: RECEITAS */}
              {activeTab === "receitas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Receitas Detalhadas</h3>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-success">R$ 0,00</p>
                    </div>
                  </div>
                  <div className="bg-secondary/20 p-8 rounded-lg text-center text-muted-foreground text-sm">
                    Integração com serviços em desenvolvimento
                  </div>
                </div>
              )}

              {/* TAB: DESPESAS */}
              {activeTab === "despesas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Despesas Detalhadas</h3>
                    <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2 gradient-primary">
                          <Plus className="w-4 h-4" /> Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="font-display">Adicionar Despesa</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Descrição *</Label>
                            <Input
                              value={expenseForm.description}
                              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                              placeholder="Ex: Compra de vidros..."
                            />
                          </div>
                          <div>
                            <Label>Categoria</Label>
                            <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Compra">Compra de Produtos</SelectItem>
                                <SelectItem value="Funcionário">Salário Funcionário</SelectItem>
                                <SelectItem value="Aluguel">Aluguel</SelectItem>
                                <SelectItem value="Utilitários">Utilitários</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Valor (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Observações</Label>
                            <Input
                              value={expenseForm.notes}
                              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                              placeholder="Notas opcionais..."
                            />
                          </div>
                          <Button
                            onClick={handleAddExpense}
                            disabled={submitting}
                            className="w-full gradient-primary text-primary-foreground font-semibold"
                          >
                            {submitting ? "Salvando..." : "Adicionar Despesa"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Data</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Categoria</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Descrição</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                              Nenhuma despesa registrada
                            </td>
                          </tr>
                        ) : (
                          <>
                            {expenses.map((exp) => (
                              <motion.tr
                                key={exp.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                              >
                                <td className="p-3 text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString("pt-BR")}</td>
                                <td className="p-3 text-foreground font-medium">{exp.category}</td>
                                <td className="p-3 text-foreground">{exp.description}</td>
                                <td className="p-3 text-right font-bold text-destructive">R$ {exp.amount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              </motion.tr>
                            ))}
                            <tr className="border-t-2 border-primary/30 bg-primary/5">
                              <td colSpan={3} className="p-3 text-right font-semibold">TOTAL:</td>
                              <td className="p-3 text-right font-bold text-destructive text-lg">
                                R$ {expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: PATRIMÔNIO */}
              {activeTab === "patrimonio" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Patrimônio (Assets)</h3>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-cyan-500">R$ {assets.reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {assets.length === 0 ? (
                    <div className="bg-secondary/20 p-8 rounded-lg text-center text-muted-foreground text-sm">
                      Nenhum ativo registrado
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Nome</th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Tipo</th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Data Aquisição</th>
                            <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.map((asset) => (
                            <motion.tr
                              key={asset.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                            >
                              <td className="p-3 text-foreground font-medium">{asset.name}</td>
                              <td className="p-3 text-foreground">{asset.asset_type}</td>
                              <td className="p-3 text-muted-foreground">{new Date(asset.acquisition_date || "").toLocaleDateString("pt-BR")}</td>
                              <td className="p-3 text-right font-bold text-cyan-500">R$ {asset.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            </motion.tr>
                          ))}
                          <tr className="border-t-2 border-primary/30 bg-primary/5">
                            <td colSpan={3} className="p-3 text-right font-semibold">TOTAL PATRIMÔNIO:</td>
                            <td className="p-3 text-right font-bold text-cyan-500 text-lg">
                              R$ {assets.reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ESTOQUE */}
              {activeTab === "estoque" && (
                <div>
                  {/* Cards de Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Total de Produtos */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-6 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total de Produtos</p>
                          <p className="text-3xl font-bold text-foreground">{totalProducts}</p>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Barcode className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </motion.div>

                    {/* Produtos com Baixo Estoque */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="glass-card p-6 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Baixo Estoque</p>
                          <p className={cn("text-3xl font-bold", lowStockProducts.length > 0 ? "text-destructive" : "text-foreground")}>
                            {lowStockProducts.length}
                          </p>
                          {lowStockProducts.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {lowStockProducts.slice(0, 2).map(p => (
                                <p key={p.id} className="text-xs text-destructive">• {p.name}</p>
                              ))}
                              {lowStockProducts.length > 2 && (
                                <p className="text-xs text-muted-foreground">+{lowStockProducts.length - 2} mais</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", lowStockProducts.length > 0 ? "bg-destructive/15" : "bg-success/15")}>
                          <AlertTriangle className={cn("w-6 h-6", lowStockProducts.length > 0 ? "text-destructive" : "text-success")} />
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Cards Adicionais de Análise */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* Produto Mais Estocado */}
                    {mostStockedProduct && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-card p-4 rounded-lg border border-border"
                      >
                        <p className="text-xs text-muted-foreground mb-2">Maior Quantidade</p>
                        <p className="font-semibold text-foreground truncate text-sm">{mostStockedProduct.name}</p>
                        <p className="text-lg font-bold text-primary mt-1">{mostStockedProduct.quantity} unid.</p>
                        <p className="text-xs text-muted-foreground mt-1">{mostStockedProduct.category}</p>
                      </motion.div>
                    )}

                    {/* Produto Menos Estocado */}
                    {leastStockedProduct && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={cn("glass-card p-4 rounded-lg border", leastStockedProduct.quantity <= (leastStockedProduct.min_quantity || 1) ? "border-destructive/50 bg-destructive/5" : "border-border")}
                      >
                        <p className="text-xs text-muted-foreground mb-2">Menor Quantidade</p>
                        <p className={cn("font-semibold truncate text-sm", leastStockedProduct.quantity <= (leastStockedProduct.min_quantity || 1) ? "text-destructive" : "text-foreground")}>
                          {leastStockedProduct.name}
                        </p>
                        <p className={cn("text-lg font-bold mt-1", leastStockedProduct.quantity <= (leastStockedProduct.min_quantity || 1) ? "text-destructive" : "text-primary")}>
                          {leastStockedProduct.quantity} unid.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Mín: {leastStockedProduct.min_quantity || 1}</p>
                      </motion.div>
                    )}

                    {/* Produtos Mais Valiosos */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="glass-card p-4 rounded-lg border border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Top 3 Valiosos</p>
                      <div className="space-y-2">
                        {mostValuableProducts.map((p, idx) => (
                          <div key={p.id} className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground flex-1 truncate">{idx + 1}. {p.name}</p>
                            <p className="text-xs font-bold text-primary whitespace-nowrap ml-2">R$ {p.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Barra de Busca */}
                  <div className="mb-6 flex gap-4 justify-between items-center">
                    <div className="relative max-w-md flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, código, categoria, fornecedor..."
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>

                  {/* Tabela de Produtos */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {products
                            .filter(
                              (p) =>
                                p.name.toLowerCase().includes(search.toLowerCase()) ||
                                p.category.toLowerCase().includes(search.toLowerCase()) ||
                                (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
                                (p.supplier && p.supplier.toLowerCase().includes(search.toLowerCase())) ||
                                (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
                                (p.store && p.store.toLowerCase().includes(search.toLowerCase()))
                            )
                            .map((p, i) => {
                              const isLow = p.quantity <= (p.min_quantity || 1);
                              const totalValue = p.quantity * p.price;
                              return (
                                <motion.tr
                                  key={p.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                                >
                                  <td className="p-4" colSpan={10}>
                                    <div className="flex items-start justify-between gap-3 w-full">
                                      <div className="flex items-start gap-3 flex-1">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", isLow ? "bg-destructive/15" : "bg-primary/15")}>
                                          <Package className={cn("w-4 h-4", isLow ? "text-destructive" : "text-primary")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground text-sm">{p.name}</span>
                                            {p.code && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                {p.code}
                                              </span>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-5 gap-4 text-xs text-muted-foreground mt-2">
                                            <div><span className="font-medium">Cat:</span> {p.category}</div>
                                            <div><span className="font-medium">Loja:</span> {p.store || "Loja 1"}</div>
                                            <div><span className="font-medium">Forn:</span> {p.supplier || "—"}</div>
                                            <div className={cn("font-bold", isLow ? "text-destructive" : "text-foreground")}><span className="font-medium">Qtd:</span> {p.quantity}</div>
                                            <div><span className="font-medium">Mín:</span> {p.min_quantity}</div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mt-2">
                                            <div><span className="font-medium">Custo:</span> R$ {(p.cost_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                            <div><span className="font-medium">Venda:</span> R$ {p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                          </div>
                                          {p.description && (
                                            <div className="mt-2 flex items-start gap-2">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 border border-blue-500/30 flex-shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                                Descrição
                                              </span>
                                              <p className="text-xs text-muted-foreground italic">{p.description}</p>
                                            </div>
                                          )}
                                          {isLow && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Estoque baixo!</p>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {!isLow && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/15 text-success whitespace-nowrap">
                                            OK
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </motion.div>

                  {products.filter(
                    (p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.category.toLowerCase().includes(search.toLowerCase()) ||
                      (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
                      (p.supplier && p.supplier.toLowerCase().includes(search.toLowerCase())) ||
                      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
                      (p.store && p.store.toLowerCase().includes(search.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>
              )}

              {/* TAB: VENDAS */}
              {activeTab === "vendas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Histórico de Vendas</h3>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total em Vendas</p>
                      <p className="text-xl font-bold text-success">R$ {sales.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {sales.length === 0 ? (
                    <div className="bg-secondary/20 p-8 rounded-lg text-center text-muted-foreground text-sm">
                      Nenhuma venda registrada ainda
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Data</th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Produto</th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Tipo</th>
                            <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Valor</th>
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((sale) => (
                            <motion.tr
                              key={sale.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                            >
                              <td className="p-3 text-foreground">{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</td>
                              <td className="p-3 text-foreground font-medium">{sale.description}</td>
                              <td className="p-3 text-muted-foreground capitalize">{sale.sale_type}</td>
                              <td className="p-3 text-right font-bold text-success">R$ {(sale.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-muted-foreground text-xs">{sale.notes || "-"}</td>
                            </motion.tr>
                          ))}
                          <tr className="border-t-2 border-primary/30 bg-primary/5">
                            <td colSpan={3} className="p-3 text-right font-semibold">TOTAL VENDAS:</td>
                            <td className="p-3 text-right font-bold text-success text-lg">
                              R$ {sales.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: COMISSÕES */}
              {activeTab === "comissoes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Comissões por Funcionário</h3>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-success">
                        R$ {commissions.reduce((sum, c) => sum + c.total_commission, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {commissions.length === 0 ? (
                    <div className="bg-secondary/20 p-8 rounded-lg text-center text-muted-foreground text-sm">
                      Nenhuma comissão registrada
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {commissions.map((commission, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-card border border-border rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{commission.employee_name}</h4>
                              <p className="text-xs text-muted-foreground">ID: {commission.employee_id}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Total de Comissões</p>
                              <p className="text-xl font-bold text-success">
                                R$ {commission.total_commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          {commission.sales_details && commission.sales_details.length > 0 && (
                            <div className="border-t border-border pt-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Detalhes:</p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {commission.sales_details.map((detail: any, detailIdx: number) => (
                                  <div key={detailIdx} className="text-xs p-2 bg-secondary/30 rounded flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {detail.commission_type}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {detail.commission_percentage 
                                          ? `${detail.commission_percentage}% de R$ ${detail.sale_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
                                          : `Venda: R$ ${detail.sale_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                        }
                                      </p>
                                      <p className="text-muted-foreground text-xs">
                                        {new Date(detail.sale_date).toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                    <p className="font-bold text-success">
                                      R$ {detail.commission_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RESUMO FOLHA: SALÁRIOS */}
          <div className="glass-card p-6 border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">👥 Folha de Pagamento (Salários)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Funcionário</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Cargo</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Salário</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                        Nenhum funcionário cadastrado
                      </td>
                    </tr>
                  ) : (
                    <>
                      {employees.map((emp) => (
                        <motion.tr
                          key={emp.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                        >
                          <td className="p-3 text-foreground font-medium">{emp.name}</td>
                          <td className="p-3 text-foreground">{emp.role}</td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              emp.active
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            )}>
                              {emp.active ? "✓ Ativo" : "✗ Inativo"}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-destructive">R$ {(emp.salary || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        </motion.tr>
                      ))}
                      <tr className="border-t-2 border-primary/30 bg-primary/5">
                        <td colSpan={3} className="p-3 text-right font-semibold">TOTAL MENSAL:</td>
                        <td className="p-3 text-right font-bold text-destructive text-lg">
                          R$ {employees.reduce((sum, e) => sum + (e.salary || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Financial;
