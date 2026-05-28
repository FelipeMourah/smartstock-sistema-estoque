# SmartStock

[Visão Geral](https://github.com/FelipeMourah/smartstock-sistema-estoque/tree/develop#smartstock)

SmartStock é uma solução web de gestão de estoque projetada para oferecer automação, visão computacional e um fluxo de trabalho intuitivo para estabelecimentos comerciais.

## Objetivo

[Objetivo](https://github.com/FelipeMourah/smartstock-sistema-estoque/tree/develop#objetivo)

Criar uma plataforma robusta e adaptável para controle de inventário, capaz de suportar processos de entrada e saída de produtos, gerenciamento offline e integração com inteligência visual para captura de imagens.

## Principais Funcionalidades

- Gestão de produtos com cadastro, edição e remoção
- Dashboard de controle com indicadores de estoque
- Captura de imagem via webcam e galeria de fotos
- Reconhecimento de voz para lançamento de estoque
- Modo offline com sincronização quando online
- Configurações de usuário e redefinição de dados

## Tecnologias

[Tecnologias](https://github.com/FelipeMourah/smartstock-sistema-estoque/tree/develop#tecnologias)

- React + TypeScript
- Vite
- Express.js
- Tailwind CSS
- WebRTC / getUserMedia
- Web Speech API
- JSON local (data/db.json)

> Observação: o README original mencionava Python, FastAPI e OpenCV como futuras integrações. Atualmente, o projeto está implementado em JavaScript/TypeScript com backend Express.

## Estrutura do Repositório

[Estrutura](https://github.com/FelipeMourah/smartstock-sistema-estoque/tree/develop#estrutura)

- `src/` → código-fonte do frontend e componentes React
- `server.ts` → backend Express e endpoints de API
- `data/` → banco local em JSON para armazenamento de dados
- `assets/` → recursos estáticos e imagens
- `package.json` → dependências e scripts do projeto
- `tsconfig.json` → configuração TypeScript
- `vite.config.ts` → configuração do Vite

## Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Abra o navegador em:
   ```
   http://localhost:3000
   ```

## Nota sobre Chaves de API

O sistema já suporta captura de imagem e áudio com APIs nativas do navegador, sem exigir chave externa para essas funcionalidades. A integração com serviços de IA externos pode ser adicionada posteriormente via configuração de variáveis de ambiente.

## Observações

- Não inclua dados sensíveis no repositório.
- O arquivo `data/db.json` deve ser tratado como fonte local de dados e pode ser ignorado no controle de versão.

## Licença

Licença a ser definida conforme requisitos do projeto.

