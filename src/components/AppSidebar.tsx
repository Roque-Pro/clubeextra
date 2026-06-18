import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, UserCog, History, Shield, LogOut, Settings, ShoppingCart, BarChart3, PieChart, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface AppSidebarProps {
  onClose?: () => void;
}

const AppSidebar = ({ onClose }: AppSidebarProps) => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Serviços" },
    { to: "/clientes", icon: Users, label: "Clientes" },
    { to: "/estoque", icon: Package, label: "Estoque" },
    { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
    { to: "/analise", icon: BarChart3, label: "Análise" },
    { to: "/historico", icon: History, label: "Histórico" },
    { to: "/vistoria", icon: Camera, label: "Vistoria" },
    { to: "/financeiro", icon: PieChart, label: "Financeiro 🔒" },
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Painel Admin" }] : []),
  ];

  return (
    <aside className="h-full w-full bg-[#2c3493] border-r border-white/5 flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center justify-center relative">
        <img 
          src="/img/iguacu_vidros_white.png" 
          alt="Iguaçu Auto Vidros" 
          className="h-20 object-contain drop-shadow-lg"
        />
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/10 text-white md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-white text-[#2c3493] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 transition-colors", 
                isActive ? "text-[#2c3493]" : "text-white/60 group-hover:text-white"
              )} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-black/5">
        {user && (
          <div className="px-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex flex-col">
                <p className="text-[11px] text-white/80 font-medium truncate max-w-[150px]">{user.email}</p>
                {isAdmin && (
                  <span className="text-[9px] text-primary-foreground/60 font-bold uppercase tracking-wider">Administrador</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-all duration-200 w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>

        <div className="pt-1">
          <p className="text-[9px] text-white/30 text-center">
            © 2026 Iguaçu Auto Vidros<br />
            Desenvolvido por <a href="https://www.technexos.com.br" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors underline decoration-white/10 underline-offset-2">TechNexos</a>
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
