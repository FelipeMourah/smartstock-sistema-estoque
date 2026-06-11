import React from "react";
import { User } from "../types";
import { 
  LayoutDashboard, 
  Package, 
  Camera, 
  BarChart3, 
  Settings, 
  LogOut
} from "lucide-react";

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  lowStockCount: number;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, lowStockCount }: SidebarProps) {
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "camera", label: "Câmera IA", icon: Camera },
  ];

  const analysisItems = [
    { id: "relatorios", label: "Relatórios", icon: BarChart3 }
  ];

  const systemItems = [
    { id: "configuracoes", label: "Configurações", icon: Settings }
  ];

  return (
    <aside id="sidebar-menu" className="w-64 bg-[#0a1b24] text-gray-300 flex flex-col justify-between border-r border-[#0e2633] h-screen shrink-0 select-none">
      
      {/* Top Brand Area */}
      <div>
        <div className="p-6 border-b border-[#0f2d3d] flex items-center justify-between">
          <span className="text-xl font-bold font-sans tracking-tight text-white">
            SmartStock
          </span>
        </div>

        {/* Categories Groups */}
        <div className="p-4 space-y-7">
          
          {/* MENU Group */}
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-3 font-sans">
              Menu
            </span>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    id={`menu-item-${item.id}`}
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-sans tracking-wide transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? "bg-[#112d3b] text-white font-semibold" 
                        : "hover:bg-[#0c222e] text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? "text-[#1aa275]" : "text-gray-400"} />
                      <span>{item.label}</span>
                    </div>
                    {item.id === "produtos" && lowStockCount > 0 && (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                        {lowStockCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ANÁLISE Group */}
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-3 font-sans">
              Análise
            </span>
            <nav className="space-y-1">
              {analysisItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    id={`menu-item-${item.id}`}
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans tracking-wide transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? "bg-[#112d3b] text-white font-semibold" 
                        : "hover:bg-[#0c222e] text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-[#1aa275]" : "text-gray-400"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SISTEMA Group */}
          <div>
            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-3 font-sans">
              Sistema
            </span>
            <nav className="space-y-1">
              {systemItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    id={`menu-item-${item.id}`}
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans tracking-wide transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? "bg-[#112d3b] text-white font-semibold" 
                        : "hover:bg-[#0c222e] text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-[#1aa275]" : "text-gray-400"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

        </div>
      </div>

      {/* User Information Profile block at the bottom */}
      <div className="p-4 border-t border-[#0f2d3d] bg-[#08151c]/60">
        
        {/* User Card */}
        <div id="user-profile-widget" className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-[#0b1f29]/40 border border-[#0f2c3d]/40">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-[#0a1b24] font-extrabold flex items-center justify-center text-sm font-sans">
            {user.name ? user.name[0].toUpperCase() : "J"}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-white text-xs font-bold leading-tight truncate">
              {user.name} {user.lastName || "Silva"}
            </h4>
            <span className="text-[10px] font-medium text-emerald-400 tracking-wider">
              Proprietário
            </span>
          </div>
        </div>

        {/* Exit Button */}
        <button
          id="btn-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold font-sans tracking-wide transition-all duration-150 cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>

      </div>

    </aside>
  );
}
