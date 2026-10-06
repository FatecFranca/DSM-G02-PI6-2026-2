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

Arquitetura lógica pretendida: o front-end consome a API REST, que acessa o banco relacional pelo Prisma ORM. No código atual, a integração do front-end é parcial: há telas e componentes demonstrativos que ainda usam dados mockados. O diagrama descreve a separação de camadas, não comprova publicação ou implantação dos serviços.

```
┌────────────────┐  HTTPS/JSON  ┌──────────────────────────┐  Prisma   ┌──────────────┐  SQL  ┌────────────┐
│   Front-end     │ ───────────► │        API REST           │ Client   │  Prisma ORM   │ ────► │ PostgreSQL │
│ Next.js 16/React│              │ Node.js/Express/TypeScript│ ───────► │  Migrations    │       │  (banco    │
│                 │ ◄─────────── │ JWT · Zod · Helmet · Rate │          │  Query builder │ ◄──── │ relacional)│
└────────────────┘              └──────────────────────────┘          └──────────────┘       └────────────┘
```

> Diagrama de classes e diagramas de sequência dos fluxos críticos (registro de movimentação, alerta de estoque) ficam para a sprint em que o módulo de IA analítica for integrado.

## Casos de uso e perfis de acesso

O acesso ao sistema é controlado por papel, com permissões configuradas explicitamente nas rotas da API por meio de `authenticate`/`authorize` em [backend/src/middleware/auth.middleware.ts](../backend/src/middleware/auth.middleware.ts). O diagrama abaixo representa os perfis definidos, não uma herança automática de permissões.

```
Administrador
Supervisor
Operador
Visualizador

Exemplos de capacidades (a permissão final é definida por rota):
- Visualizador: autenticar-se e consultar recursos liberados para leitura;
- Operador: registrar operações de estoque nas rotas autorizadas;
- Supervisor: gerenciar cadastros e inventários conforme os guards da rota;
- Administrador: administrar usuários e acessar recursos administrativos autorizados.
```

Detalhamento completo dos requisitos funcionais e não funcionais em [docs/REQUIREMENTS.md](REQUIREMENTS.md).

## Modelo de dados

Modelo lógico definido no **Prisma Schema** e versionado por migrations — 13 modelos e 11 enumerações de domínio (`backend/prisma/schema.prisma`). A aplicação efetiva de cada migration depende de um banco PostgreSQL acessível.

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
| `purchasePrice`, `salePrice` | Decimal(12,2) | Precificação |
| `minStock`, `maxStock`, `currentStock` | Int | Base para alertas de ruptura/excesso |
| `status` | Enum `ProductStatus` | `active` · `inactive` · `discontinued` |
| `categoryId`, `brandId`, `supplierId` | String | FK → Category, Brand, Supplier |

**`movements`**

| Campo | Tipo | Observações |
|---|---|---|
| `id` | String (cuid) | PK |
| `type` | Enum `MovementType` | `entry` · `exit` · `transfer` · `loss` · `adjustment` · `inventory` |
| `quantity`, `unitCost`, `totalValue` | Int / Decimal(12,2) / Decimal(14,2) | Base para relatórios de valor e curva ABC |
| `exitReason` | Enum `ExitReason` | `sale` · `transfer` · `loss` · `break` · `internal` |
| `productId`, `userId` | String | FK → Product, User |
| `supplierId`, `customerId`, `lotId` | String? | Relações opcionais conforme o tipo de movimentação |
| `fromAddressId`, `toAddressId` | String? | FK → WarehouseAddress (origem/destino) |
| `createdAt` | DateTime | Base temporal para séries históricas (mineração de dados) |

**`lots`** — `lotNumber`, `quantity`, `manufacturingDate`, `expirationDate`, `status` (`valid`·`expiring`·`expired`·`quarantine`), `productId`, `supplierId` e relação opcional com endereço. O código consulta validade para alertas, mas não há processo agendado que atualize automaticamente o enum `status`.

**`warehouse_addresses`** — `code`, `aisle`, `street`, `shelf`, `level`, `position`, `status` (`free`·`occupied`·`blocked`·`reserved`), `capacity`, `occupied`, `productId`.

**`inventory_count_items`** — associa produto e contagem; mantém quantidade esperada, quantidade contada, divergência, data e usuário da contagem.

