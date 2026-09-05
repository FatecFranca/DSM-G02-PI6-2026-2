# StockIQ API — Backend

**API REST** do StockIQ (WMS / ERP Lite), responsável por toda a regra de negócio, persistência e autenticação do sistema. Consumida pelo [front-end Next.js](../frontend/README.md) via HTTP/JSON.

> Parte do Projeto Integrador do 6º semestre — FATEC Franca (Desenvolvimento de Software Multiplataforma), integrando **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura em camadas](#arquitetura-em-camadas)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Autenticação e controle de acesso](#autenticação-e-controle-de-acesso)
- [Segurança e qualidade](#segurança-e-qualidade)
- [Testes](#testes)
- [Documentação interativa (Swagger)](#documentação-interativa-swagger)
- [Módulos e endpoints](#módulos-e-endpoints)
- [Status da Sprint 1](#status-da-sprint-1)
- [Próximos passos](#próximos-passos-pós-sprint-1)

---

## Visão geral

O back-end expõe uma API REST em **Node.js/Express + TypeScript**, com persistência em **PostgreSQL** via **Prisma ORM**. Cobre o ciclo completo de operação de um armazém: produtos, categorias, marcas, fornecedores, clientes, endereçamento físico, movimentações de estoque, lotes com controle de validade, contagens de inventário, alertas automáticos, auditoria, dashboard e relatórios gerenciais (incluindo curva ABC).

Nesta Sprint 1 a API já está **funcional, autenticada, validada, documentada e testada** — o foco foi consolidar a base estrutural (rotas → controllers → services → validação → banco de dados) que sustentará as próximas sprints, incluindo a fila de mensageria assíncrona e o pipeline de exportação de dados para mineração.

## Stack tecnológica

| Camada | Tecnologia | Finalidade |
|---|---|---|
| Linguagem | TypeScript | Tipagem estática, redução de erros em tempo de execução |
| Framework HTTP | Express.js | Roteamento e middlewares da API REST |
| ORM | Prisma 6 | Modelagem, migrations e acesso ao PostgreSQL |
| Autenticação | jsonwebtoken + bcryptjs | Login com token JWT e hash de senha |
| Validação | Zod | Validação de payloads de entrada por schema |
| Segurança | Helmet, CORS, express-rate-limit | Cabeçalhos seguros, controle de origem e limite de requisições |
| Documentação | swagger-jsdoc + swagger-ui-express | Documentação interativa da API (`/docs`) |
| Testes | Jest + Supertest | Testes automatizados de integração dos endpoints |
| Logs | Morgan | Log de requisições HTTP em desenvolvimento |

## Arquitetura em camadas

```
Requisição HTTP
      │
      ▼
   routes/        define o endpoint e aplica authenticate/authorize + validate
      │
      ▼
 controllers/      recebe req/res, delega a lógica ao service
      │
      ▼
  services/         regra de negócio, acesso ao Prisma Client
      │
      ▼
   Prisma ORM  ──►  PostgreSQL
```

Middlewares transversais (`middleware/`) cuidam de autenticação, autorização por papel, validação de schema, auditoria, rate limiting e tratamento centralizado de erros — nenhuma dessas preocupações vaza para dentro dos controllers/services.

## Estrutura de pastas

```
backend/
├── src/
│   ├── app.ts                # Configuração do Express, middlewares globais e registro de rotas
│   ├── server.ts             # Bootstrap: conecta ao banco e sobe o servidor HTTP
│   ├── config/
│   │   └── swagger.ts        # Definição OpenAPI (swagger-jsdoc)
│   ├── routes/                # Um arquivo por módulo, define endpoints + guards de acesso
│   ├── controllers/           # Um arquivo por módulo, recebe req/res
│   ├── services/              # Um arquivo por módulo, regra de negócio + Prisma
│   ├── schemas/                # Schemas Zod de validação de entrada, um por módulo
│   ├── middleware/
│   │   ├── auth.middleware.ts       # authenticate (JWT) + authorize (por papel)
│   │   ├── validate.middleware.ts   # validate/validateQuery (Zod)
│   │   ├── audit.middleware.ts      # Registro de auditoria em operações críticas
│   │   ├── error.middleware.ts      # Tratamento centralizado de erros (AppError)
│   │   └── rate-limit.middleware.ts # globalLimiter + authLimiter
│   └── prisma/
│       └── client.ts          # Instância singleton do Prisma Client
├── prisma/
│   ├── schema.prisma          # Modelo de dados (12 entidades, 11 enums)
│   ├── seed.ts                # Massa de dados de teste/demonstração
│   └── migrations/            # Histórico de migrations versionadas
├── __tests__/                 # Testes de integração (Jest + Supertest)
├── jest.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

## Como rodar o projeto

Pré-requisitos: Node.js 18+ e uma instância PostgreSQL acessível.

```bash
cd backend
npm install

# copie o exemplo de variáveis de ambiente e ajuste os valores
cp .env.example .env

# aplica as migrations no banco configurado em DATABASE_URL
npm run prisma:migrate

# (opcional) popula o banco com dados de demonstração
npm run prisma:seed

# sobe a API em modo desenvolvimento (hot-reload)
npm run dev
```

A API sobe por padrão em `http://localhost:3001`. A rota raiz (`/`) exibe um painel HTML com a lista completa de módulos e endpoints; `/docs` abre o Swagger UI.

Outros scripts disponíveis:

```bash
npm run build            # compila TypeScript para dist/
npm run start            # roda o build de produção (dist/server.js)
npm run prisma:studio    # abre o Prisma Studio (GUI do banco)
npm run test             # roda a suíte de testes (Jest + Supertest)
npm run test:coverage    # roda os testes com relatório de cobertura
```

## Variáveis de ambiente

Definidas em `.env` (veja `.env.example`):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL (`postgresql://user:senha@host:porta/banco`) |
| `PORT` | Porta HTTP da API (padrão `3001`) |
| `JWT_SECRET` | Segredo usado para assinar/verificar tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex.: `7d`) |
| `NODE_ENV` | `development` \| `test` \| `production` |

## Banco de dados

Modelado via **Prisma Schema** (`prisma/schema.prisma`) e versionado por migrations — **12 entidades** e **11 enumerações** de domínio.

**Entidades principais:** `User`, `Category`, `Brand`, `Supplier`, `Customer`, `Product`, `WarehouseAddress`, `Movement`, `Lot`, `InventoryCount`, `Notification`, `AuditLog`.

**Relacionamentos-chave:**
- `Product` pertence a `Category`, `Brand` e `Supplier`; pode ocupar vários `WarehouseAddress`, ter vários `Lot` e gerar vários `Movement`.
- `Movement` referencia `Product`, `User` (autor), opcionalmente `Supplier`/`Customer` e endereços de origem/destino (`fromAddress`/`toAddress`).
- `Lot` referencia `Product` e `Supplier`, com status calculado (`valid` · `expiring` · `expired` · `quarantine`).
- `AuditLog` e `Notification` referenciam `User`.

**Principais enumerações de domínio:**

| Enum | Valores |
|---|---|
| `UserRole` | `admin` · `supervisor` · `operator` · `viewer` |
| `MovementType` | `entry` · `exit` · `transfer` · `loss` · `adjustment` · `inventory` |
| `LotStatus` | `valid` · `expiring` · `expired` · `quarantine` |
| `PositionStatus` | `free` · `occupied` · `blocked` · `reserved` |
| `InventoryCountType` / `Status` | `full`·`partial`·`cyclic` / `planned`·`in_progress`·`review`·`completed` |

Consulte o diagrama entidade-relacionamento completo em [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Autenticação e controle de acesso

- Login via `POST /api/auth/login` (e-mail/senha) retorna um **token JWT**, que deve ser enviado em requisições protegidas como `Authorization: Bearer <token>`.
- `middleware/auth.middleware.ts` expõe dois guards:
  - `authenticate` — valida o token e popula `req.user` (`sub`, `email`, `role`);
  - `authorize(...roles)` — restringe o endpoint a papéis específicos.
- O acesso é **hierárquico**: `viewer` < `operator` < `supervisor` < `admin` — cada papel herda as capacidades do papel abaixo, acrescentando novas. Na prática, a maioria das rotas de leitura exige apenas `authenticate`, escritas sensíveis exigem `supervisor`, e exclusões/gestão de usuários exigem `admin`.
- Senhas nunca são armazenadas em texto puro — hash via `bcryptjs`.

## Segurança e qualidade

- **Helmet** — cabeçalhos HTTP de segurança;
- **CORS** habilitado para o consumo pelo front-end;
- **Rate limiting** — `globalLimiter` (200 req/15min por IP) em toda a API e `authLimiter` (20 req/15min) reservado para rotas de autenticação, mitigando força bruta;
- **Validação de entrada centralizada** via schemas Zod (`src/schemas`), um por módulo — nenhum payload chega à regra de negócio sem passar por validação;
- **Auditoria** (`audit.middleware.ts`) registra ação, entidade, valor antigo/novo, usuário e IP em operações críticas (`audit_logs`);
- **Tratamento centralizado de erros** (`error.middleware.ts`) via classe `AppError`, garantindo respostas de erro consistentes;
- **Logs de requisição** via Morgan (desativado em ambiente de teste).

## Testes

Suíte de testes de integração com **Jest + Supertest** em `__tests__/`, cobrindo os fluxos de:

- Autenticação (`auth.test.ts`)
- Usuários (`user.test.ts`)
- Produtos (`product.test.ts`)
- Categorias (`category.test.ts`)
- Movimentações (`movement.test.ts`)
- Armazéns (`warehouse.test.ts`)

```bash
npm run test            # roda toda a suíte (--runInBand)
npm run test:watch      # modo watch
npm run test:coverage   # gera relatório de cobertura em coverage/
```

Módulos ainda sem cobertura de teste (fornecedores, clientes, lotes, inventário, relatórios) estão listados como próximo passo pós-Sprint 1.

## Documentação interativa (Swagger)

Com a API rodando:

- `GET /` — painel HTML com a lista completa de módulos e endpoints (o mesmo conteúdo resumido na tabela abaixo);
- `GET /docs` — Swagger UI interativo;
- `GET /docs.json` — especificação OpenAPI 3.0 em JSON.

## Módulos e endpoints

**15 módulos** e **67 endpoints REST**, com autenticação via JWT e 3 níveis efetivos de controle de acesso (autenticado padrão, supervisor, admin). Todas as rotas exigem autenticação exceto onde indicado.

| Módulo | Base | Endpoints |
|---|---|---|
| Autenticação | `/api/auth` | `POST /register` · `POST /login` · `GET /me` · `GET /profile` · `PATCH /password` |
| Usuários | `/api/users` | `GET /` · `GET /:id` · `POST /` 🔒admin · `PATCH /:id` 🔒admin · `DELETE /:id` 🔒admin |
| Produtos | `/api/products` | `GET /scan/:code` · `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Categorias | `/api/categories` | `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Marcas | `/api/brands` | `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Fornecedores | `/api/suppliers` | `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Clientes | `/api/customers` | `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Armazéns | `/api/warehouse` | `GET /` · `GET /:id` · `POST /` 🛡supervisor · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Movimentações | `/api/movements` | `GET /` · `GET /:id` · `POST /` |
| Lotes | `/api/lots` | `GET /` · `GET /:id` · `POST /` · `PATCH /:id` 🛡supervisor · `DELETE /:id` 🔒admin |
| Inventário | `/api/inventory` | `GET /` · `GET /low-stock` · `GET /expiring` · `GET /:productId` |
| Dashboard | `/api/dashboard` | `GET /summary` · `GET /movements` · `GET /top-products` |
| Alertas | `/api/alerts` | `GET /` · `GET /stock` · `GET /expiring` · `PATCH /read-all` · `PATCH /:id/read` |
| Auditoria | `/api/audit` | `GET /` 🔒admin · `GET /:id` 🔒admin |
| Relatórios | `/api/reports` | `GET /movements` · `GET /stock` · `GET /lots` · `GET /warehouse` · `GET /abc` · `GET /inventory` · `GET /suppliers` |

🛡 = requer papel `supervisor` (ou superior) · 🔒 = requer papel `admin`

> O endpoint `GET /api/reports/abc` (curva ABC) é a primeira entrega concreta de análise de dados do projeto, servindo de base para o módulo de Mineração de Dados (ver [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)).

## Status da Sprint 1

| Entrega mínima | Status |
|---|---|
| Estrutura da API em camadas (routes → controllers → services) | ✅ Concluído |
| Autenticação JWT + controle de acesso por papel | ✅ Concluído |
| 15 módulos / 67 endpoints implementados | ✅ Concluído |
| Validação de entrada via Zod em todos os módulos | ✅ Concluído |
| Modelo de dados via Prisma (12 entidades, 11 enums) | ✅ Concluído |
| Segurança (Helmet, CORS, rate limiting) | ✅ Concluído |
| Auditoria de operações críticas | ✅ Concluído |
| Documentação interativa (Swagger/OpenAPI) | ✅ Concluído |
| Suíte de testes automatizados (fluxos principais) | ✅ Concluído |
| Fila de mensageria assíncrona (SQS) | ⏳ Próxima sprint |
| Pipeline de exportação de dados para mineração | ⏳ Próxima sprint |

## Próximos passos (pós-Sprint 1)

1. Implementar a fila de mensageria assíncrona (Amazon SQS) para alertas, relatórios pesados e eventos de movimentação — ver [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md);
2. Construir o pipeline de exportação de dados operacionais para o "data lake" (S3), alimentando o módulo de Mineração de Dados;
3. Escrever testes automatizados para os módulos ainda não cobertos (fornecedores, clientes, lotes, inventário, relatórios);
4. Modelar índices adicionais para consultas analíticas e avaliar particionamento da tabela `movements` conforme o volume crescer;
5. Provisionar a infraestrutura AWS (VPC, EC2, Load Balancer) e automatizar o deploy.
