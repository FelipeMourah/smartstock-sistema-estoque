import React from "react";
import { InventoryItem, User } from "../types";
import { 
  Plus, 
  Layers, 
  PackageCheck, 
  AlertTriangle, 
  Maximize2, 
  Clock, 
  RefreshCw 
} from "lucide-react";

interface DashboardProps {
  user: User;
  items: InventoryItem[];
  scansCount: number;
  setActiveTab: (tab: string) => void;
  isSyncing: boolean;
  onSync: () => void;
}

export default function Dashboard({ user, items, scansCount, setActiveTab, isSyncing, onSync }: DashboardProps) {
  
  // Format current date nicely in Portuguese
  const formatDatePortuguese = () => {
    const d = new Date();
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho", 
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    return `${days[d.getDay()]} • ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
    // E.g. "Quinta-feira • 28 de maio de 2026"
  };

  // Calculations
  const totalProducts = items.length;
  
  // Categories count
  const categories = Array.from(new Set(items.map(i => i.category)));
  const totalCategories = categories.length;

  // Sum of total items in stock units
  const totalStockUnits = items.reduce((sum, item) => sum + item.stock, 0);

  // Low stock products count (status Baixo or Crítico)
  const lowStockItems = items.filter(i => i.stock <= i.minStock);
  const lowStockCount = lowStockItems.length;

  // Sorting products for Low Stock Alert table
  const sortedAlerts = [...items]
    .filter(i => i.stock <= i.minStock)
    .sort((a,b) => a.stock - b.stock)
    .slice(0, 5); // Show top 5 alerts

  // Sorting products for "Produtos mais estocados" chart
  const topStocked = [...items]
    .sort((a,b) => b.stock - a.stock)
    .slice(0, 5);

  const maxStock = topStocked.length > 0 ? Math.max(...topStocked.map(i => i.stock)) : 100;

  // Color mapper for progress bars
  const colorsList = [
    "bg-emerald-500", // Refrigerante
    "bg-blue-500",     // Água
    "bg-teal-500",     // Biscoito
    "bg-amber-600",    // Leite
    "bg-emerald-600"   // Açúcar
  ];

  return (
    <div id="dashboard-view" className="flex-1 p-6 lg:p-10 font-sans text-gray-800 overflow-y-auto animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-1">
            {user.businessName} • {formatDatePortuguese()}
          </p>
        </div>

        {/* Buttons Suite */}
        <div className="flex items-center gap-3">
          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            title="Sincronizar dados locais com a nuvem"
            className="flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:bg-gray-100 disabled:text-gray-400 border border-emerald-100 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Sincronizando..." : "Backup Nuvem"}</span>
          </button>

          {/* Escanear action */}
          <button
            id="btn-scan-trigger"
            onClick={() => setActiveTab("camera")}
            className="flex items-center gap-2 h-11 px-5 text-white bg-[#1aa275] hover:bg-[#158c64] font-bold text-xs rounded-xl shadow-md cursor-pointer tracking-wide transition-all duration-150 border border-[#1aa275]"
          >
            <Plus size={16} />
            <span>Escanear estoque</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row matching Image 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        {/* TOTAL DE PRODUTOS */}
        <div id="metric-total-products" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:border-gray-200 transition-all">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block font-sans">
            Total de Produtos
          </span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-gray-900 leading-none">
              {totalProducts}
            </span>
          </div>
          <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold w-max">
            {totalCategories} categorias
          </span>
        </div>

        {/* ITENS EM ESTOQUE */}
        <div id="metric-stock-units" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:border-gray-200 transition-all">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block font-sans">
            Itens em estoque
          </span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-gray-900 leading-none">
              {totalStockUnits.toLocaleString("pt-BR")}
            </span>
          </div>
          <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold w-max">
            +34 lançados hoje
          </span>
        </div>

        {/* ALERTAS DE BAIXO */}
        <div id="metric-low-alerts" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:border-gray-200 transition-all">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block font-sans">
            Alertas de Baixo
          </span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-gray-900 leading-none text-amber-600">
              {lowStockCount}
            </span>
          </div>
          <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-bold w-max">
            Atenção crítica
          </span>
        </div>

        {/* SCANS HOJE */}
        <div id="metric-scans-count" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:border-gray-200 transition-all">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block font-sans">
            Scans Hoje
          </span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-gray-900 leading-none">
              {scansCount}
            </span>
          </div>
          <span className="inline-flex items-center text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 font-bold w-max">
            Câmera IA ativa
          </span>
        </div>

      </div>

      {/* Main Grid Content (Table + Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Card: Alertas de estoque baixo */}
        <div id="alerts-card" className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
            <h3 className="font-bold text-gray-800 text-sm tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#1aa275] rounded-full" />
              Alertas de estoque baixo
            </h3>
            <span className="text-[11px] font-bold text-gray-400">
              {lowStockCount} itens
            </span>
          </div>

          {sortedAlerts.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center rounded-2xl mb-3">
                <PackageCheck size={20} />
              </div>
              <h4 className="font-bold text-gray-700 text-xs">Estoque impecável</h4>
              <p className="text-gray-400 text-[10px] mt-1 max-w-xs">Nenhum produto está operando no momento abaixo do alerta mínimo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {sortedAlerts.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3 px-1 flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.stock === 0 ? "bg-rose-500 animate-pulse" : "bg-amber-500"}`} />
                        <span className="text-xs font-bold text-gray-800 font-sans truncate max-w-[200px] block">
                          {item.name}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-xs text-gray-500 font-mono">
                          {item.stock} un.
                        </span>
                      </td>
                      <td className="py-3 px-1 text-right">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-black rounded font-sans tracking-wide ${
                          item.stock === 0 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {item.stock === 0 ? "Crítico" : "Baixo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: Produtos mais estocados Bar Chart layout */}
        <div id="chart-card" className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
            <h3 className="font-bold text-gray-800 text-sm tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded-full" />
              Produtos mais estocados
            </h3>
          </div>

          <div className="space-y-5">
            {topStocked.length === 0 ? (
              <p className="text-gray-400 text-xs py-8 text-center font-sans">Cadastre itens para gerar estatísticas de quantidade.</p>
            ) : (
              topStocked.map((item, idx) => {
                const percentage = Math.max(8, Math.min(100, (item.stock / maxStock) * 100));
                const barColor = colorsList[idx % colorsList.length];
                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-600 text-[11px] truncate max-w-[160px] font-sans">
                        {item.name}
                      </span>
                      <span className="font-bold text-gray-900 font-mono">
                        {item.stock}
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative border border-gray-50">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
