import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import sqlite3 from "sqlite3";
import { open, Database as SqliteDatabase } from "sqlite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const MFA_TIMEOUT_SECONDS = Number(process.env.MFA_TIMEOUT_SECONDS) || 300;
const mfaCodes: Record<string, { code: string; expiresAt: number }> = {};

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "db.sqlite");
let sqlite: SqliteDatabase | null = null;

interface DbSchema {
  users: any[];
  items: any[];
  scans: any[];
  chats: any[];
}

async function initializeDatabase() {
  sqlite = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await sqlite.exec("PRAGMA journal_mode = WAL;");

  await sqlite.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    lastName TEXT,
    businessName TEXT NOT NULL,
    businessType TEXT NOT NULL
  )`);

  await sqlite.exec(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL,
    minStock INTEGER NOT NULL,
    lastScan TEXT NOT NULL,
    status TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  )`);

  await sqlite.exec(`CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    itemsDetected TEXT NOT NULL
  )`);

  await sqlite.exec(`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL
  )`);

  const userCountRow: any = await sqlite.get("SELECT COUNT(*) as count FROM users");
  const userCount = userCountRow?.count || 0;
  if (userCount === 0) {
    await sqlite.run(`INSERT INTO users (id, email, password, name, lastName, businessName, businessType) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      "demo-user", "joao@email.com", "SmartStock123!", "João", "Silva", "Mercadinho do João", "Mercadinho / Mercearia");
  }

  const itemCountRow: any = await sqlite.get("SELECT COUNT(*) as count FROM items");
  const itemCount = itemCountRow?.count || 0;
  if (itemCount === 0) {
    const initialItems = [
      ["1", "Arroz Tio João 5kg", "Grãos", 2, 10, "Hoje 09:14", "Crítico", 1],
      ["2", "Óleo de Soja 900ml", "Alimentação", 5, 8, "Hoje 09:14", "Baixo", 1],
      ["3", "Refrigerante 2L", "Bebidas", 120, 20, "Ontem 17:30", "Ok", 1],
      ["4", "Água Mineral 500ml", "Bebidas", 98, 30, "Ontem 17:30", "Ok", 1],
      ["5", "Sabão em Pó 1kg", "Limpeza", 1, 5, "Hoje 09:15", "Crítico", 1],
      ["6", "Biscoito Recheado", "Mercearia", 80, 15, "02/04 14:22", "Ok", 1],
      ["7", "Leite Integral 1L", "Laticínios", 66, 12, "02/04 14:22", "Ok", 1],
      ["8", "Feijão Carioca 1kg", "Grãos", 3, 10, "Hoje 09:15", "Baixo", 1],
      ["9", "Açúcar Cristal 1kg", "Grãos", 50, 10, "01/04 11:00", "Ok", 1]
    ];
    await sqlite.run('BEGIN TRANSACTION');
    try {
      for (const row of initialItems) {
        await sqlite.run(`INSERT INTO items (id, name, category, stock, minStock, lastScan, status, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, ...row as any);
      }
      await sqlite.run('COMMIT');
    } catch (e) {
      await sqlite.run('ROLLBACK');
      throw e;
    }
  }

  const scanCountRow: any = await sqlite.get("SELECT COUNT(*) as count FROM scans");
  const scanCount = scanCountRow?.count || 0;
  if (scanCount === 0) {
    await sqlite.run(`INSERT INTO scans (id, timestamp, itemsDetected) VALUES (?, ?, ?)`,
      "scan1",
      "Hoje 09:14",
      JSON.stringify([
        { name: "Arroz 5kg (fardo)", category: "Grãos", quantity: 10 },
        { name: "Feijão 1kg", category: "Grãos", quantity: 6 },
        { name: "Óleo 900ml", category: "Alimentação", quantity: 12 }
      ])
    );
  }
}

async function readDb(): Promise<DbSchema> {
  if (!sqlite) throw new Error('Database not initialized');
  const users = await sqlite.all("SELECT * FROM users");
  const items = await sqlite.all("SELECT * FROM items");
  const scansRows = await sqlite.all("SELECT * FROM scans ORDER BY rowid DESC");
  const scans = scansRows.map((row: any) => ({ ...row, itemsDetected: JSON.parse(row.itemsDetected) }));
  const chatsRows = await sqlite.all("SELECT * FROM chats ORDER BY rowid DESC");
  const chats = chatsRows.map((row: any) => ({ ...row, content: JSON.parse(row.content) }));
  return { users, items, scans, chats };
}

