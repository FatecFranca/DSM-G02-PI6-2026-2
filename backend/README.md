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
| `STORAGE_DRIVER` | `s3` (AWS S3 ou compatível) ou `local` (pasta em disco, só desenvolvimento). Padrão: `local` |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Bucket e credenciais do driver `s3` (o IAM precisa de `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` e `s3:ListBucket` no prefixo usado) |
| `S3_FORCE_PATH_STYLE`, `S3_ENDPOINT` | Opcionais, para S3 compatível (MinIO etc.) |
| `STORAGE_KEY_PREFIX` | Prefixo das chaves no bucket (padrão `stockiq/`), útil quando o bucket é compartilhado |
| `STORAGE_URL_TTL_SECONDS` | Validade das URLs assinadas devolvidas pela API (padrão `3600`) |
| `STORAGE_MAX_IMAGE_MB` | Tamanho máximo de cada foto (padrão `5`) |
| `STORAGE_ORPHAN_GRACE_DAYS` | Carência antes de `npm run storage:cleanup` apagar fotos sem produto (padrão `7`) |
| `QUEUE_DRIVER` | `sqs` (Amazon SQS) ou `local` (fila em memória, só desenvolvimento/testes). Padrão: `local` |
| `SQS_INVENTORY_QUEUE_URL` | URL da fila de inventário (impressa por `npm run queues:setup`) |
| `SQS_REGION`, `SQS_ACCESS_KEY_ID`, `SQS_SECRET_ACCESS_KEY`, `SQS_SESSION_TOKEN`, `SQS_ENDPOINT` | Credenciais/região/endpoint do SQS. Por padrão reaproveitam as variáveis `S3_*`. O token é só para credenciais temporárias (AWS Academy) |
| `QUEUE_VISIBILITY_TIMEOUT_SECONDS`, `QUEUE_MAX_RECEIVES` | Prazo de visibilidade (padrão `120`) e tentativas antes da DLQ (padrão `3`; igual ao `maxReceiveCount` da fila) |
| `QUEUE_WORKER` | `embedded` (padrão: a API também consome a fila) ou `off` (use `npm run worker` em outro processo) |
| `INVENTORY_BATCH_SIZE` | Itens por lote no ajuste de estoque (padrão `25`) |
| `OPENAI_API_KEY` | Chave da OpenAI para identificar produtos por foto (só no servidor). Sem ela, `POST /api/ai/identify-product` responde 503 |
| `OPENAI_VISION_MODEL`, `OPENAI_BASE_URL` | Modelo com visão (padrão `gpt-4o-mini`) e endpoint (padrão `https://api.openai.com/v1`) |
| `SALES_MODEL_URL`, `SALES_MODEL_TIMEOUT_MS` | Serviço de simulação de vendas (`ml-service`, padrão `http://localhost:8100`) |
| `LOT_STATUS_JOB`, `LOT_STATUS_INTERVAL_MINUTES` | Job do status dos lotes: `off` desliga; intervalo em minutos (padrão `60`) |
| `STORAGE_LOCAL_DIR`, `STORAGE_SIGNING_SECRET`, `API_PUBLIC_URL` | Driver `local`: pasta das fotos, segredo que assina as URLs de `/api/files` (obrigatório) e a URL pública da API |

## Upload de fotos de produto

`POST /api/products/:id/image` (admin e supervisor) recebe `multipart/form-data` com o arquivo no campo **`image`** e o envia para o S3; `DELETE /api/products/:id/image` remove. As respostas de produto (`GET /api/products`, `/:id`, `/scan/:code`) trazem `imageUrl` como **URL assinada temporária** — o bucket pode continuar privado.

- **Validação:** JPEG, PNG, WebP ou GIF, até `STORAGE_MAX_IMAGE_MB`. O tipo é conferido pelo *conteúdo* do arquivo (não pelo que o cliente declara) e SVG é recusado.
- **Armazenamento:** chave `<prefixo>products/<idDoProduto>/<uuid>.<ext>`; o banco guarda só a chave (`products.imageKey`).
- **Consistência:** envia o novo objeto → grava no banco (se falhar, apaga o novo) → só então apaga o antigo. Excluir o produto também apaga a foto.
- **Órfãos:** `npm run storage:cleanup -- --dry-run` lista (e sem `--dry-run` apaga) objetos que nenhum produto referencia e que passaram da carência.
- **Migration:** `20261019120000_add_product_image_key` adiciona a coluna `imageKey`; aplique com `npm run prisma:migrate` (dev) ou `npx prisma migrate deploy`.

