import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, Clock } from "lucide-react";
import { ChatMessage } from "../types";

export default function AIChatSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Olá! Sou o Assistente Virtual SmartStock GPT. Eu estou conectado ao seu estoque em tempo real. Como posso te auxiliar na gestão das suas mercadorias ou configuração de compras hoje?",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("smartstock_chat_history");
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch {
        localStorage.removeItem("smartstock_chat_history");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("smartstock_chat_history", JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsgText = inputText;
    setInputText("");

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Send chat history and current request to server-side Gemini parser
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (!res.ok) {
        throw new Error("Falha ao contatar assistência de IA");
      }

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: "reply-" + Date.now(),
          sender: "assistant",
          text: data.text,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }]);
      }
    } catch (err: any) {
      console.warn("Sem servidor inteligente, usando resposta autônoma:", err);
      // Fallback response with beautiful markdown description
      setMessages((prev) => [...prev, {
        id: "reply-fallback-" + Date.now(),
        sender: "assistant",
        text: "Desculpe pelo transtorno. No momento estou sem retorno do gateway do servidor. Mas fique tranquilo! Seus estoques locais continuam seguros, resilientes em funcionamento offline e em perfeitas condições para salvar.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectQuickQuestion = (qn: string) => {
    setInputText(qn);
  };

  return (
    <div id="smart-chat-widget" className="fixed bottom-6 right-6 z-40 font-sans select-none">
      
      {/* Trigger Bubble Button */}
      {!isOpen && (
        <button
          id="chat-toggle-open"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-[#1aa275] hover:bg-[#158c64] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer border border-[#1aa275]/50 relative"
          title="Falar com Assistente IA"
        >
          <MessageSquare size={22} />
          {/* Unread badge indicator */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-bounce" />
        </button>
      )}

      {/* Floating Chat Panel Window */}
      {isOpen && (
        <div id="chat-window" className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col justify-between animate-scale-up z-50">
          
          {/* Drawer Header brand */}
          <div className="bg-[#0a1b24] p-4 text-white flex items-center justify-between border-b border-teal-950">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1aa275] flex items-center justify-center text-white">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight flex items-center gap-1">
                  Assessoria Cognitiva
                </h4>
                <span className="text-[9px] text-[#1aa275] font-semibold tracking-wider block">
                  ● CONECTADO AO SEU ESTOQUE
                </span>
              </div>
            </div>
            
            <button 
              id="chat-toggle-close"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#112d3b]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Grid area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fcfdfe]">
            
            {messages.map((m) => {
              const isAssistant = m.sender === "assistant";
              return (
                <div 
                  key={m.id} 
                  className={`flex items-start gap-2 max-w-[85%] ${isAssistant ? "mr-auto text-left" : "ml-auto flex-row-reverse text-right"}`}
                >
                  {isAssistant && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] uppercase font-black shrink-0 border border-emerald-100/50 mt-1">
                      IA
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed font-sans shadow-xs ${
                    isAssistant 
                      ? "bg-white text-gray-800 border border-gray-100 rounded-tl-none font-medium" 
                      : "bg-[#1aa275] text-white rounded-tr-none font-semibold"
                  }`}>
                    <p className="whitespace-pre-line break-words">{m.text}</p>
                    <span className={`block text-[9px] mt-1 font-mono ${isAssistant ? "text-gray-400" : "text-emerald-100"}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-[80%] mr-auto">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#1aa275] border border-emerald-100 flex items-center justify-center shrink-0">
                  <Bot size={12} className="animate-spin" />
                </div>
                <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-gray-50 flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick preset questions drawer */}
          <div className="px-4 pt-2 pb-1.5 border-t border-gray-50 bg-gray-50/50 flex flex-wrap gap-1">
            <button
              onClick={() => selectQuickQuestion("Quais produtos estão críticos?")}
              className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 transition-colors pointer-events-auto cursor-pointer"
            >
              "Quais estão críticos?"
            </button>
            <button
              onClick={() => selectQuickQuestion("Dicas para comprar mais arroz")}
              className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 transition-colors pointer-events-auto cursor-pointer"
            >
              "Dicas de compra"
            </button>
            <button
              onClick={() => selectQuickQuestion("Como cadastrar por foto?")}
              className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 transition-colors pointer-events-auto cursor-pointer"
            >
              "Instruções da câmera"
            </button>
          </div>

          {/* Form Message fields */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              id="chat-input"
              type="text"
              required
              placeholder="Digite sua dúvida de estoque..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-10 px-4 rounded-xl border border-gray-100 text-xs focus:outline-none focus:border-emerald-600 font-sans text-gray-800 placeholder:text-gray-300"
            />
            <button
              id="chat-send"
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="w-10 h-10 rounded-xl bg-[#1aa275] hover:bg-[#158c64] disabled:bg-gray-100 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
