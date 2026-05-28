import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

// Structure of our mock cloud DB file
interface DbSchema {
  users: any[];
  items: any[];
  scans: any[];
  chats: any[];
}

function readDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb: DbSchema = {
      users: [
        {
          id: "demo-user",
          email: "joao@email.com",
          name: "João",
          lastName: "Silva",
          businessName: "Mercadinho do João",
          businessType: "Mercadinho / Mercearia"
        }
      ],
      items: [
        { id: "1", name: "Arroz Tio João 5kg", category: "Grãos", stock: 2, minStock: 10, lastScan: "Hoje 09:14", status: "Crítico" },
        { id: "2", name: "Óleo de Soja 900ml", category: "Alimentação", stock: 5, minStock: 8, lastScan: "Hoje 09:14", status: "Baixo" },
        { id: "3", name: "Refrigerante 2L", category: "Bebidas", stock: 120, minStock: 20, lastScan: "Ontem 17:30", status: "Ok" },
        { id: "4", name: "Água Mineral 500ml", category: "Bebidas", stock: 98, minStock: 30, lastScan: "Ontem 17:30", status: "Ok" },
        { id: "5", name: "Sabão em Pó 1kg", category: "Limpeza", stock: 1, minStock: 5, lastScan: "Hoje 09:15", status: "Crítico" },
        { id: "6", name: "Biscoito Recheado", category: "Mercearia", stock: 80, minStock: 15, lastScan: "02/04 14:22", status: "Ok" },
        { id: "7", name: "Leite Integral 1L", category: "Laticínios", stock: 66, minStock: 12, lastScan: "02/04 14:22", status: "Ok" },
        { id: "8", name: "Feijão Carioca 1kg", category: "Grãos", stock: 3, minStock: 10, lastScan: "Hoje 09:15", status: "Baixo" },
        { id: "9", name: "Açúcar Cristal 1kg", category: "Grãos", stock: 50, minStock: 10, lastScan: "01/04 11:00", status: "Ok" }
      ],
      scans: [
        {
          id: "scan1",
          timestamp: "Hoje 09:14",
          itemsDetected: [
            { name: "Arroz 5kg (fardo)", category: "Grãos", quantity: 10 },
            { name: "Feijão 1kg", category: "Grãos", quantity: 6 },
            { name: "Óleo 900ml", category: "Alimentação", quantity: 12 }
          ]
        }
      ],
      chats: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
    return defaultDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Erro ao ler DB, resetando...", err);
    return { users: [], items: [], scans: [], chats: [] };
  }
}

function writeDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini client lazily
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("AVISO: GEMINI_API_KEY não foi configurada. Funcionalidades de IA usarão respostas simuladas.");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey || "MOCK_KEY",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // --- API ROUTES ---

  // Auth: Registrar
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, lastName, businessName, businessType } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const newUser = {
      id: "user-" + Date.now(),
      email,
      name,
      lastName: lastName || "",
      businessName: businessName || "Minha Empresa",
      businessType: businessType || "Geral"
    };

    db.users.push(newUser);
    writeDb(db);

    res.json({ success: true, user: newUser });
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" });
    }

    // Aceita qualquer senha para testabilidade do projeto acadêmico
    res.json({ success: true, user });
  });

  // Items: Get all
  app.get("/api/inventory", (req, res) => {
    const db = readDb();
    res.json(db.items);
  });

  // Items: Sync bulk (syncs offline items to cloud)
  app.post("/api/inventory/sync", (req, res) => {
    const clientItems = req.body.items || [];
    const db = readDb();
    
    // Merge algorithm - we overwrite or append
    clientItems.forEach((cItem: any) => {
      const idx = db.items.findIndex(i => i.id === cItem.id || i.name.toLowerCase() === cItem.name.toLowerCase());
      const status = cItem.stock <= 0 ? "Crítico" : cItem.stock <= cItem.minStock ? "Baixo" : "Ok";
      const merged = { ...cItem, status, synced: true };
      
      if (idx > -1) {
        db.items[idx] = { ...db.items[idx], ...merged };
      } else {
        db.items.push(merged);
      }
    });

    writeDb(db);
    res.json({ success: true, items: db.items });
  });

  // Items: Save single
  app.post("/api/inventory/save", (req, res) => {
    const item = req.body;
    if (!item.name) {
      return res.status(400).json({ error: "Nome do produto é obrigatório" });
    }
    const db = readDb();
    const status = item.stock <= 0 ? "Crítico" : item.stock <= item.minStock ? "Baixo" : "Ok";
    const newItem = {
      id: item.id || "item-" + Date.now(),
      name: item.name,
      category: item.category || "Geral",
      stock: Number(item.stock) || 0,
      minStock: Number(item.minStock) || 0,
      lastScan: item.lastScan || new Date().toLocaleString("pt-BR"),
      status
    };

    const idx = db.items.findIndex(i => i.id === newItem.id);
    if (idx > -1) {
      db.items[idx] = newItem;
    } else {
      db.items.push(newItem);
    }

    writeDb(db);
    res.json({ success: true, item: newItem, items: db.items });
  });

  // Items: Delete
  app.delete("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.items = db.items.filter(i => i.id !== id);
    writeDb(db);
    res.json({ success: true, items: db.items });
  });

  // Developer endpoints to read and write the database file directly
  app.get("/api/developer/db", (req, res) => {
    try {
      const db = readDb();
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao ler banco de dados", details: err.message });
    }
  });

  app.post("/api/developer/db", (req, res) => {
    try {
      const dbContent = req.body;
      if (!dbContent.items || !dbContent.users) {
        return res.status(400).json({ error: "Estrutura do banco inválida. Deve conter 'items' e 'users'." });
      }
      writeDb(dbContent);
      res.json({ success: true, db: dbContent });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao salvar alterações no banco de dados", details: err.message });
    }
  });

  // AI: Vision Image Scanner for stocking
  app.post("/api/ai/vision", async (req, res) => {
    const { image, simulateTag } = req.body;
    const db = readDb();

    // Simulated responses if no gemini API key is configured or user chose simulate mode
    const simulatedDetections: Record<string, any[]> = {
      soda: [
        { name: "Refrigerante Coca-Cola 350ml", category: "Bebidas", quantity: 24, minStock: 10 },
        { name: "Guaraná Antarctica 350ml", category: "Bebidas", quantity: 12, minStock: 10 }
      ],
      gros: [
        { name: "Arroz Tio João 5kg", category: "Grãos", quantity: 15, minStock: 8 },
        { name: "Feijão Carioca 1kg", category: "Grãos", quantity: 10, minStock: 8 }
      ],
      cleaning: [
        { name: "Sabão em Pó Omo 1kg", category: "Limpeza", quantity: 8, minStock: 5 },
        { name: "Detergente Ypê 500ml", category: "Limpeza", quantity: 20, minStock: 10 }
      ],
      dairy: [
        { name: "Leite Integral Piracanjuba 1L", category: "Laticínios", quantity: 12, minStock: 15 },
        { name: "Iogurte Natural 170g", category: "Laticínios", quantity: 6, minStock: 10 }
      ]
    };

    // If simulating tag is specified, return immediate smart results
    if (simulateTag && simulatedDetections[simulateTag]) {
      const items = simulatedDetections[simulateTag];
      // Save scan records
      const timestamp = new Date().toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
      const currentScan = {
        id: "scan-" + Date.now(),
        timestamp: "Hoje " + timestamp.split(" ")[1],
        itemsDetected: items.map(it => ({ name: it.name, category: it.category, quantity: it.quantity }))
      };
      
      db.scans.unshift(currentScan);
      
      // Update inventory list automatically!
      items.forEach(it => {
        const idx = db.items.findIndex(i => i.name.toLowerCase() === it.name.toLowerCase());
        if (idx > -1) {
          db.items[idx].stock += it.quantity;
          db.items[idx].lastScan = "Hoje " + timestamp.split(" ")[1];
          db.items[idx].status = db.items[idx].stock <= 0 ? "Crítico" : db.items[idx].stock <= db.items[idx].minStock ? "Baixo" : "Ok";
        } else {
          db.items.push({
            id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
            name: it.name,
            category: it.category,
            stock: it.quantity,
            minStock: it.minStock,
            lastScan: "Hoje " + timestamp.split(" ")[1],
            status: "Ok"
          });
        }
      });
      writeDb(db);
      return res.json({ success: true, itemsDetected: currentScan.itemsDetected, inventory: db.items });
    }

    // Real Gemini AI vision logic
    if (!process.env.GEMINI_API_KEY) {
      // Fallback
      const defaultTag = "soda";
      const items = simulatedDetections[defaultTag];
      const timestamp = new Date().toLocaleString("pt-BR");
      const currentScan = {
        id: "scan-" + Date.now(),
        timestamp: "Hoje " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        itemsDetected: items.map(it => ({ name: it.name, category: it.category, quantity: it.quantity }))
      };
      db.scans.unshift(currentScan);
      items.forEach(it => {
        const idx = db.items.findIndex(i => i.name.toLowerCase() === it.name.toLowerCase());
        if (idx > -1) {
          db.items[idx].stock += it.quantity;
          db.items[idx].status = db.items[idx].stock <= 0 ? "Crítico" : db.items[idx].stock <= db.items[idx].minStock ? "Baixo" : "Ok";
        } else {
          db.items.push({
            id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
            name: it.name,
            category: it.category,
            stock: it.quantity,
            minStock: it.minStock,
            lastScan: "Hoje " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            status: "Ok"
          });
        }
      });
      writeDb(db);
      return res.json({ 
        success: true, 
        message: "Operando em modo simulação (Sem Chave API)", 
        itemsDetected: currentScan.itemsDetected, 
        inventory: db.items 
      });
    }

    try {
      const client = getGeminiClient();
      // base64 image clean up
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `Analise esta foto de prateleiras ou produtos de estoque. Identifique até 5 produtos diferentes presentes na imagem.
      Retorne exclusivamente no formato JSON especificado, com o nome do produto detalhado em português, categoria correspondente (Ex. Bebidas, Grãos, Alimentos, Limpeza, etc), e a quantidade estimada de unidades ou fardos vistos.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nome completo do produto detectado em Português" },
                    category: { type: Type.STRING, description: "Categoria do produto (por exemplo: Bebidas, Grãos, Limpeza, etc)" },
                    quantity: { type: Type.INTEGER, description: "Quantidade identificada/contada das embalagens do item" },
                    minStock: { type: Type.INTEGER, description: "Sugestão de estoque de alerta mínimo recomendável" }
                  },
                  required: ["name", "category", "quantity"]
                }
              }
            },
            required: ["detectedItems"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const detected = parsed.detectedItems || [];

      if (detected.length === 0) {
        return res.json({ success: true, itemsDetected: [], message: "Nenhum produto em destaque pôde ser detectado na imagem." });
      }

      const timestamp = new Date().toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const currentScan = {
        id: "scan-" + Date.now(),
        timestamp: "Hoje " + timestamp,
        itemsDetected: detected.map((it: any) => ({
          name: it.name,
          category: it.category,
          quantity: Number(it.quantity) || 1
        }))
      };

      db.scans.unshift(currentScan);

      // Mutate central DB items as well to reflect changes
      detected.forEach((it: any) => {
        const foundIdx = db.items.findIndex(i => i.name.toLowerCase() === it.name.toLowerCase());
        const scannedQty = Number(it.quantity) || 1;
        const suggestedMin = Number(it.minStock) || 10;
        
        if (foundIdx > -1) {
          db.items[foundIdx].stock += scannedQty;
          db.items[foundIdx].lastScan = "Hoje " + timestamp;
          db.items[foundIdx].status = db.items[foundIdx].stock <= 0 ? "Crítico" : db.items[foundIdx].stock <= db.items[foundIdx].minStock ? "Baixo" : "Ok";
        } else {
          db.items.push({
            id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
            name: it.name,
            category: it.category,
            stock: scannedQty,
            minStock: suggestedMin,
            lastScan: "Hoje " + timestamp,
            status: "Ok"
          });
        }
      });

      writeDb(db);
      res.json({ success: true, itemsDetected: currentScan.itemsDetected, inventory: db.items });
    } catch (err: any) {
      console.error("Erro na visão computacional Gemini:", err);
      res.status(500).json({ error: "Falha ao processar imagem", details: err.message });
    }
  });

  // AI: Voice commands parser
  app.post("/api/ai/voice", async (req, res) => {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Transcrição vazia" });
    }

    const db = readDb();

    // Fallback parser function if Gemini is offline
    function simpleLocalVoiceParser(text: string) {
      // "adicionar 10 fardos de arroz"
      const numbers = text.match(/\d+/);
      const qty = numbers ? parseInt(numbers[0]) : 1;
      const lowerText = text.toLowerCase();
      let category = "Geral";
      let name = "Item por Voz";

      if (lowerText.includes("arroz")) {
        name = "Arroz Tio João 5kg";
        category = "Grãos";
      } else if (lowerText.includes("refrigerante") || lowerText.includes("coca")) {
        name = "Refrigerante Coca-Cola 350ml";
        category = "Bebidas";
      } else if (lowerText.includes("água") || lowerText.includes("agua")) {
        name = "Água Mineral 500ml";
        category = "Bebidas";
      } else if (lowerText.includes("óleo") || lowerText.includes("oleo")) {
        name = "Óleo de Soja 900ml";
        category = "Alimentação";
      } else if (lowerText.includes("sabão") || lowerText.includes("sabao")) {
        name = "Sabão em Pó 1kg";
        category = "Limpeza";
      } else {
        // extract name following numbers or actions
        const words = text.split(" ");
        if (words.length > 2) {
          name = words.slice(2).join(" ");
        }
      }

      return { name, quantity: qty, category, action: lowerText.includes("remover") || lowerText.includes("retirar") ? "remove" : "add" };
    }

    if (!process.env.GEMINI_API_KEY) {
      const parsed = simpleLocalVoiceParser(transcript);
      const idx = db.items.findIndex(i => i.name.toLowerCase() === parsed.name.toLowerCase());
      const change = parsed.action === "remove" ? -parsed.quantity : parsed.quantity;
      const scanTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      if (idx > -1) {
        db.items[idx].stock = Math.max(0, db.items[idx].stock + change);
        db.items[idx].lastScan = "Voz " + scanTime;
        db.items[idx].status = db.items[idx].stock <= 0 ? "Crítico" : db.items[idx].stock <= db.items[idx].minStock ? "Baixo" : "Ok";
      } else if (parsed.action === "add") {
        db.items.push({
          id: "item-" + Date.now(),
          name: parsed.name,
          category: parsed.category,
          stock: parsed.quantity,
          minStock: 10,
          lastScan: "Voz " + scanTime,
          status: "Ok"
        });
      }
      writeDb(db);
      return res.json({
        success: true,
        message: "Processado localmente (Sem Chave API)",
        parsedCommand: parsed,
        inventory: db.items
      });
    }

    try {
      const client = getGeminiClient();
      const prompt = `Analise este comando em áudio/voz transcrita sobre gerenciamento de estoque: "${transcript}"
      Extraia o que o usuário quer fazer. Ele pode estar querendo "adicionar"(somar) ou "remover"(subtrair) quantidades de um produto.
      Retorne obrigatoriamente um objeto JSON com formato:
      {
        "action": "add" ou "remove",
        "name": "Nome formatado do produto em português",
        "category": "Bebidas", "Grãos", "Limpeza", "Alimentação", "Frios" ou "Geral",
        "quantity": quantidade numérica,
        "explanation": "Explicação resumida do que foi interpretado"
      }`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "Ação a ser tomada, 'add' para adicionar/lançar ou 'remove' para remover/vender" },
              name: { type: Type.STRING, description: "Nome do produto identificável" },
              category: { type: Type.STRING, description: "Categoria que melhor classifica o produto" },
              quantity: { type: Type.INTEGER, description: "Quantidade informada ou inferida por padrão (mínimo 1)" },
              explanation: { type: Type.STRING, description: "Frase curta sobre o que foi interpretado do comando" }
            },
            required: ["action", "name", "category", "quantity", "explanation"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const change = parsed.action === "remove" ? -Number(parsed.quantity) : Number(parsed.quantity);
      const scanTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const idx = db.items.findIndex(i => i.name.toLowerCase() === parsed.name.toLowerCase());
      if (idx > -1) {
        db.items[idx].stock = Math.max(0, db.items[idx].stock + change);
        db.items[idx].lastScan = "IA Voz " + scanTime;
        db.items[idx].status = db.items[idx].stock <= 0 ? "Crítico" : db.items[idx].stock <= db.items[idx].minStock ? "Baixo" : "Ok";
      } else if (parsed.action === "add") {
        db.items.push({
          id: "item-" + Date.now(),
          name: parsed.name,
          category: parsed.category,
          stock: parsed.quantity,
          minStock: 10,
          lastScan: "IA Voz " + scanTime,
          status: "Ok"
        });
      }

      writeDb(db);
      res.json({ success: true, parsedCommand: parsed, inventory: db.items });
    } catch (err: any) {
      console.error("Erro no interpretador por voz:", err);
      // fallback
      const parsed = simpleLocalVoiceParser(transcript);
      res.json({ success: true, error: "Falha na IA, usando fallback manual", parsedCommand: parsed, inventory: db.items });
    }
  });

  // AI: Integrated chatbot support
  app.post("/api/ai/chat", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Mensagens inválidas" });
    }

    const db = readDb();
    
    // We send current stock summaries to the chatbot so it has access to real context!
    const criticalItems = db.items.filter(i => i.status === "Crítico").map(i => `${i.name} (estoque: ${i.stock})`).join(", ");
    const lowItems = db.items.filter(i => i.status === "Baixo").map(i => `${i.name} (estoque: ${i.stock}, mínimo: ${i.minStock})`).join(", ");
    const totalInventory = db.items.length;
    
    const contextPrompt = `Você é o Assistente Virtual Inteligente do aplicativo "SmartStock" (Gestão de Estoque por IA). Seu dever é ajudar o usuário proprietário da loja a gerenciar seu inventário.
    Aqui está a situação do estoque dele em TEMPO REAL para você responder com precisão:
    - Total de produtos catalogados: ${totalInventory}
    - PRODUTOS EM ESTADO CRÍTICO (Estoque Zerado / Alerta Máximo): [${criticalItems || "Nenhum no momento"}]
    - PRODUTOS EM ALERTA BAIXO: [${lowItems || "Nenhum no momento"}]

    Utilize estas informações de estoque real para formular respostas proativas, sugestões de reposição, respostas a dúvidas de como usar a câmera para tirar foto de fardos, ou cadastros por voz ("Adicionar arroz", por exemplo). Seja amigável, direto, profissional e fale em português-brasileiro de forma concisa.`;

    if (!process.env.GEMINI_API_KEY) {
      // Mock conversation fallback
      const lastUserMsg = messages[messages.length - 1]?.text || "";
      let answer = "Olá! Como assistente SmartStock, estou disponível para lhe ajudar a analisar mercadorias e otimizar as prateleiras. Caso adicione uma chave de API válida no painel, poderei responder suas perguntas com suporte cognitivo avançado.";
      
      const textLower = lastUserMsg.toLowerCase();
      if (textLower.includes("estoque") || textLower.includes("critico") || textLower.includes("crítico")) {
        answer = `Analisando seu estoque, noto que você possui ${totalInventory} produtos. Há itens com atenção crítica: ${criticalItems || "Nenhum"}. Recomendo providenciar pedidos de compras destes fornecedores hoje mesmo.`;
      } else if (textLower.includes("baixo")) {
        answer = `Os seguintes itens estão abaixo do estoque mínimo definido: ${lowItems || "Nenhum"}. Podemos configurar alertas para estes produtos.`;
      } else if (textLower.includes("como funciona") || textLower.includes("camera") || textLower.includes("câmera")) {
        answer = `Para utilizar a Câmera IA, vá na aba correspondente do menu lateral, escolha entre ligar sua webcam real ou enviar uma imagem de amostragem rápida, depois clique em 'Analisar com IA' para que o sistema conte itens automaticamente!`;
      }

      return res.json({ success: true, text: answer });
    }

    try {
      const client = getGeminiClient();
      
      // Structure messages correctly for Gemini format
      // chats.create is convenient as shown in standard helper, but maps can be simpler.
      // Let's use standard generateContent with formatted instructions
      const historyParts = messages.map(m => `${m.sender === "user" ? "Usuário" : "Assistente"}: ${m.text}`).join("\n");
      
      const finalPrompt = `${contextPrompt}\n\nHistórico do Chat:\n${historyParts}\nAssistente:`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: finalPrompt,
      });

      res.json({ success: true, text: response.text || "Desculpe, tive dificuldades para formular uma resposta no momento." });
    } catch (err: any) {
      console.error("Erro no Chatbot Gemini:", err);
      res.status(500).json({ error: "Erro ao processar conversa inteligente", details: err.message });
    }
  });

  // --- VITE MIDDLEWARE FOR DEVELOPMENT AND PRODUCTION SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartStock Express + Vite server rodando em http://localhost:${PORT}`);
  });
}

startServer();
