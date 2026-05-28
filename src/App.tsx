import React, { useState, useEffect } from "react";
import { User, InventoryItem } from "./types";
import LoginAuth from "./components/LoginAuth";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import CameraIA from "./components/CameraIA";
import Reports from "./components/Reports";
import SettingsView from "./components/SettingsView";
import AIChatSupport from "./components/AIChatSupport";
import { Wifi, WifiOff, CloudLightning } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [scansCount, setScansCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sync state observer for online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically attempt backup syncing when coming back online!
      handleSyncToCloud();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [items]);

  // Load user session on startup
  useEffect(() => {
    const savedUser = localStorage.getItem("smartstock_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem("smartstock_user");
      }
    }

    // Load initial inventory
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Servidor offline");
      const list = await res.json();
      
      setItems(list);
      // Cache local copy of database for offline situations
      localStorage.setItem("smartstock_local_inventory", JSON.stringify(list));
    } catch (err) {
      console.warn("Sem conexão com o servidor de banco de dados, inicializando estoque local offline...");
      // Retrieve fallback items from cache
      const cached = localStorage.getItem("smartstock_local_inventory");
      if (cached) {
        setItems(JSON.parse(cached));
      } else {
        // Factory fallback if empty
        const defaults: InventoryItem[] = [
          { id: "1", name: "Arroz Tio João 5kg", category: "Grãos", stock: 2, minStock: 10, lastScan: "Hoje 09:14", status: "Crítico" },
          { id: "2", name: "Óleo de Soja 900ml", category: "Alimentação", stock: 5, minStock: 8, lastScan: "Hoje 09:14", status: "Baixo" },
          { id: "3", name: "Refrigerante 2L", category: "Bebidas", stock: 120, minStock: 20, lastScan: "Ontem 17:30", status: "Ok" },
          { id: "4", name: "Água Mineral 500ml", category: "Bebidas", stock: 98, minStock: 30, lastScan: "Ontem 17:30", status: "Ok" },
          { id: "5", name: "Sabão em Pó 1kg", category: "Limpeza", stock: 1, minStock: 5, lastScan: "Hoje 09:15", status: "Crítico" }
        ];
        setItems(defaults);
        localStorage.setItem("smartstock_local_inventory", JSON.stringify(defaults));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Asynchronous backup cloud syncing mechanism
  const handleSyncToCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const offlineItems = JSON.parse(localStorage.getItem("smartstock_local_inventory") || "[]");
      
      const res = await fetch("/api/inventory/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: offlineItems }),
      });

      if (!res.ok) throw new Error("Erro de resposta do servidor");
      
      const data = await res.json();
      if (data.success && data.items) {
        setItems(data.items);
        localStorage.setItem("smartstock_local_inventory", JSON.stringify(data.items));
        console.log("✓ Backup e sincronização assíncrona efetuados na nuvem com sucesso!");
      }
    } catch (err: any) {
      console.warn("Sincronização adiada: sistema operando em modo isolado offline.", err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveItem = async (item: Partial<InventoryItem>) => {
    // 1. Instantly update local react state & localStorage cache for zero lag responsive user feedback!
    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const isNew = !item.id;
    const finalId = item.id || "item-loc-" + Date.now();
    const stockVal = Number(item.stock) || 0;
    const minVal = Number(item.minStock) || 0;
    const status = stockVal <= 0 ? "Crítico" : stockVal <= minVal ? "Baixo" : "Ok";

    const updatedItem: InventoryItem = {
      id: finalId,
      name: item.name || "Sem Nome",
      category: item.category || "Geral",
      stock: stockVal,
      minStock: minVal,
      lastScan: "Modificado " + timestamp,
      status
    };

    let newItemsList: InventoryItem[] = [];
    if (isNew) {
      newItemsList = [...items, updatedItem];
    } else {
      newItemsList = items.map(i => i.id === finalId ? updatedItem : i);
    }

    setItems(newItemsList);
    localStorage.setItem("smartstock_local_inventory", JSON.stringify(newItemsList));

    // 2. Perform async server network write behind-the-scenes
    try {
      const res = await fetch("/api/inventory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.items) {
          setItems(data.items);
          localStorage.setItem("smartstock_local_inventory", JSON.stringify(data.items));
        }
      }
    } catch (err) {
      console.warn("Item gravado localmente. Sem sincronia imediata (estamos offline). Sincronia ocorrerá automaticamente quando restabelecido o sinal.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    // 1. Immediate local deletion for fast response
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    localStorage.setItem("smartstock_local_inventory", JSON.stringify(newItems));

    // 2. Clear on server as well
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.items) {
          setItems(data.items);
          localStorage.setItem("smartstock_local_inventory", JSON.stringify(data.items));
        }
      }
    } catch (err) {
      console.warn("Removido localmente. Exclusão remota agendada.");
    }
  };

  // Factory reset clearance
  const handleClearData = async () => {
    localStorage.removeItem("smartstock_local_inventory");
    setItems([]);
    await loadInventory();
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    loadInventory();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("smartstock_user");
  };

  const handleUpdateInventoryFromCamera = (newInventory: InventoryItem[]) => {
    setItems(newInventory);
    setScansCount(prev => prev + 1);
    localStorage.setItem("smartstock_local_inventory", JSON.stringify(newInventory));
  };

  // Render correct panel view inside applet layout
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            user={user!}
            items={items}
            scansCount={scansCount}
            setActiveTab={setActiveTab}
            isSyncing={isSyncing}
            onSync={handleSyncToCloud}
          />
        );
      case "produtos":
        return (
          <ProductList 
            items={items}
            onSaveItem={handleSaveItem}
            onDeleteItem={handleDeleteItem}
            setActiveTab={setActiveTab}
          />
        );
      case "camera":
        return (
          <CameraIA 
            onUpdateInventory={handleUpdateInventoryFromCamera}
          />
        );
      case "relatorios":
        return <Reports items={items} />;
      case "configuracoes":
        return (
          <SettingsView 
            onClearData={handleClearData} 
            itemsCount={items.length} 
          />
        );
      
      default:
        return <div className="p-10 font-sans">Aba em desenvolvimento.</div>;
    }
  };

  // Unauthenticated viewport
  if (!user) {
    return (
      <LoginAuth 
        onLoginSuccess={handleLoginSuccess}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    );
  }

  // Authenticated full workspace layout with sidebar, app content grid and help chatbot bubble
  return (
    <div id="smart-stock-app" className="h-screen w-screen flex bg-gray-50 overflow-hidden text-gray-800">
      
      {/* Sidebar navigation */}
      <Sidebar 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        lowStockCount={items.filter(i => i.stock <= i.minStock).length}
      />

      {/* Primary viewport pane */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Network status connectivity banner */}
        <div id="connectivity-banner" className="bg-white border-b border-gray-100 h-10 px-6 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans">
              Status Conectividade:
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              isOnline ? "text-emerald-600" : "text-amber-500 animate-pulse"
            }`}>
              {isOnline ? (
                <>
                  <Wifi size={12} />
                  <span>Online (Sincronizado)</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} />
                  <span>Offline (Modo Resiliente Ativo)</span>
                </>
              )}
            </span>
          </div>

          {!isOnline && (
            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-sans">
              Qualquer alteração será salva no seu dispositivo e enviada para a nuvem quando você se conectar.
            </span>
          )}
        </div>

        {/* Tab content wrapper panel */}
        {renderTabContent()}

        {/* Floating Cognitive AI Support Bot widget */}
        <AIChatSupport />

      </main>

    </div>
  );
}
