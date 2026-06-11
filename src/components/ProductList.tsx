import React, { useState } from "react";
import { InventoryItem } from "../types";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  ArrowLeftRight, 
  Flame, 
  FileText, 
  Volume2 
} from "lucide-react";

interface ProductListProps {
  items: InventoryItem[];
  onSaveItem: (item: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function ProductList({ items, onSaveItem, onDeleteItem, setActiveTab }: ProductListProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  
  // Modals / Editors state
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<Partial<InventoryItem> | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Grãos");
  const [formStock, setFormStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(5);

  // Derive categories from current items
  const categoriesList = ["Todas", ...Array.from(new Set(items.map(i => i.category)))];

  // Filters logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "Todos" || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = items.filter(i => i.stock <= i.minStock).length;

  const openNewItemModal = () => {
    setCurrentEditItem(null);
    setFormName("");
    setFormCategory("Grãos");
    setFormStock(10);
    setFormMinStock(5);
    setIsEditing(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setCurrentEditItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormStock(item.stock);
    setFormMinStock(item.minStock);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor insira o nome do produto.");
      return;
    }

    onSaveItem({
      id: currentEditItem?.id, // undefined maps to new item creation
      name: formName,
      category: formCategory,
      stock: Number(formStock),
      minStock: Number(formMinStock),
      lastScan: currentEditItem?.lastScan || "Novo Registro",
    });

    setIsEditing(false);
  };

  // Fast inline inventory modifier
  const updateStockInline = (item: InventoryItem, delta: number) => {
    onSaveItem({
      ...item,
      stock: Math.max(0, item.stock + delta),
      lastScan: "Ajuste rápido",
    });
  };

  return (
    <div id="product-view" className="flex-1 p-6 lg:p-10 font-sans text-gray-800 overflow-y-auto animate-fade-in relative">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
            Produtos
          </h1>
          <p className="text-gray-500 text-xs font-medium mt-1">
            {items.length} produtos cadastrados • {lowStockCount} alertas ativos
          </p>
        </div>

        <button
          id="btn-new-product"
          onClick={openNewItemModal}
          className="flex items-center gap-2 h-11 px-5 text-white bg-[#1aa275] hover:bg-[#158c64] font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all border border-[#1aa275]"
        >
          <Plus size={16} />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filter / Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mb-6">
        
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="product-search"
            type="text"
            placeholder="Buscar produto por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-100 bg-white text-sm focus:outline-none focus:border-emerald-500 font-sans transition-all text-gray-800 placeholder:text-gray-400 shadow-sm"
          />
        </div>

        {/* Category selector */}
        <div className="md:col-span-3">
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-11 px-3 bg-white rounded-xl border border-gray-100 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-700 shadow-sm font-sans"
          >
            <option value="Todas">Todas categorias</option>
            {categoriesList.filter(c => c !== "Todas").map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status selector */}
        <div className="md:col-span-3">
          <select
            id="filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-11 px-3 bg-white rounded-xl border border-gray-100 text-sm focus:outline-none focus:border-emerald-500 transition-all text-gray-700 shadow-sm font-sans"
          >
            <option value="Todos">Todos status</option>
            <option value="Ok">Status: Ok</option>
            <option value="Baixo">Status: Baixo</option>
            <option value="Crítico">Status: Crítico</option>
          </select>
        </div>

      </div>

      {/* Main Table Grid container */}
      <div id="desktop-inventory-table" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">
                <th className="py-4 px-6">Produto</th>
                <th className="py-4 px-4">Categoria</th>
                <th className="py-4 px-4 text-center">Em estoque</th>
                <th className="py-4 px-4 text-center">Mínimo</th>
                <th className="py-4 px-4">Último scan</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <p className="font-sans text-xs">Nenhum produto correspondente encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  return (
                    <tr 
                      key={item.id} 
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/40 transition-colors"
                    >
                      {/* Name with Dot */}
                      <td className="py-4 px-6 font-bold text-gray-800 text-xs font-sans">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            item.status === 'Crítico' ? 'bg-rose-500 animate-pulse' : 
                            item.status === 'Baixo' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="truncate max-w-[200px]">{item.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 text-gray-500 text-xs font-sans">
                        {item.category}
                      </td>

                      {/* In Stock Interactive Unit Adjuster */}
                      <td className="py-4 px-4 text-center font-bold text-gray-900 font-mono text-xs select-none">
                        <div className="inline-flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => updateStockInline(item, -1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center">{item.stock}</span>
                          <button 
                            type="button"
                            onClick={() => updateStockInline(item, 1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Min Stock alert barrier */}
                      <td className="py-4 px-4 text-center font-semibold text-gray-500 text-xs font-mono">
                        {item.minStock}
                      </td>

                      {/* Last scan identifier */}
                      <td className="py-4 px-4 text-gray-400 text-[11px] font-sans">
                        {item.lastScan}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded font-sans uppercase tracking-wider ${
                          item.status === 'Crítico' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          item.status === 'Baixo' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Editar detalhes do produto"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Escanear triggering tab redirection */}
                          <button
                            onClick={() => setActiveTab("camera")}
                            className="h-7 px-3 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            Escanear
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente remover o produto "${item.name}"?`)) {
                                onDeleteItem(item.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Remover produto permanentemente"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Sheet popup overlay */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-md w-full animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm font-sans">
                {currentEditItem ? "Editar Detalhes do Produto" : "Lançar Novo Produto"}
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-sans">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex. Refrigerante Coca-Cola 2L"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-gray-800 text-xs focus:outline-none focus:border-emerald-600 transition-colors font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-sans">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-3 bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600 transition-colors font-sans"
                  >
                    <option value="Grãos">Grãos</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Limpeza">Limpeza</option>
                    <option value="Laticínios">Laticínios</option>
                    <option value="Mercearia">Mercearia</option>
                    <option value="Outros">Outras categorias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 font-sans">
                    Estoque Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-gray-800 text-xs focus:outline-none focus:border-emerald-600 transition-colors font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-sans">
                  Estoque de Alerta Mínimo
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(Number(e.target.value))}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-gray-800 text-xs focus:outline-none focus:border-emerald-600 transition-colors font-sans"
                />
                <span className="text-[10px] text-gray-400 leading-relaxed block mt-1 font-sans">
                  Defina a barreira mínima. Em quantidades iguais ou menores a esta, o produto aciona o sensor de Alerta no Painel.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-10 px-4 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 text-white bg-[#1aa275] hover:bg-[#158c64] font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all border border-[#1aa275]"
                >
                  Confirmar Lançamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
