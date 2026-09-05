# Arquitetura — StockIQ

Este documento consolida a arquitetura lógica da aplicação, o modelo de dados, a arquitetura de nuvem (AWS) e o planejamento de mineração de dados definidos na Sprint 1. Conteúdo extraído e organizado a partir da documentação técnica de planejamento (`Sprint 1 - Gabriel e Lívia.pdf`), mantido aqui em Markdown para ficar versionado junto ao código.

## Índice

- [Visão lógica da aplicação](#visão-lógica-da-aplicação)
- [Casos de uso e perfis de acesso](#casos-de-uso-e-perfis-de-acesso)
- [Modelo de dados](#modelo-de-dados)
- [Arquitetura em nuvem (AWS)](#arquitetura-em-nuvem-aws)
- [Mensageria assíncrona (Amazon SQS)](#mensageria-assíncrona-amazon-sqs)
- [Mineração de dados](#mineração-de-dados)

---

## Visão lógica da aplicação

Arquitetura cliente-servidor desacoplada: o front-end consome exclusivamente a API REST do back-end, que conversa com o banco relacional através do Prisma ORM. Front-end e back-end são publicados como serviços independentes.

```
┌────────────────┐  HTTPS/JSON  ┌──────────────────────────┐  Prisma   ┌──────────────┐  SQL  ┌────────────┐
│   Front-end     │ ───────────► │        API REST           │ Client   │  Prisma ORM   │ ────► │ PostgreSQL │
│ Next.js 16/React│              │ Node.js/Express/TypeScript│ ───────► │  Migrations    │       │  (banco    │
│                 │ ◄─────────── │ JWT · Zod · Helmet · Rate │          │  Query builder │ ◄──── │ relacional)│
└────────────────┘              └──────────────────────────┘          └──────────────┘       └────────────┘
```

> Diagrama de classes e diagramas de sequência dos fluxos críticos (registro de movimentação, alerta de estoque) ficam para a sprint em que o módulo de IA analítica for integrado.

## Casos de uso e perfis de acesso

O acesso ao sistema é hierárquico: cada perfil herda as permissões do perfil imediatamente abaixo, acrescentando novas capacidades — refletindo diretamente as regras de autorização implementadas nas rotas da API (`authenticate`/`authorize` em [backend/src/middleware/auth.middleware.ts](../backend/src/middleware/auth.middleware.ts)).

```
Administrador ─┐
               │ herda de
Supervisor ─────┤
               │ herda de
Operador ───────┤
               │ herda de
Visualizador ───┘

Visualizador   → Autenticar-se · rastrear produto via scanner · consultar Dashboard/Relatórios/Alertas
Operador       → + Registrar Movimentações (entrada · saída · transferência · ajuste · contagem)
Supervisor     → + Gerenciar Produtos, Cadastros, Lotes e Endereços
Administrador  → + Gerenciar Usuários e consultar Auditoria
```

Detalhamento completo dos requisitos funcionais e não funcionais em [docs/REQUIREMENTS.md](REQUIREMENTS.md).

## Modelo de dados

Modelo lógico implementado via **Prisma Schema** e versionado por migrations — 12 entidades e 11 enumerações de domínio (`backend/prisma/schema.prisma`).

### Entidades centrais e cardinalidades

```
                 ┌───────────┐
                 │ Categoria │
                 └─────┬─────┘
                       │ 1
                       │
        ┌───────┐    N │    ┌──────────────────┐
        │ Marca │──N───┼────│  Endereço de      │
        └───────┘      │  N │  Armazém          │
                       ┌▼────▼─┐                └─────┬──────┘
                       │Produto │ 1                  1│ N
   ┌────────────┐  N   │        │──────┐    ┌─────────▼──────┐
   │ Fornecedor │──────┤        │      │ N  │  Movimentação   │
   └─────┬──────┘   1  └───┬────┘    ┌─▼────┤                 │
         │ N            N  │ 1       │      └────────┬────────┘
         │             ┌───▼───┐     │               │ N
         │             │ Lote  │─────┘               │
         │             └───────┘                     │ 1
         │ 1                                   ┌──────▼─────┐
   ┌─────▼────┐                                 │  Usuário   │
   │ Cliente  │                                 └────────────┘
   └──────────┘
```

### Tabelas centrais

**`products`**

| Campo | Tipo | Observações |
|---|---|---|
| `id` | String (cuid) | PK |
| `name`, `internalCode`, `sku`, `barcode` | String | `sku`, `barcode` e `internalCode` únicos |
| `unit`, `weight`, `width`, `height`, `depth` | String / Float | Dados logísticos do item |
| `purchasePrice`, `salePrice` | Float | Precificação |
| `minStock`, `maxStock`, `currentStock` | Int | Base para alertas de ruptura/excesso |
| `status` | Enum `ProductStatus` | `active` · `inactive` · `discontinued` |
| `categoryId`, `brandId`, `supplierId` | String | FK → Category, Brand, Supplier |

**`movements`**

| Campo | Tipo | Observações |
|---|---|---|
| `id` | String (cuid) | PK |
| `type` | Enum `MovementType` | `entry` · `exit` · `transfer` · `loss` · `adjustment` · `inventory` |
| `quantity`, `unitCost`, `totalValue` | Int / Float | Base para relatórios de valor e curva ABC |
| `exitReason` | Enum `ExitReason` | `sale` · `transfer` · `loss` · `break` · `internal` |
| `productId`, `userId` | String | FK → Product, User |
| `supplierId`, `customerId` | String? | FK opcionais conforme o tipo de movimentação |
| `fromAddressId`, `toAddressId` | String? | FK → WarehouseAddress (origem/destino) |
| `createdAt` | DateTime | Base temporal para séries históricas (mineração de dados) |

**`lots`** — `lotNumber`, `quantity`, `manufacturingDate`, `expirationDate`, `status` (`valid`·`expiring`·`expired`·`quarantine`), `productId`, `supplierId`.

**`warehouse_addresses`** — `code`, `aisle`, `street`, `shelf`, `level`, `position`, `status` (`free`·`occupied`·`blocked`·`reserved`), `capacity`, `occupied`, `productId`.

### Demais entidades

| Entidade | Principais campos | Relacionamentos |
|---|---|---|
| `users` | name, email, password (hash), role, department, status, lastLogin | 1:N com Movement, InventoryCount, Notification, AuditLog |
| `categories` | name, slug, color | 1:N com Product |
| `brands` | name, slug, logoUrl | 1:N com Product |
| `suppliers` | name, tradeName, cnpj, email, phone, category, status | 1:N com Product, Movement, Lot |
| `customers` | name, tradeName, cnpj, email, city, state, status | referenciado por Movement |
| `inventory_counts` | type, status, startDate, endDate, totalItems, countedItems, divergences | N:1 com User (responsável) |
| `notifications` | alertKey, readAt | N:1 com User; único por (alertKey, userId) |
| `audit_logs` | action, entity, entityId, oldValue (JSON), newValue (JSON), ip | N:1 com User |

### Enumerações de domínio

| Enum | Valores |
|---|---|
| `UserRole` | `admin` · `supervisor` · `operator` · `viewer` |
| `MovementType` | `entry` · `exit` · `transfer` · `loss` · `adjustment` · `inventory` |
| `LotStatus` | `valid` · `expiring` · `expired` · `quarantine` |
| `PositionStatus` | `free` · `occupied` · `blocked` · `reserved` |
| `InventoryCountType` / `Status` | `full`·`partial`·`cyclic` / `planned`·`in_progress`·`review`·`completed` |

> Próximo passo: modelagem de índices adicionais para consultas analíticas (relatórios e mineração de dados) e avaliação de particionamento da tabela `movements` conforme o volume de dados crescer.

## Arquitetura em nuvem (AWS)

A infraestrutura do StockIQ será hospedada na AWS, utilizando instâncias **EC2** como VPS tanto para a aplicação quanto para o banco de dados, com um **Load Balancer** distribuindo o tráfego entre as instâncias da API.

```
                         Usuários (internet)
                                 │
                                 ▼
                          Route 53 (DNS)
                                 │
┌────────────────────────────────┼──────────────────────────── VPC — StockIQ (AWS) ───┐
│  Subnet pública                ▼                                                     │
│           Application Load Balancer  (HTTPS via ACM · health checks)                  │
│                          │              │                                            │
│  Subnet privada — app    ▼              ▼                                            │
│         EC2 — API Node/Express   EC2 — Front-end Next.js                             │
│         (t3.small, Auto Scaling)      (t3.micro)                                     │
│                          │                                                           │
│  Subnet privada — dados  ▼                                                           │
│         EC2 (VPS) — PostgreSQL + volume EBS                                          │
│                          │                                                           │
│         ┌────────────────┼────────────────┬───────────────┐                          │
│         ▼                ▼                ▼               ▼                          │
│   Amazon S3         Amazon SQS       CloudWatch          IAM                          │
│  (imagens ·        (filas          (métricas ·      (papéis de menor                  │
│   backups ·        assíncronas)     logs · alarmes)    privilégio)                    │
│   data lake)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Justificativa dos serviços

| Serviço AWS | Justificativa de uso no StockIQ |
|---|---|
| **EC2 (VPS)** | Hospeda a API Node.js e, em instância separada, o banco PostgreSQL — modelo escolhido pela equipe (VPS próprio em vez de serviços totalmente gerenciados), com controle total do ambiente e menor custo em nível educacional/free tier |
| **Application Load Balancer** | Distribui requisições entre as instâncias EC2 da API, permite alta disponibilidade (health checks removem instâncias com falha) e possibilita escalar horizontalmente sem downtime |
| **Auto Scaling Group** *(próximos passos)* | Adiciona/remove instâncias de API automaticamente conforme CPU/memória, mantendo custo baixo em horários de menor uso |
| **VPC + Subnets públicas/privadas** | Isola o banco de dados e as instâncias de aplicação da internet pública; apenas o Load Balancer fica exposto, reduzindo superfície de ataque |
| **Security Groups** | Regras de firewall por camada: ALB aceita 443 da internet; API aceita tráfego apenas do ALB; banco aceita tráfego apenas das instâncias de API |
| **Amazon S3** | Armazenamento de imagens de produtos/avatares, backups agendados do PostgreSQL (`pg_dump`) e, futuramente, o "data lake" bruto para o módulo de mineração de dados |
| **Amazon SQS** | Ver [Mensageria assíncrona](#mensageria-assíncrona-amazon-sqs) — desacopla processamento assíncrono do fluxo síncrono da API |
| **Route 53** | Gerenciamento de domínio e DNS do sistema, apontando para o Load Balancer |
| **AWS Certificate Manager** | Certificado TLS gratuito para HTTPS no Load Balancer |
| **CloudWatch** | Monitoramento de CPU/memória das instâncias, logs centralizados da API e alarmes (ex.: uso de disco do banco, filas SQS acumulando mensagens) |
| **IAM** | Papéis com permissões mínimas necessárias para cada instância acessar S3/SQS, seguindo o princípio do menor privilégio |

**Status:** arquitetura definida e justificada. Próximos passos: provisionamento efetivo dos recursos (idealmente via Infraestrutura como Código — Terraform ou CloudFormation), deploy das aplicações nas instâncias EC2 e configuração do Load Balancer e da primeira fila SQS.

## Mensageria assíncrona (Amazon SQS)

Três usos concretos foram identificados para o projeto:

1. **Fila de alertas e notificações** — quando uma movimentação deixa o estoque abaixo do mínimo ou um lote se aproxima do vencimento, a API publica uma mensagem na fila em vez de processar o envio de e-mail/notificação de forma síncrona. Um worker consome a fila e envia a notificação, evitando que a requisição do usuário fique lenta esperando esse envio.
2. **Geração assíncrona de relatórios pesados** — relatórios como a curva ABC ou exportações em PDF/Excel podem demorar com grande volume de dados. A API enfileira o pedido, um worker processa em segundo plano e o resultado fica disponível para download, mantendo a API responsiva mesmo sob carga.
3. **Pipeline de eventos para mineração de dados** — cada movimentação de estoque publica um evento na fila, consumido por um processo que grava o registro em lote no "data lake" (S3). Isso desacopla a origem operacional dos dados do processo de preparação usado pela mineração de dados, sem sobrecarregar o banco transacional com leituras analíticas.

## Mineração de dados

### Base de dados

A base de dados para mineração é formada pelos próprios dados operacionais gerados pelo uso do StockIQ — não há uma base externa. As tabelas `movements`, `products`, `lots`, `suppliers` e `warehouse_addresses` concentram os atributos com maior potencial analítico.

Plano de trabalho em duas fases:
1. Uso de **dados simulados** (seed/massa de testes, já presente em `backend/prisma/seed.ts`) para prototipar e validar as técnicas de mineração;
2. Substituição progressiva por **dados reais de operação** assim que o sistema entrar em uso, mantendo a mesma estrutura de atributos.

### Atributos relevantes por técnica

| Grupo de dados | Atributos-chave | Uso analítico |
|---|---|---|
| Movimentações | tipo, quantidade, valor, data, produto, motivo de saída | Séries temporais, curva ABC, detecção de anomalias |
| Produtos | categoria, marca, estoque mín/máx, preço | Classificação ABC/XYZ, clustering por padrão de consumo |
| Lotes | data de fabricação/validade, status | Previsão de perdas por vencimento |
| Fornecedores | lead time implícito (data do pedido → entrada em estoque) | Otimização de ponto de pedido |
| Endereços de armazém | ocupação, corredor/posição | Associação produto–localização (slotting) |

### Pipeline planejado

```
StockIQ (PostgreSQL operacional)
        │  publica evento por movimentação
        ▼
   Amazon SQS  ──────►  Amazon S3 (data lake — CSV/Parquet)
                               │
                               ▼
                    Preparação (Python · pandas)
                       limpeza / features
                               │
                               ▼
                 Modelos (ABC/XYZ · forecast)
                               │
                               ▼
                  IA Analítica (dashboard)
```

### Técnicas planejadas

| Técnica | Objetivo no StockIQ | Status |
|---|---|---|
| Curva ABC | Classificar produtos por valor acumulado de movimentação, priorizando controle sobre os itens de maior impacto financeiro | ✅ Endpoint pronto (`GET /api/reports/abc`) |
| Classificação XYZ | Classificar produtos pela variabilidade/regularidade da demanda, complementando a curva ABC (matriz ABC/XYZ) | 🧪 Prototipado (mock) |
| Previsão de demanda (séries temporais) | Estimar a quantidade de saída futura por produto/categoria, antecipando risco de ruptura | 🧪 Prototipado (mock) |
| Regras de associação (Apriori/Market Basket) | Identificar produtos frequentemente movimentados juntos, apoiando decisões de slotting | 📋 Planejado |
| Clustering de produtos (k-means) | Agrupar produtos por padrão de consumo para sugerir políticas de estoque mínimo/máximo | 📋 Planejado |
| Detecção de anomalias | Sinalizar movimentações de ajuste/perda fora do padrão histórico, cruzando com o log de auditoria | 📋 Planejado |

### Ferramentas cogitadas

- **Python** com `pandas` (preparação/limpeza), `scikit-learn` (clustering, classificação) e `statsmodels`/`Prophet` (séries temporais);
- **Jupyter Notebooks** para exploração e validação incremental dos modelos antes de qualquer automação;
- Extração via consultas diretas ao PostgreSQL nesta fase inicial; evolução futura para leitura do data lake em S3 conforme o volume cresça;
- Possível uso futuro de serviços gerenciados de ML da AWS (ex.: SageMaker) caso o escopo de mineração se aprofunde além do que é viável rodar localmente.

### Metodologia (CRISP-DM)

| Etapa | Situação na Sprint 1 |
|---|---|
| 1. Entendimento do negócio | ✅ Concluído — objetivos de negócio definidos em [docs/REQUIREMENTS.md](REQUIREMENTS.md) |
| 2. Entendimento dos dados | ✅ Concluído — estrutura de dados definida acima |
| 3. Preparação dos dados | ⏳ Próxima sprint — geração de massa simulada representativa |
| 4. Modelagem | ⏳ Próxima sprint — primeiros protótipos de ABC/XYZ e forecast em notebook |
| 5. Avaliação | 📋 Sprints seguintes |
| 6. Implantação | 📋 Sprints seguintes — integração dos modelos ao módulo IA Analítica |

---

## Maior risco identificado

A integração entre as três frentes — aplicação, nuvem e mineração de dados — dentro do prazo do semestre. Por isso, os próximos passos priorizam primeiro a integração front-end/back-end e o provisionamento básico da nuvem, para então liberar tempo da equipe para os experimentos de mineração de dados sobre uma base de dados real e em produção.
