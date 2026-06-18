import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, UserCog, History, Shield, LogOut, Settings, ShoppingCart, BarChart3, PieChart, Camera } from "lucide-react";
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
      <div className="p-8 border-b border-white/10 flex items-center justify-center relative">
        <img 
          src="/img/iguacu_vidros_white.png" 
          alt="Iguaçu Auto Vidros" 
          className="h-28 object-contain drop-shadow-lg"
        />
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 text-white md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group",
                isActive
                  ? "bg-white text-[#2c3493] shadow-lg shadow-black/20"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors", 
                isActive ? "text-[#2c3493]" : "text-white/60 group-hover:text-white"
              )} />
              <span className="tracking-wide">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-6 border-t border-white/10 space-y-4 bg-black/10">
        {user && (
          <div className="px-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                <UserCog className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-white/90 font-medium truncate max-w-[150px]">{user.email}</p>
                {isAdmin && (
                  <span className="text-[10px] text-primary-foreground/70 font-bold uppercase tracking-wider">Administrador</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600/80 hover:bg-red-600 transition-all duration-200 w-full shadow-lg shadow-black/10"
        >
          <LogOut className="w-4 h-4" />
          Sair do Sistema
        </button>

        <div className="pt-2">
          <p className="text-[10px] text-white/40 text-center leading-relaxed">
            © 2026 Iguaçu Auto Vidros<br />
            Desenvolvido por <a href="https://www.technexos.com.br" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors font-bold underline decoration-white/20 underline-offset-2">TechNexos</a>
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
