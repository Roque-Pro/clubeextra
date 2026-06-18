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
    <aside className="h-full w-full bg-[#2c3493] border-r border-white/5 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-3 border-b border-white/10 flex items-center justify-center relative">
        <img 
          src="/img/iguacu_vidros_white.png" 
          alt="Iguaçu Auto Vidros" 
          className="h-14 object-contain"
        />
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/10 text-white md:hidden"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all duration-200 group",
                isActive
                  ? "bg-white text-[#2c3493]"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-3.5 h-3.5 transition-colors", 
                isActive ? "text-[#2c3493]" : "text-white/50 group-hover:text-white"
              )} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-white/10 space-y-2.5 bg-black/5">
        {user && (
          <div className="px-1.5">
            <div className="flex flex-col">
              <p className="text-[10px] text-white/70 font-medium truncate max-w-[130px]">{user.email}</p>
              {isAdmin && (
                <span className="text-[8px] text-primary-foreground/50 font-bold uppercase tracking-tighter">Administrador</span>
              )}
            </div>
          </div>
        )}
        
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white bg-red-600/70 hover:bg-red-600 transition-all duration-200 w-full"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>

        <div className="pt-0.5">
          <p className="text-[8px] text-white/20 text-center leading-tight">
            © 2026 Iguaçu Auto Vidros<br />
            TechNexos
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