## Mensageria: ajuste de estoque do inventário (SQS)

Concluir um inventário (`review → completed`) não ajusta mais o estoque dentro da requisição: a API grava `jobStatus = pending`, **publica uma mensagem na fila** e responde na hora. Um **worker** consome a fila e registra, para cada item com divergência, uma movimentação `inventory` (o estoque passa a ser a quantidade contada). Assim a operação pesada não disputa recursos com as requisições HTTP.

```
PATCH /api/inventory/:id {status: completed} ─► grava jobStatus=pending ─► SQS (stockiq-inventory) ─► worker ─► movimentações + estoque
                                                                              └─ falhou N vezes ─► DLQ (stockiq-inventory-dlq)
```

- **Estados do job** (`jobStatus`): `pending` → `processing` → `completed`; `partial` (algum item precisa de ajuste manual, ex.: produto em vários endereços/lotes) ou `failed`. Progresso em `adjustedItems`/`failedItems`; o motivo por item fica em `adjustmentError`.
- **Entrega pelo menos uma vez, processamento idempotente:** cada item só é ajustado se `adjustedAt` for nulo, e essa marca é gravada na mesma transação da movimentação — reentregas e reprocessamentos não duplicam ajustes.
- **Falhas:** erro de regra de negócio num item não derruba o job (vira pendência manual). Erro inesperado (ex.: banco fora do ar) devolve a mensagem à fila; após `QUEUE_MAX_RECEIVES` tentativas o job vira `failed` e a fila move a mensagem para a DLQ. Mensagem malformada é descartada.
- **Reprocessar:** `POST /api/inventory/:id/reprocess` (admin/supervisor) reenfileira jobs `failed`, `partial` ou travados há mais de 15 min.
- **Onde roda o worker:** por padrão dentro da API (`QUEUE_WORKER=embedded`). Em produção, rode `npm run worker` (ou `npm run worker:start` após o build) em outro processo e use `QUEUE_WORKER=off` na API; é possível escalar vários workers (consumidores concorrentes).
- **Criar as filas:** `npm run queues:setup` cria `<prefixo>-inventory` e `<prefixo>-inventory-dlq` (com redrive) e imprime as variáveis. O usuário IAM precisa de `sqs:CreateQueue`, `sqs:GetQueueUrl`, `sqs:GetQueueAttributes` e `sqs:SetQueueAttributes` para o setup, e de `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage` e `sqs:GetQueueAttributes` para a aplicação.
- **Sem AWS:** `QUEUE_DRIVER=local` usa uma fila em memória (mensagens se perdem ao reiniciar). Para testar o driver SQS localmente: `docker run -d --rm -p 127.0.0.1:9324:9324 softwaremill/elasticmq-native` e `SQS_TEST_ENDPOINT=http://127.0.0.1:9324 npm test -- queue-sqs-integration`.
- **Migration:** `20261019150000_inventory_async_processing` (status do job e marcas por item).
- Inventários concluídos antes deste recurso têm `jobStatus = null` e **não** são reprocessados (seus ajustes nunca foram aplicados ao estoque).

## IA: identificação de produto por foto (OpenAI)

`POST /api/ai/identify-product` (admin, supervisor e operador) recebe a foto em `multipart/form-data` (campo `image`; JPEG, PNG, WebP ou GIF até 5 MB) e a envia a um modelo de visão da OpenAI. A resposta traz nome, categoria, marca e descrição **já casados com as categorias e marcas do catálogo** e até 5 **produtos parecidos** já cadastrados (para evitar duplicar o cadastro). Cada chamada custa no provedor, então há um limite próprio (30 por 10 minutos por IP em produção).

- **Chave só no servidor:** `OPENAI_API_KEY` nunca vai ao navegador nem é registrada em log. Sem ela → 503; chave recusada → 503; limite do provedor → 429; falha/resposta inesperada → 502; timeout → 504.
- **Entrada validada:** o tipo é conferido pelo conteúdo (mesma regra das fotos de produto) e a imagem vai como `detail: low` para limitar custo.
- **Resposta estruturada:** o modelo devolve JSON, validado por schema (Zod) antes de ser usado.
- **Telas:** web `IA — Produtos` e app mobile (`ia`); o botão *Cadastrar com estes dados* abre o cadastro pré-preenchido.

## Simulação de vendas (modelos do notebook)

