# 📦 SmartStock

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57)
![Express](https://img.shields.io/badge/Express.js-Backend-000000)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Sobre o Projeto

**SmartStock** é uma plataforma full-stack de gestão de estoque desenvolvida para pequenas empresas, mercados e mercearias que necessitam de controle eficiente de produtos, monitoramento em tempo real e suporte offline.

A aplicação combina recursos modernos de Inteligência Artificial, visão computacional, comandos por voz e sincronização local para oferecer uma experiência simples e produtiva mesmo sem conexão constante com a internet.

---

## ✨ Principais Funcionalidades

### 📦 Gestão de Estoque

* Cadastro de produtos
* Edição e exclusão de itens
* Controle de quantidade em estoque
* Alertas automáticos para níveis baixos e críticos

### 📊 Dashboard Inteligente

* Indicadores de estoque
* Relatórios visuais
* Monitoramento de produtos

### 📷 Análise por Imagem

* Captura através da webcam
* Upload de fotografias
* Reconhecimento visual com IA
* Sistema de fallback offline

### 🎤 Comandos por Voz

* Integração com Web Speech API
* Interpretação de comandos falados
* Operação mãos livres

### 🔒 Segurança

* Sistema de autenticação
* MFA (Multi-Factor Authentication)
* Validação por código temporário

### 🌐 Funcionamento Offline

* Cache local
* Armazenamento em LocalStorage
* Sincronização automática quando a conexão retorna

---

## 🏗️ Arquitetura

```text
Frontend (React + Vite)
        │
        ▼
API Express (TypeScript)
        │
        ▼
SQLite Local (better-sqlite3)
```

---

## 🛠️ Tecnologias Utilizadas

| Categoria           | Tecnologias                |
| ------------------- | -------------------------- |
| Frontend            | React 18, TypeScript, Vite |
| Backend             | Express.js, Node.js        |
| Estilização         | Tailwind CSS               |
| Banco de Dados      | SQLite, better-sqlite3     |
| IA                  | Google Gemini (Opcional)   |
| Visão Computacional | Webcam + Upload de Imagens |
| Voz                 | Web Speech API             |
| Testes              | Vitest                     |

---

## 📂 Estrutura do Projeto

```text
SmartStock/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── types.ts
│
├── data/
│   └── db.sqlite
│
├── server.ts
├── vite.config.ts
├── package.json
├── tsconfig.json
└── .env
```

---

## ⚙️ Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=
MFA_TIMEOUT_SECONDS=300
```

### Variáveis

| Variável            | Descrição                     |
| ------------------- | ----------------------------- |
| PORT                | Porta utilizada pelo servidor |
| NODE_ENV            | Ambiente de execução          |
| GEMINI_API_KEY      | Chave opcional do Gemini AI   |
| MFA_TIMEOUT_SECONDS | Tempo de validade do MFA      |

> Caso a chave Gemini não seja informada, o sistema continuará funcionando com respostas simuladas.

---

## 🚀 Executando Localmente

### 1. Instalar Dependências

```bash
npm install
```

### 2. Criar arquivo .env

```bash
copy nul .env
```

### 3. Iniciar Ambiente de Desenvolvimento

```bash
npm run dev
```

### 4. Acessar

```text
http://localhost:3000
```

---

## 📦 Build para Produção

Gerar build:

```bash
npm run build
```

Executar aplicação:

```bash
npm start
```

Acesse:

```text
http://localhost:3000
```

---

## 📜 Scripts Disponíveis

| Script             | Descrição                         |
| ------------------ | --------------------------------- |
| npm run dev        | Ambiente de desenvolvimento       |
| npm run build      | Build de produção                 |
| npm start          | Executa versão empacotada         |
| npm run lint       | Verificação TypeScript            |
| npm test           | Executa testes                    |
| npm run test:watch | Executa testes em modo observação |

---

## 🗄️ Banco de Dados

O projeto utiliza **SQLite local** através da biblioteca **better-sqlite3**.

### Tabelas Principais

* Usuários
* Produtos
* Scans
* Conversas do Chat
* Configurações

Características:

* Inicialização automática
* Persistência local
* Sem necessidade de servidor externo
* Arquivo ignorado pelo Git

```text
data/db.sqlite
```

---

## 🔌 Principais Endpoints

### Inventário

```http
GET    /api/inventory
POST   /api/inventory/save
POST   /api/inventory/sync
DELETE /api/inventory/:id
```

### Autenticação

```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/verify-mfa
```

### Inteligência Artificial

```http
POST /api/ai/vision
POST /api/ai/voice
POST /api/ai/chat
```

### Sistema

```http
GET /api/settings/status
GET /api/health
```

---

## 🤖 Inteligência Artificial

O SmartStock suporta integração opcional com o Google Gemini.

### Com Gemini configurado

* Análise de imagens
* Interpretação de voz
* Assistente inteligente
* Respostas contextualizadas

### Sem Gemini

* Respostas simuladas
* Operação offline
* Fluxos preservados
* Continuidade da experiência

---

## 📶 Funcionamento Offline

O sistema foi projetado para operar mesmo sem conexão.

### Recursos Disponíveis

✅ Armazenamento Local

✅ Cache de dados

✅ Sincronização automática

✅ Operação por câmera

✅ Gestão de estoque local

---

## 🧪 Testes

Executar todos os testes:

```bash
npm test
```

Executar em modo observação:

```bash
npm run test:watch
```

---

## 🔐 Boas Práticas

* Nunca versionar `data/db.sqlite`
* Nunca publicar chaves de API
* Utilizar variáveis de ambiente
* Executar testes antes do deploy
* Realizar build de produção antes da publicação

---

## 👨‍💻 Autor

Desenvolvido como projeto académico e de portfólio para demonstrar competências em:

* Desenvolvimento Full Stack
* TypeScript
* React
* Express
* SQLite
* Integração com IA
* Arquitetura Web Moderna

---

## 📄 Licença

Distribuído sob a licença MIT.

Consulte o arquivo `LICENSE` para mais informações.
