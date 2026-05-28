import React from "react";
import { InventoryItem } from "../types";
import { BarChart, BarChart3, Download, FileSpreadsheet, PieChart, ShieldAlert, CheckCircle } from "lucide-react";

interface ReportsProps {
  items: InventoryItem[];
}

export default function Reports({ items }: ReportsProps) {
  const total = items.length;
  const critical = items.filter(i => i.status === "Crítico").length;
  const low = items.filter(i => i.status === "Baixo").length;
  const ok = items.filter(i => i.status === "Ok").length;

  // Category counts
  const categoriesMap: Record<string, number> = {};
  items.forEach(itm => {
    categoriesMap[itm.category] = (categoriesMap[itm.category] || 0) + 1;
  });

  const categoriesData = Object.entries(categoriesMap).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a,b) => b.count - a.count);

  const simulateExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Produto,Categoria,Quantidade,Estoque Minimo,Status,Ultimo Scan\n";
    items.forEach(i => {
      csvContent += `${i.id},"${i.name}","${i.category}",${i.stock},${i.minStock},${i.status},"${i.lastScan}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Estoque_SmartStock_${new Date().toLocaleDateString("pt-BR")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-view" className="flex-1 p-6 lg:p-10 font-sans text-gray-800 overflow-y-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            Relatórios e Estatísticas
          </h1>
          <p className="text-gray-500 text-xs font-semibold mt-1">
            Análises analíticas detalhadas do seu catálogo de produtos
          </p>
        </div>

        <button
          onClick={simulateExportCSV}
          className="flex items-center gap-2 h-11 px-5 text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
        >
          <Download size={15} />
          <span>Exportar Planilha .CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Summary and categories percentage */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Status Breakdown card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-5">
              Distribuição de Status dos Produtos
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <CheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-emerald-800 block">Estoque Ok</span>
                <span className="text-xl font-extrabold text-emerald-900 mt-1 block">{ok}</span>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <ShieldAlert size={20} className="text-amber-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-amber-800 block">Estoque Baixo</span>
                <span className="text-xl font-extrabold text-[#ca8a04] mt-1 block">{low}</span>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                <ShieldAlert size={20} className="text-rose-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-rose-800 block">Críticos (Zero)</span>
                <span className="text-xl font-extrabold text-rose-900 mt-1 block">{critical}</span>
              </div>
            </div>
          </div>

          {/* Categorias Distribution counts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-5">
              Participação de Categorias no Catálogo
            </h3>

            <div className="space-y-4">
              {categoriesData.map((cat, i) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">{cat.name}</span>
                    <span className="text-gray-500">{cat.count} produtos ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Smart AI analytics insights card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-emerald-500" size={18} />
            <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase">
              Relatório Gerencial Geral
            </h3>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-gray-600">
            <p>
              Analisando as proporções atuais das mercadorias, seu negócio conta com <strong>{total} produtos ativos</strong> catalogados. 
            </p>
            
            {critical > 0 ? (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-700 font-medium">
                Alerta: Você possui {critical} categorias operando com estoque zerado no momento. Isto pode gerar rupturas e quedas no faturamento. Veja a aba "Produtos" para cadastrar reposição.
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 font-medium">
                Excelente: Nenhum produto cadastrado está zerado atualmente. Mantenha os níveis de segurança atualizados semanalmente.
              </div>
            )}

            <p>
              O sistema sincroniza suas adições no banco central SQLite, permitindo acesso multi-dispositivo unificado. Qualquer nova entrada realizada por voz ou captura de imagem recomputa estes dados dinamicamente.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
              <span className="font-bold text-[10px] uppercase text-gray-400 block tracking-widest">Giro Recomendado</span>
              <p className="text-[11px] text-gray-500">
                • Categoria mais estocada: <strong>Bebidas</strong><br/>
                • Próxima atualização sugerida: Quinta-feira
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