`GET /api/simulation/status`, `GET /api/simulation/model` e `POST /api/simulation/predict` (qualquer usuário autenticado) fazem a ponte com o serviço Python em [`ml-service/`](../ml-service/README.md), que serve os modelos de regressão do notebook `machine-learning/Previsao_Vendas.ipynb` (reproduzidos sem alterar o notebook; mesmas métricas). O backend valida o cenário (Zod), exige JWT e traduz falhas do serviço: fora do ar → 503 com a instrução `npm run ml:service`; treinando → 503; cenário inválido → 422. A tela web `Simulação de Vendas` usa essas rotas.

## Rotinas em segundo plano

- **Worker do inventário** (`npm run worker`, ou embutido na API): ver *Mensageria* acima.
- **Status dos lotes** (`src/jobs/lot-status.job.ts`): ao subir a API/worker e a cada `LOT_STATUS_INTERVAL_MINUTES` (60), atualiza `valid`/`expiring`/`expired` conforme a validade (janela de alerta das configurações); `quarantine` é manual. Antes o status só era corrigido quando alguém consultava lotes ou o dashboard. É idempotente e não se sobrepõe a uma execução lenta.
- **Alertas no sino:** além de estoque e validade, avisa quando o ajuste de estoque de um inventário **falha** (crítico) ou termina **com pendências** (atenção); a chave inclui o estado, então uma mudança volta a notificar.

## Banco de dados

Modelado via **Prisma Schema** (`prisma/schema.prisma`) e versionado por migrations — **14 modelos**, **12 enumerações** de domínio e **5 migrations**. As migrations aplicam do zero em um banco vazio (verificado em 19/10/2026); o banco de desenvolvimento/produção precisa rodar `npx prisma migrate deploy` — não se presume que já esteja atualizado.

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
| Produtos | `/api/products` | Listagem filtrada, detalhe, scanner, CRUD e foto (upload para S3) |
| IA | `/api/ai` | Identificação de produto por foto (OpenAI) |
| Simulação | `/api/simulation` | Simulação de vendas com os modelos do notebook (serviço Python) |
| Categorias e marcas | `/api/categories`, `/api/brands` | Consulta e CRUD |
| Fornecedores e clientes | `/api/suppliers`, `/api/customers` | Consulta e CRUD |
| Armazém | `/api/warehouse` | Endereços, estatísticas e CRUD |
| Movimentações | `/api/movements` | Consulta paginada e registro de operações |
| Lotes | `/api/lots` | Consulta, alertas de validade e manutenção |
| Inventário | `/api/inventory` | Planejamento, itens, contagem, transições de estado e ajuste de estoque assíncrono (fila SQS) |
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
| Testes | Jest + Supertest com PostgreSQL real (CI e Docker); inclui testes dos fluxos de foto (S3) e de ajuste assíncrono do inventário. A cobertura não é exaustiva |
| Validação e tratamento de erros | Implementados em várias rotas; consulte schemas e documentação OpenAPI |
| Fotos de produto (S3) | Implementadas (driver `s3` e `local`); bucket configurado via `.env`. Upload real ao bucket ainda não exercitado nos testes automatizados |
| IA por foto (OpenAI) | Implementada e testada com respostas simuladas do provedor; requer `OPENAI_API_KEY` no servidor para uso real |
| Simulação de vendas | Implementada; requer o serviço `ml-service` no ar (`npm run ml:service`) |
| Status dos lotes | Atualizado por job periódico (e a cada leitura) |
| Mensageria (SQS) | Implementada (fila, worker, DLQ, reprocessamento) e validada contra um servidor SQS compatível (ElasticMQ); a fila na conta AWS depende de um usuário IAM com permissões de SQS (`npm run queues:setup`) |
| EC2/Load Balancer e exportação para data lake | Planejados, não implementados neste repositório |

## Próximos passos

1. Aplicar e verificar as migrations em banco dedicado antes de atualizar qualquer ambiente compartilhado;
2. Ampliar os testes de integração para fluxos sem cobertura e continuar executando o CI com PostgreSQL;
3. Revisar e paginar relatórios que ainda retornam conjuntos completos à medida que os volumes reais forem conhecidos;
4. Criar a fila SQS na conta AWS do projeto (`npm run queues:setup`) e rodar o worker em processo separado (`QUEUE_WORKER=off` na API);
5. Implementar exportação para data lake e o restante da infraestrutura AWS (EC2, Load Balancer) quando priorizados e provisionados.
