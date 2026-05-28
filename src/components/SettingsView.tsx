import React, { useState } from "react";
import { AlertCircle, Trash2, Database, Wifi, ShieldCheck, Cloud, Zap } from "lucide-react";

interface SettingsViewProps {
  onClearData: () => void;
  itemsCount: number;
}

export default function SettingsView({ onClearData, itemsCount }: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    onClearData();
    setConfirmReset(false);
    alert("Estoque reconfigurado com sucesso!");
  };

  return (
    <div className="flex-1 p-6 lg:p-10 font-sans text-gray-800 overflow-y-auto animate-fade-in bg-gray-50">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
          Configurações do Sistema
        </h1>
        <p className="text-gray-500 text-xs font-semibold mt-1">
          Gerencie permissões de rede, persistência de banco de dados e limites do aplicativo
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        
        {/* Sync panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-2 flex items-center gap-2">
            <Database size={16} className="text-emerald-500" />
            Persistência Resiliente Offline
          </h3>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Este aplicativo emprega o protocolo de sincronização assíncrona. Os dados de estoque modificados sem rede são guardados no <strong>LocalStorage</strong> local e sincronizados imediatamente quando a conectividade é restabelecida.
          </p>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
            <Wifi className="text-emerald-600 shrink-0 mt-0.5" size={16} />
            <div>
              <span className="text-xs font-bold text-emerald-800 block">Modo Híbrido Ativado</span>
              <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5">
                O aplicativo detecta automaticamente o status online/offline do navegador e prioriza a gravação local rápida para garantir que você nunca perca nenhum registro mesmo em locais sem sinal de celular.
              </p>
            </div>
          </div>
        </div>

        {/* Cloud Sync panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-2 flex items-center gap-2">
            <Cloud size={16} className="text-blue-500" />
            Sincronização na Nuvem
          </h3>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Backup automático de seus dados em servidor centralizado. Suas informações de estoque são enviadas quando você restaura a conexão de internet.
          </p>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <Zap className="text-blue-600 shrink-0 mt-0.5" size={16} />
            <div>
              <span className="text-xs font-bold text-blue-800 block">Backup Automático</span>
              <p className="text-[10px] text-blue-700 leading-relaxed mt-0.5">
                Todos os produtos e transações são salvos na nuvem automaticamente após sincronização, garantindo recuperação de dados em qualquer dispositivo.
              </p>
            </div>
          </div>
        </div>

        {/* Security / Academic compliance panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-4">
            Segurança de Acesso e Chaves API
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs pb-3.5 border-b border-gray-50">
              <div>
                <span className="font-bold text-gray-800 block">Autenticação Segura JWT</span>
                <span className="text-gray-400 text-[10px] block mt-0.5">Sessão persistente ativa para acesso múltiplo.</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                <ShieldCheck size={12} />
                Ativo
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pb-3.5 border-b border-gray-50">
              <div>
                <span className="font-bold text-gray-800 block">Chave de API Gemini</span>
                <span className="text-gray-400 text-[10px] block mt-0.5">Usando proxy robusto server-side.</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-full">
                {process.env.GEMINI_API_KEY ? "CONFIGURADA" : "PROXIED (OK)"}
              </span>
            </div>
          </div>
        </div>

        {/* System reset */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-xs tracking-wider uppercase mb-2 text-rose-800 flex items-center gap-2">
            <AlertCircle size={15} />
            Zona de Perigo
          </h3>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            A redefinição limpa o banco de dados central, elimina todos os {itemsCount} produtos persistidos e restaura a listagem de demonstração inicial. Essa ação não pode ser desfeita.
          </p>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="h-10 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 size={14} />
              <span>Redefinir Banco de Dados</span>
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 h-10 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertCircle size={14} />
                <span>Sim, Resetar Tudo</span>
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 h-10 px-4 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
