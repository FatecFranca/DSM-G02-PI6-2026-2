# StockIQ Frontend

Aplicação web (**Next.js/React**) responsável pela interface de operação do StockIQ (WMS / ERP Lite). Consome a [API REST do back-end](../backend/README.md) via HTTP/JSON.

> Parte do Projeto Integrador do 6º semestre — FATEC Franca (Desenvolvimento de Software Multiplataforma), integrando **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Sobre este documento

Este README descreve o estado atual do front-end. A aplicação é navegável e parte dos fluxos está integrada à API, mas algumas telas e elementos ainda são demonstrativos e não devem ser tratados como operações persistidas.

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Telas e integração atual](#telas-e-integração-atual)
- [Componentes reutilizáveis](#componentes-reutilizáveis)
- [Dados mockados](#dados-mockados)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Convenções de código](#convenções-de-código)
- [Status atual e pendências](#status-atual-e-pendências)

---

## Visão geral

O front-end é a interface web do StockIQ e está em integração progressiva com a API. Os fluxos que fazem chamadas à API e os que ainda exibem dados demonstrativos estão separados abaixo.

A solução segue uma arquitetura cliente-servidor desacoplada:

```
Front-end (Next.js/React)  --HTTPS/JSON-->  API REST (Node/Express)  --Prisma-->  PostgreSQL
```

O cliente HTTP em `lib/api.ts` envia o token de autenticação e é usado nas telas já conectadas. A presença de uma tela ou rota no menu não significa, por si só, que seus dados sejam persistidos. A referência dos endpoints disponíveis está no Swagger do backend (`/docs`).

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

## Telas e integração atual

O estado é baseado nas chamadas presentes nas páginas; “integrada” significa que a página consulta ou altera dados pela API. Elementos isolados, como busca global/notificações da barra superior, ainda podem ser demonstrativos.

| Estado | Módulos / rotas | Observação |
|---|---|---|
| Integradas à API | Login; dashboard; produtos (lista, cadastro e detalhe); categorias; marcas; fornecedores; clientes; endereços; entradas; saídas; movimentações; lotes; inventário; auditoria; relatórios; scanner; usuários | Os dados dependem da API e do banco configurados. Inventário registra contagens e divergências; o encerramento não ajusta automaticamente o estoque de produtos. |
| Ainda demonstrativas ou parciais | Alertas; IA; IA Analítica; configurações; busca global e notificações da barra superior | A tela Alertas não consome atualmente o endpoint de alertas; os protótipos de IA não recebem a previsão do módulo Python. |

### Destaque — Módulo de IA Analítica

A tela `ia-analitica` é apenas um protótipo visual com dados de exemplo (incluindo elementos ABC/XYZ e sugestões); não está ligada ao script Python nem representa previsões ou recomendações calculadas sobre os dados do sistema. O experimento disponível e suas limitações estão descritos em [machine-learning/README.md](../machine-learning/README.md).

## Componentes reutilizáveis

Localizados em `components/ui/`:

`Avatar` · `Badge` · `Breadcrumb` · `Button` · `Card` · `DataTable` · `EmptyState` · `Input` · `Modal` · `Pagination` · `Select` · `Skeleton` · `StatCard` · `Tabs`

E em `components/layout/`: `AppShell`, `Sidebar`, `Topbar` — estrutura de navegação responsiva compartilhada por todas as telas autenticadas.

Hooks utilitários em `hooks/`: `useDebounce`, `useSidebar`, `useTheme`.

## Dados mockados

Os arquivos `mocks/` ainda são usados em algumas partes demonstrativas, inclusive dados de alertas e busca da barra superior. Não são fonte de verdade para as telas que consultam a API. A remoção de um arquivo mock não implica integração concluída; confirme o fluxo da tela antes de considerar a funcionalidade persistente.

- `dashboard.ts` — indicadores e séries do dashboard geral
- `movements.ts` — movimentações de estoque
- `products.ts` — produtos, categorias e marcas
- `users.ts` — usuários e perfis de acesso
- `warehouse.ts` — endereços físicos de armazenagem

As tipagens de domínio ficam em `types/` (`product.ts`, `movement.ts`, `user.ts`, `warehouse.ts`, `common.ts`); algumas são compartilhadas entre protótipos e telas conectadas.

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

## Status atual e pendências

| Área | Status | Observação |
|---|---|---|
| Estrutura e navegação | Implementada | Inclui layouts e componentes reutilizáveis; isso não garante que cada ação da tela tenha persistência. |
| Integração com a API | Parcial | Ver a tabela de telas; configure `NEXT_PUBLIC_API_URL` e suba backend e banco. |
| Alertas e configurações | Demonstrativos/parciais | Ainda não refletem integralmente operações persistidas. |
| IA / IA Analítica | Protótipo | Não recebe saídas do experimento Python nem dados operacionais ao vivo. |

## Próximos passos

1. Ligar a tela de alertas e as notificações da barra superior aos endpoints de alertas, incluindo estados de carregamento/erro e ações de leitura;
2. Substituir ou identificar claramente os dados demonstrativos na busca global, IA, IA Analítica e configurações;
3. Validar os fluxos integrados com o backend e banco de teste, incluindo permissões por papel e estados de erro;
4. Integrar a previsão de demanda à UI apenas após validar o modelo e conectar sua entrada a dados operacionais.
