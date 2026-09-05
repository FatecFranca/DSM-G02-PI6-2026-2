# StockIQ Frontend

Aplicação web (**Next.js/React**) responsável pela interface de operação do StockIQ (WMS / ERP Lite). Consome a [API REST do back-end](../backend/README.md) via HTTP/JSON.

> Parte do Projeto Integrador do 6º semestre — FATEC Franca (Desenvolvimento de Software Multiplataforma), integrando **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Sobre este documento

Este README descreve o estado do front-end ao final da **Sprint 1**, cujo caráter é estrutural: o objetivo não é entregar funcionalidades finais polidas, e sim consolidar um **protótipo navegável** de todas as telas do sistema, com layout, componentes reutilizáveis e dados de exemplo (mocks), antes da integração completa com a API real.

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Telas implementadas na Sprint 1](#telas-implementadas-na-sprint-1)
- [Componentes reutilizáveis](#componentes-reutilizáveis)
- [Dados mockados](#dados-mockados)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Convenções de código](#convenções-de-código)
- [Status da Sprint 1](#status-da-sprint-1)
- [Próximos passos](#próximos-passos-pós-sprint-1)

---

## Visão geral

O StockIQ cobre o ciclo completo de operação de um armazém: cadastro de produtos, categorias, marcas, fornecedores e clientes; endereçamento físico de estoque; movimentações (entrada, saída, transferência, perda, ajuste e inventário); controle de lotes com validade; contagens de inventário; alertas automáticos; trilha de auditoria; dashboard e relatórios gerenciais (incluindo curva ABC); e um módulo de IA analítica para previsão de demanda e sugestão de reposição.

A solução segue uma arquitetura cliente-servidor desacoplada:

```
Front-end (Next.js/React)  --HTTPS/JSON-->  API REST (Node/Express)  --Prisma-->  PostgreSQL
```

Nesta Sprint 1, o front-end foi construído como **protótipo estático**: todas as telas centrais estão navegáveis com dados de exemplo (`mocks/`), enquanto a integração com a API real está planejada como próximo passo. Consulte o [README do back-end](../backend/README.md) para a lista completa de endpoints já disponíveis para essa integração.

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Biblioteca de UI | React 19 |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS 4 |
| Ícones | lucide-react |
| Gráficos | Recharts |
| Lint | ESLint (eslint-config-next) |

## Estrutura de pastas

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/               # Tela de autenticação
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Layout com sidebar + topbar
│   │   └── dashboard/
│   │       ├── page.tsx         # Dashboard geral (indicadores e gráficos)
│   │       ├── produtos/        # Listagem, cadastro ([id], novo) e detalhe de produtos
│   │       ├── categorias/
│   │       ├── marcas/
│   │       ├── fornecedores/
│   │       ├── clientes/
│   │       ├── enderecos/       # Endereços físicos de armazém
│   │       ├── entradas/        # Entradas de estoque
│   │       ├── saidas/          # Saídas de estoque
│   │       ├── movimentacoes/   # Histórico geral de movimentações
│   │       ├── lotes/           # Controle de validade de lotes
│   │       ├── inventario/      # Contagens de inventário
│   │       ├── alertas/
│   │       ├── auditoria/
│   │       ├── relatorios/
│   │       ├── scanner/         # Leitura de código de barras
│   │       ├── usuarios/
│   │       ├── configuracoes/
│   │       ├── ia/
│   │       └── ia-analitica/    # Módulo de IA analítica (destaque — Mineração de Dados)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/                  # AppShell, Sidebar, Topbar
│   └── ui/                      # Componentes reutilizáveis (ver seção abaixo)
├── constants/                   # navigation.ts, status.ts
├── hooks/                       # useDebounce, useSidebar, useTheme
├── lib/                         # cn.ts, utils.ts
├── mocks/                       # Dados de exemplo por domínio
└── types/                       # Tipagens compartilhadas (product, movement, user, warehouse, common)
```

## Telas implementadas na Sprint 1

Todas as telas abaixo já estão estruturadas com layout, sidebar/topbar responsivos e dados de exemplo (`mocks/`); a integração com a API real está em andamento.

| Módulo | Rota | Descrição |
|---|---|---|
| Autenticação | `/login` | Login |
| Dashboard | `/dashboard` | Indicadores gerais e gráficos |
| Produtos | `/dashboard/produtos`, `/produtos/novo`, `/produtos/[id]` | Listagem, cadastro e detalhe |
| Categorias | `/dashboard/categorias` | CRUD de categorias |
| Marcas | `/dashboard/marcas` | CRUD de marcas |
| Fornecedores | `/dashboard/fornecedores` | Cadastro de fornecedores |
| Clientes | `/dashboard/clientes` | Cadastro de clientes |
| Endereços | `/dashboard/enderecos` | Endereçamento físico do armazém |
| Entradas | `/dashboard/entradas` | Registro de entradas de estoque |
| Saídas | `/dashboard/saidas` | Registro de saídas de estoque |
| Movimentações | `/dashboard/movimentacoes` | Histórico geral |
| Lotes | `/dashboard/lotes` | Controle de validade |
| Inventário | `/dashboard/inventario` | Contagens (completa/parcial/cíclica) |
| Alertas | `/dashboard/alertas` | Estoque baixo e vencimento |
| Auditoria | `/dashboard/auditoria` | Log de operações críticas |
| Relatórios | `/dashboard/relatorios` | Movimentações, estoque, curva ABC, etc. |
| Scanner | `/dashboard/scanner` | Leitura de código de barras |
| Usuários | `/dashboard/usuarios` | Gestão de usuários e perfis |
| Configurações | `/dashboard/configuracoes` | Preferências do sistema |
| IA / IA Analítica | `/dashboard/ia`, `/dashboard/ia-analitica` | Ver destaque abaixo |

### Destaque — Módulo de IA Analítica

A tela `ia-analitica` já prototipa, com dados de exemplo, os principais entregáveis do módulo de Mineração de Dados: gráfico de previsão de demanda (real vs. previsto), matriz de classificação ABC/XYZ e cartões de insights/sugestões automáticas de compra. Isso antecipa visualmente o que os modelos de mineração precisarão alimentar com dados reais nas próximas sprints. Veja o planejamento completo das técnicas em [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Componentes reutilizáveis

Localizados em `components/ui/`:

`Avatar` · `Badge` · `Breadcrumb` · `Button` · `Card` · `DataTable` · `EmptyState` · `Input` · `Modal` · `Pagination` · `Select` · `Skeleton` · `StatCard` · `Tabs`

E em `components/layout/`: `AppShell`, `Sidebar`, `Topbar` — estrutura de navegação responsiva compartilhada por todas as telas autenticadas.

Hooks utilitários em `hooks/`: `useDebounce`, `useSidebar`, `useTheme`.

## Dados mockados

Enquanto a integração com a API real não é finalizada, as telas consomem dados de exemplo definidos em `mocks/`:

- `dashboard.ts` — indicadores e séries do dashboard geral
- `movements.ts` — movimentações de estoque
- `products.ts` — produtos, categorias e marcas
- `users.ts` — usuários e perfis de acesso
- `warehouse.ts` — endereços físicos de armazenagem

As tipagens correspondentes ficam em `types/` (`product.ts`, `movement.ts`, `user.ts`, `warehouse.ts`, `common.ts`), já preparadas para receber os dados reais da API sem necessidade de retrabalho estrutural.

## Como rodar o projeto

```bash
cd frontend
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Para a experiência completa (autenticação e dados reais), suba também a [API do back-end](../backend/README.md) — por padrão em `http://localhost:3001`.

Outros scripts disponíveis:

```bash
npm run build   # build de produção
npm run start   # servir o build de produção
npm run lint    # checagem de lint (ESLint)
```

## Convenções de código

- **App Router** do Next.js — rotas organizadas por grupo de layout: `(auth)` para telas públicas e `(dashboard)` para telas autenticadas;
- Componentes de UI genéricos e sem regra de negócio ficam em `components/ui/`; componentes de estrutura de página ficam em `components/layout/`;
- Tipagens de domínio centralizadas em `types/`, compartilhadas entre mocks, componentes e (futuramente) as chamadas à API;
- `lib/cn.ts` concentra o helper de composição de classes Tailwind (`clsx`).

## Status da Sprint 1

| Entrega mínima | Status | Observação |
|---|---|---|
| Protótipo inicial do front-end | ✅ Concluído | 20+ telas navegáveis com dados estáticos |
| Componentes de UI reutilizáveis | ✅ Concluído | Card, Badge, Button, DataTable, Modal, etc. |
| Layout responsivo (sidebar/topbar) | ✅ Concluído | `components/layout/` |
| Integração com a API real | ⏳ Pendente | Próximo passo pós-Sprint 1 |

## Próximos passos (pós-Sprint 1)

1. Substituir os dados mockados (`mocks/`) por chamadas HTTP autenticadas à API REST do back-end;
2. Implementar autenticação real (JWT) integrada à tela de login, incluindo persistência de sessão e client HTTP com envio automático do token;
3. Conectar os CRUDs (produtos, categorias, marcas, fornecedores, clientes, endereços, lotes) à API;
4. Consumir os endpoints reais de dashboard, relatórios e alertas;
5. Tratar estados de carregamento, erro e paginação nas listagens que hoje usam dados estáticos;
6. Integrar o módulo de IA Analítica aos modelos de mineração de dados desenvolvidos nas próximas sprints.
