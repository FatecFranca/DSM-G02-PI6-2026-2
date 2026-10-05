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
- [Status atual conhecido](#status-atual-conhecido)
- [Próximos passos](#próximos-passos)

---

## Visão geral

O back-end expõe uma API REST em **Node.js/Express + TypeScript**, com persistência em **PostgreSQL** via **Prisma ORM**. Há rotas para produtos, categorias, marcas, fornecedores, clientes, endereços, movimentações, lotes, inventários, alertas, auditoria, dashboard e relatórios. A existência de uma rota não implica que o front-end esteja totalmente integrado ou que todo fluxo esteja coberto por teste.

A implementação está em evolução. A documentação OpenAPI servida em `/docs` é a referência dos caminhos e métodos atuais; a tabela adiante resume os módulos, sem fixar contagens que mudam conforme as rotas evoluem. O uso dos fluxos persistentes requer PostgreSQL acessível e migrations aplicadas.

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
│   ├── schema.prisma          # Modelo de dados (13 entidades, 11 enums)
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

A API sobe por padrão em `http://localhost:3001`. A rota raiz (`/`) exibe um painel HTML; `/docs` abre o Swagger UI e `/docs.json` expõe a especificação OpenAPI. Rotas de saúde: `/health/live` e `/health/ready`. O servidor só começa a aceitar tráfego depois de conectar ao banco.

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
| `TEST_DATABASE_URL` | URL de banco dedicado para testes; obrigatória para Jest, com nome de banco contendo `test` |
| `PORT` | Porta HTTP da API (padrão `3001`) |
| `JWT_SECRET` | Segredo usado para assinar/verificar tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex.: `7d`) |
| `NODE_ENV` | `development` \| `test` \| `production` |

## Banco de dados

Modelado via **Prisma Schema** (`prisma/schema.prisma`) e versionado por migrations — **13 modelos** e **11 enumerações** de domínio. A aplicação de uma migration depende de um PostgreSQL configurado; não se presume aqui que o banco local ou de produção já esteja atualizado.

**Entidades principais:** `User`, `Category`, `Brand`, `Supplier`, `Customer`, `Product`, `WarehouseAddress`, `Movement`, `Lot`, `InventoryCount`, `Notification`, `AuditLog`.

**Relacionamentos-chave:**
- `Product` pertence a `Category`, `Brand` e `Supplier`; pode ocupar vários `WarehouseAddress`, ter vários `Lot` e gerar vários `Movement`.
- `Movement` referencia `Product`, `User` (autor), opcionalmente `Supplier`, `Customer`, `Lot` e endereços de origem/destino.
- `Lot` referencia `Product` e `Supplier`, e pode referenciar um endereço de armazenagem; `address` é mantido como snapshot textual.
- `InventoryCount` contém itens (`InventoryCountItem`) com quantidade esperada e contada, divergência e usuário contador.
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
- As permissões são aplicadas explicitamente nas rotas: leitura requer autenticação; operações de escrita variam por domínio e papel; movimentações são restritas aos papéis operacionais autorizados e gestão de usuários é administrativa. Consulte os guards no código e no Swagger para a regra exata de cada endpoint.
- Senhas nunca são armazenadas em texto puro — hash via `bcryptjs`.

## Segurança e qualidade

- **Helmet** — cabeçalhos HTTP de segurança;
- **CORS** habilitado para o consumo pelo front-end;
- **Rate limiting** — `globalLimiter` (200 req/15min por IP) em toda a API e `authLimiter` (20 req/15min) reservado para rotas de autenticação, mitigando força bruta;
- **Validação de entrada** via schemas Zod nas rotas que os aplicam; a cobertura e o formato de cada consulta estão documentados no Swagger e nos schemas;
- **Auditoria** (`audit.middleware.ts`) registra ação, entidade, valor antigo/novo, usuário e IP em operações críticas (`audit_logs`);
- **Tratamento centralizado de erros** (`error.middleware.ts`) via classe `AppError`, garantindo respostas de erro consistentes;
- **Logs de requisição** via Morgan (desativado em ambiente de teste).

## Testes

Há testes Jest/Supertest de endpoints e testes focados de serviços em `__tests__/`, incluindo:

- Autenticação, usuários, produtos, categorias, movimentações e armazéns;
- Segurança crítica e regras do serviço de movimentação;
- Transições e contagens por item de inventário;
- Comportamento de valor zero na curva ABC.

Os testes que acessam banco exigem `TEST_DATABASE_URL`, que deve apontar para um banco dedicado cujo nome contenha `test`. O workflow de CI sobe PostgreSQL, aplica migrations e executa a suíte. Testes unitários com Prisma simulado também são iniciados após a validação dessa variável pelo Jest.

```bash
npm run test            # roda toda a suíte (--runInBand)
npm run test:watch      # modo watch
npm run test:coverage   # gera relatório de cobertura em coverage/
```

Esta relação descreve os fluxos cobertos, não a cobertura total do backend. Os módulos e cenários sem teste precisam ser identificados e priorizados continuamente.

## Documentação interativa (Swagger)

Com a API rodando:

- `GET /` — painel HTML com a lista completa de módulos e endpoints (o mesmo conteúdo resumido na tabela abaixo);
- `GET /docs` — Swagger UI interativo;
- `GET /docs.json` — especificação OpenAPI 3.0 em JSON.

## Módulos e endpoints

Os módulos abaixo correspondem às rotas montadas pela aplicação. Consulte `/docs` para métodos, parâmetros, validações e permissões atuais. As rotas de negócio exigem autenticação, exceto cadastro/login; raiz, documentação e health checks também são públicos.

| Módulo | Base | Principais recursos |
|---|---|---|
| Autenticação | `/api/auth` | Cadastro, login, identidade e senha |
| Usuários | `/api/users` | Consulta e gestão de usuários/status |
| Produtos | `/api/products` | Listagem filtrada, detalhe, scanner e CRUD |
| Categorias e marcas | `/api/categories`, `/api/brands` | Consulta e CRUD |
| Fornecedores e clientes | `/api/suppliers`, `/api/customers` | Consulta e CRUD |
| Armazém | `/api/warehouse` | Endereços, estatísticas e CRUD |
| Movimentações | `/api/movements` | Consulta paginada e registro de operações |
| Lotes | `/api/lots` | Consulta, alertas de validade e manutenção |
| Inventário | `/api/inventory` | Planejamento, itens, contagem e transições de estado |
| Dashboard | `/api/dashboard` | Indicadores, tendências, categorias e produtos |
| Alertas | `/api/alerts` | Consulta de alertas e marcação de leitura |
| Auditoria | `/api/audit` | Consulta paginada de registros |
| Relatórios | `/api/reports` | Estoque, movimentos, lotes, inventário, fornecedores e ABC |
| Prontidão | `/health/live`, `/health/ready` | Liveness e verificação de conectividade com o banco |

> Curva ABC do backend é um relatório operacional por valor de movimentação; não equivale à tela protótipo ABC/XYZ nem a um modelo de previsão.

## Status atual conhecido

| Área | Status |
|---|---|
| Estrutura da API, autenticação e rotas | Implementadas e em evolução |
| Schema e migrations | Versionados; aplicação depende de banco PostgreSQL configurado |
| Testes | Parcial; CI configura PostgreSQL e executa os testes existentes, mas a cobertura não é exaustiva |
| Validação e tratamento de erros | Implementados em várias rotas; consulte schemas e documentação OpenAPI |
| AWS, SQS e exportação para data lake | Planejados, não implementados neste repositório |

## Próximos passos

1. Aplicar e verificar as migrations em banco dedicado antes de atualizar qualquer ambiente compartilhado;
2. Ampliar os testes de integração para fluxos sem cobertura e continuar executando o CI com PostgreSQL;
3. Revisar e paginar relatórios que ainda retornam conjuntos completos à medida que os volumes reais forem conhecidos;
4. Implementar SQS, exportação para data lake e infraestrutura AWS somente quando esses itens forem priorizados e provisionados.