async function writeDb(data: DbSchema) {
  if (!sqlite) throw new Error('Database not initialized');
  const { users = [], items = [], scans = [], chats = [] } = data;
  await sqlite.run('BEGIN TRANSACTION');
  try {
    await sqlite.run("DELETE FROM users");
    await sqlite.run("DELETE FROM items");
    await sqlite.run("DELETE FROM scans");
    await sqlite.run("DELETE FROM chats");

    for (const user of users) {
      await sqlite.run(`INSERT INTO users (id, email, password, name, lastName, businessName, businessType) VALUES (?, ?, ?, ?, ?, ?, ?)`, user.id, user.email, user.password, user.name, user.lastName || "", user.businessName, user.businessType);
    }
    for (const item of items) {
      await sqlite.run(`INSERT INTO items (id, name, category, stock, minStock, lastScan, status, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, item.id, item.name, item.category, Number(item.stock), Number(item.minStock), item.lastScan, item.status, item.synced ? 1 : 0);
    }
    for (const scan of scans) {
      await sqlite.run(`INSERT INTO scans (id, timestamp, itemsDetected) VALUES (?, ?, ?)`, scan.id, scan.timestamp, JSON.stringify(scan.itemsDetected || []));
    }
    for (const chat of chats) {
      await sqlite.run(`INSERT INTO chats (id, content) VALUES (?, ?)`, chat.id, JSON.stringify(chat.content || {}));
    }

    await sqlite.run('COMMIT');
  } catch (e) {
    await sqlite.run('ROLLBACK');
    throw e;
  }
}

// Database will be initialized before server start via promise chain below.

async function startServer() {
  const app = express();

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
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, passwordConfirm, name, lastName, businessName, businessType } = req.body;
    if (!email || !password || !passwordConfirm || !name || !businessName) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ error: "A confirmação de senha não corresponde." });
    }

    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordPolicy.test(password)) {
      return res.status(400).json({
        error: "A senha deve ter ao menos 8 caracteres, incluir maiúscula, minúscula, número e caractere especial."
      });
    }

    const db = await readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const newUser = {
      id: "user-" + Date.now(),
      email,
      password,
      name,
      lastName: lastName || "",
      businessName: businessName || "Minha Empresa",
      businessType: businessType || "Geral"
    };

    db.users.push(newUser);
    await writeDb(db);

    res.json({ success: true, user: { ...newUser, password: undefined } });
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "E-mail ou senha inválidos" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + MFA_TIMEOUT_SECONDS * 1000;
    mfaCodes[email.toLowerCase()] = { code, expiresAt };

    res.json({
      success: true,
      mfaRequired: true,
      message: "Código MFA gerado. Use o código fornecido para concluir o login.",
      mfaHint: `Insira o código SMS/Authenticator de 6 dígitos. Válido por ${MFA_TIMEOUT_SECONDS / 60} minutos.`,
      mfaCode: code
    });
  });

  // Items: Get all
  app.get("/api/inventory", async (req, res) => {
    const db = await readDb();
    res.json(db.items);
  });

  // Items: Sync bulk (syncs offline items to cloud)
  app.post("/api/inventory/sync", async (req, res) => {
    const clientItems = req.body.items || [];
    const db = await readDb();
    
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

    await writeDb(db);
    res.json({ success: true, items: db.items });
  });

  // Items: Save single
  app.post("/api/inventory/save", async (req, res) => {
    const item = req.body;
    if (!item.name) {
      return res.status(400).json({ error: "Nome do produto é obrigatório" });
    }
    const db = await readDb();
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

    await writeDb(db);
    res.json({ success: true, item: newItem, items: db.items });
  });

  // AI: Gemini status (exposed safely server-side only)
  app.get("/api/ai/status", (_req, res) => {
    res.json({
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      geminiMode: process.env.GEMINI_API_KEY ? "real" : "simulated",
    });
  });

  app.get("/api/settings/status", (_req, res) => {
    res.json({
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      geminiMode: process.env.GEMINI_API_KEY ? "real" : "simulated",
      mfaEnabled: true,
      port: PORT,
      nodeEnv: process.env.NODE_ENV || "development"
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "Healthy", nodeEnv: process.env.NODE_ENV || "development", port: PORT });
  });

  // Auth: Verify MFA code
  app.post("/api/auth/verify-mfa", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e código MFA são obrigatórios." });
    }

    const record = mfaCodes[email.toLowerCase()];
    if (!record || record.code !== code) {
      return res.status(401).json({ error: "Código MFA inválido ou expirado." });
    }

    if (Date.now() > record.expiresAt) {
      delete mfaCodes[email.toLowerCase()];
      return res.status(401).json({ error: "Código MFA expirado." });
    }

    delete mfaCodes[email.toLowerCase()];
    const db = await readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado para MFA." });
    }

    res.json({ success: true, user: { ...user, password: undefined } });
  });

  // Items: Delete
  app.delete("/api/inventory/:id", async (req, res) => {
    const { id } = req.params;
    const db = await readDb();
    db.items = db.items.filter(i => i.id !== id);
    await writeDb(db);
    res.json({ success: true, items: db.items });
  });

  // Developer endpoints to read and write the database file directly
  app.get("/api/developer/db", async (req, res) => {
    try {
      const db = await readDb();
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao ler banco de dados", details: err.message });
    }
  });

  app.post("/api/developer/db", async (req, res) => {
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
    const db = await readDb();

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
      await writeDb(db);
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
      await writeDb(db);
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

      await writeDb(db);
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

    const db = await readDb();

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
      await writeDb(db);
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

      await writeDb(db);
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

    const db = await readDb();
    
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
    app.get("*", async (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartStock Express + Vite server rodando em http://localhost:${PORT}`);
  });
}

initializeDatabase()
  .then(() => startServer())
  .catch(err => {
    console.error('Failed to initialize database or start server:', err);
    process.exit(1);
  });
