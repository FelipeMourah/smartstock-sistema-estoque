# SmartStock

SmartStock é uma plataforma full-stack de gestão de estoque construída para pequenas empresas e mercearias que precisam de controle rápido, visualização inteligente e suporte offline.

## Visão Geral

O projeto combina:
- Frontend React com TypeScript e Vite
- Backend Express em TypeScript
- Persistência local em SQLite (`data/db.sqlite`)
- Câmera inteligente para captura de imagens via webcam
- Upload de fotos para análise de estoque
- Comandos por voz com Web Speech API
- Fluxo de login com código MFA simulado
- Dashboard de indicadores e relatórios de estoque

## Recursos Principais

- Cadastro, edição e exclusão de produtos
- Contagem de estoque com alertas de baixo e crítico
- Sincronização local/offline com cache em `localStorage`
- Análise via imagem com fallback para IA simulada
- Assistente virtual de chat com fallback on-premise
- Painel de configurações com status de servidor, MFA e API
- Build de produção e empacotamento do backend para deploy

## Tecnologias Utilizadas

- React 18 + TypeScript
- Vite
- Express.js
- Tailwind CSS
- @google/genai (opcional, apenas se `GEMINI_API_KEY` estiver configurada)
- WebRTC / `navigator.mediaDevices.getUserMedia`
- Web Speech API
- `better-sqlite3` / SQLite local para banco de dados
- Vitest para testes

## Estrutura do Repositório

- `src/` → frontend React
- `src/components/` → componentes principais da UI
- `src/types.ts` → tipos TypeScript compartilhados
- `server.ts` → backend Express, API e integração com Vite
- `data/db.sqlite` → banco de dados local SQLite
- `package.json` → dependências e scripts
- `tsconfig.json` → configuração TypeScript
- `vite.config.ts` → configuração de desenvolvimento Vite
- `.gitignore` → arquivos ignorados, incluindo `data/db.*`

## Scripts Disponíveis

- `npm install` → instala dependências
- `npm run dev` → inicia o servidor de desenvolvimento (Express + Vite)
- `npm run build` → compila frontend e empacota servidor para produção
- `npm start` → executa o servidor empacotado em `dist/server.cjs`
- `npm run lint` → verifica o TypeScript sem gerar saída
- `npm test` → executa testes com Vitest
- `npm run test:watch` → executa Vitest em modo observação

## Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo:

```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=
MFA_TIMEOUT_SECONDS=300
```

### Variáveis importantes

- `PORT` → porta onde o servidor Express irá rodar
- `NODE_ENV` → define o modo `development` ou `production`
- `GEMINI_API_KEY` → chave opcional para usar o Gemini AI nas rotas de visão, voz e chat
- `MFA_TIMEOUT_SECONDS` → tempo de expiração do código MFA

> Se `GEMINI_API_KEY` não estiver definida, o sistema utiliza respostas simuladas e funcionalidades offline.
## Banco de Dados

A persistência foi migrada para SQLite local via `better-sqlite3`, guardando o arquivo em `data/db.sqlite`.

- Usuários, itens, scans e chats ficam armazenados em tabelas SQLite
- A aplicação inicializa as tabelas automaticamente ao iniciar
- O arquivo `data/db.sqlite` fica ignorado pelo `.gitignore`
## Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo `.env` se quiser configurar porta ou IA:
   ```bash
   copy nul .env
   ```
   Edite o `.env` com as variáveis necessárias.
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Abra no navegador em:
   ```
   http://localhost:3000
   ```

## Build para Produção

1. Gere o build do frontend e empacote o backend:
   ```bash
   npm run build
   ```
2. Inicie o servidor empacotado:
   ```bash
   npm start
   ```
3. Acesse:
   ```
   http://localhost:3000
   ```

## API Principais Endpoints

- `GET /api/inventory` → lista de produtos
- `POST /api/inventory/save` → salva ou atualiza um produto
- `POST /api/inventory/sync` → sincroniza itens offline com o banco
- `DELETE /api/inventory/:id` → remove item
- `POST /api/auth/login` → login com MFA
- `POST /api/auth/register` → cadastro de usuário
- `POST /api/auth/verify-mfa` → validação do código MFA
- `POST /api/ai/vision` → análise de imagem / visão computacional
- `POST /api/ai/voice` → interpretação de comando de voz
- `POST /api/ai/chat` → assistente virtual inteligente
- `GET /api/settings/status` → status do backend, Gemini e MFA
- `GET /api/health` → status de saúde do servidor


## Comportamento Offline

- O frontend armazena itens em `localStorage`
- Quando o app detecta reconexão, ele tenta sincronizar com `/api/inventory/sync`
- A câmera funciona em navegadores que suportam WebRTC
- O reconhecimento de voz funciona em navegadores que suportam Web Speech API

## Como Funciona a IA

- Se `GEMINI_API_KEY` estiver configurada, as rotas de IA usam o Gemini AI para visão, voz e chat
- Se não houver chave, o backend retorna respostas simuladas e mantém o fluxo funcional
- A aplicação foi projetada para apresentar valor mesmo sem IA externa

## Testes

Execute:

```bash
npm test
```

O projeto inclui testes básicos de componente com Vitest.

## Boas Práticas

- Nunca versionar `data/db.sqlite` com dados reais
- Não colocar chaves de API em commits públicos
- Utilizar `npm run build` antes de deploy em produção

## Licença

Licença MIT