### Demais entidades

| Entidade | Principais campos | Relacionamentos |
|---|---|---|
| `users` | name, email, password (hash), role, department, status, lastLogin | 1:N com Movement, InventoryCount, Notification, AuditLog |
| `categories` | name, slug, color | 1:N com Product |
| `brands` | name, slug, logoUrl | 1:N com Product |
| `suppliers` | name, tradeName, cnpj, email, phone, category, status | 1:N com Product, Movement, Lot |
| `customers` | name, tradeName, cnpj, email, city, state, status | referenciado por Movement |
| `inventory_counts` | type, status, startDate, endDate, totalItems, countedItems, divergences | N:1 com User (responsável); 1:N com InventoryCountItem |
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

O schema inclui índices para consultas operacionais comuns. Próximo passo: medir planos e tempos de consultas analíticas com dados representativos e adicionar índices ou particionamento apenas se a medição justificar.

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

**Status:** proposta arquitetural, não implantação. Este repositório não contém evidência de provisionamento AWS, deploy das aplicações, Load Balancer ou filas SQS.

## Mensageria assíncrona (Amazon SQS)

Três usos concretos foram identificados para o projeto:

1. **Fila de alertas e notificações** — quando uma movimentação deixa o estoque abaixo do mínimo ou um lote se aproxima do vencimento, a API publica uma mensagem na fila em vez de processar o envio de e-mail/notificação de forma síncrona. Um worker consome a fila e envia a notificação, evitando que a requisição do usuário fique lenta esperando esse envio.
2. **Geração assíncrona de relatórios pesados** — relatórios como a curva ABC ou exportações em PDF/Excel podem demorar com grande volume de dados. A API enfileira o pedido, um worker processa em segundo plano e o resultado fica disponível para download, mantendo a API responsiva mesmo sob carga.
3. **Pipeline de eventos para mineração de dados** — cada movimentação de estoque publica um evento na fila, consumido por um processo que grava o registro em lote no "data lake" (S3). Isso desacopla a origem operacional dos dados do processo de preparação usado pela mineração de dados, sem sobrecarregar o banco transacional com leituras analíticas.

## Mineração de dados

### Base de dados

A base-alvo da mineração são os dados operacionais do StockIQ (`movements`, `products`, `lots`, `suppliers` e `warehouse_addresses`). O experimento Python atual ainda não consome essas tabelas: utiliza dataset externo de vendas para testar o pipeline. O uso de dados operacionais permanece pendente.

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
| Curva ABC | Classificar produtos por valor acumulado de movimentação, priorizando controle sobre os itens de maior impacto financeiro | ✅ Implementado (`/api/reports/abc`, `/api/dashboard/abc`) |
| Classificação XYZ | Classificar produtos pela variabilidade/regularidade da demanda, complementando a curva ABC (matriz ABC/XYZ) | ✅ Implementado em `GET /api/analytics` (coeficiente de variação da demanda mensal) e exibido na tela IA Analítica |
| Previsão de demanda (séries temporais) | Estimar a quantidade de saída futura por produto/categoria, antecipando risco de ruptura | ✅ Integrado: modelo global de gradient boosting (Python, `machine-learning/`) treinado no Store Sales, servido por API FastAPI e consumido pelo backend (`GET /api/analytics`) com fallback para média móvel; backtest por janela temporal contra baselines. Ainda treinado em dados externos — retreino com movimentações reais é o próximo passo |
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
| 1. Entendimento do negócio | Documentado em [docs/REQUIREMENTS.md](REQUIREMENTS.md) |
| 2. Entendimento dos dados | Schema operacional documentado; experimento usa dataset externo |
| 3. Preparação dos dados | Agregação semanal no experimento; integração com dados operacionais pendente |
| 4. Modelagem | Regressão linear simples no experimento; ABC/XYZ da UI é apenas mock |
| 5. Avaliação | Validação temporal expansiva implementada para o dataset externo; não certifica desempenho em produção |
| 6. Implantação | Pendente — não integrado à API ou à interface |

---

## Maior risco identificado

As principais pendências são completar fluxos de interface ainda demonstrativos, validar migrations em banco dedicado, ampliar testes e decidir se/como provisionar a arquitetura de nuvem e integrar a mineração de dados. A arquitetura descrita acima não significa que esses componentes estejam implantados.
