# StockIQ Frontend

Aplicação web (**Next.js/React**) responsável pela interface de operação do StockIQ (WMS / ERP Lite). Consome a [API REST do back-end](../backend/README.md) via HTTP/JSON.

> Parte do Projeto Integrador do 6º semestre — FATEC Franca (Desenvolvimento de Software Multiplataforma), integrando **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

Documentação técnica detalhada (design system, componentes, mapa de telas): [docs/StockIQ-Frontend.pdf](../docs/StockIQ-Frontend.pdf).

---

## Índice

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Telas e integração atual](#telas-e-integração-atual)
- [Componentes reutilizáveis](#componentes-reutilizáveis)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Convenções de código](#convenções-de-código)
- [Status atual e pendências](#status-atual-e-pendências)

---

## Visão geral

O front-end é a interface web do StockIQ. **As telas operacionais leem e gravam dados reais na API**; os dados de demonstração embutidos no código (`mocks/`) foram removidos. Os dados de exemplo ficam no seed do backend (`npm run prisma:seed`).

```
Front-end (Next.js/React)  --HTTPS/JSON-->  API REST (Node/Express)  --Prisma-->  PostgreSQL
                                                    ├── Amazon S3  (fotos de produto)
                                                    └── Amazon SQS (ajuste de estoque do inventário)
```

O cliente HTTP em `lib/api.ts` envia o token de autenticação (JWT em `localStorage`, chave `wms_token`), converte erros em `ApiError` e redireciona ao login em respostas 401. A referência dos endpoints está no Swagger do backend (`/docs`).

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
│   ├── (auth)/login/            # Tela de autenticação
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Guarda de sessão + AppShell (sidebar + topbar)
│   │   └── dashboard/
│   │       ├── page.tsx         # Dashboard geral (indicadores e gráficos)
│   │       ├── produtos/        # Lista, novo, [id] (detalhe) e [id]/editar — com foto
│   │       ├── categorias/ marcas/ fornecedores/ clientes/
│   │       ├── enderecos/ entradas/ saidas/ movimentacoes/ lotes/
│   │       ├── inventario/      # Contagens e acompanhamento do ajuste de estoque (fila)
│   │       ├── alertas/ auditoria/ relatorios/ scanner/ usuarios/ configuracoes/
│   │       ├── ia/              # Identificação por imagem (protótipo; modelo não integrado)
│   │       └── ia-analitica/    # Previsão de demanda, matriz ABC×XYZ e sugestões de compra
│   ├── lp/                      # Página de apresentação
│   ├── layout.tsx · page.tsx · globals.css
├── components/
│   ├── layout/                  # AppShell, Sidebar, Topbar
│   ├── ui/                      # 18 componentes reutilizáveis
│   ├── products/                # ProductForm, ProductImage, ProductImageUploader
│   ├── inventory/               # InventoryJobBanner
│   └── partners/                # PartnerManager (fornecedores e clientes)
├── constants/                   # navigation.ts, status.ts
├── hooks/                       # useDebounce, useFetch, useSidebar, useTheme
├── lib/                         # api, auth-context, alerts-context, permissions, csv, fetch-all, image, utils, cn
└── types/                       # api.ts (respostas da API), movement.ts, user.ts
```

## Telas e integração atual

| Estado | Módulos / rotas | Observação |
|---|---|---|
| Integradas à API | Login; dashboard; produtos (lista, cadastro, edição, detalhe e **foto**); categorias; marcas; fornecedores; clientes; endereços; entradas; saídas; movimentações; lotes; **inventário**; alertas (e sino da barra superior); auditoria; relatórios; scanner; usuários; configurações; **IA Analítica** | Os dados dependem da API e do banco configurados. |
| Protótipo | `IA — Produtos` (`/dashboard/ia`) | Aceita e pré-visualiza a imagem, mas o modelo de visão não está integrado; a tela não inventa resultados. |
| Estática | `/lp` (apresentação) | Conteúdo institucional. |

### Foto do produto

No cadastro/edição, o card **Foto do Produto** aceita arrastar ou escolher um arquivo (JPEG, PNG, WebP ou GIF, até 5 MB), mostra a pré-visualização e permite trocar/remover. A foto é enviada **ao salvar**, para `POST /products/:id/image` (a API grava no Amazon S3); se o produto foi salvo mas o envio falhou, salvar de novo tenta só a foto. Listas e detalhe exibem a foto (URL assinada temporária) com ícone de reserva.

### Inventário e ajuste de estoque assíncrono

Ao **concluir** um inventário a API enfileira o ajuste de estoque (SQS). A tela mostra um banner com o andamento (*Na fila*, *Ajustando… X de Y*, *Ajustado*, *Com pendências*, *Falhou*), atualiza sozinha a cada 3 s enquanto houver job em andamento e oferece **Reprocessar** (admin/supervisor). Cada item divergente indica se foi ajustado ou o motivo da pendência manual.

### IA Analítica

Consome `GET /api/analytics`: previsão de demanda (real × previsto com faixa de incerteza), origem do modelo (ML ou média móvel), matriz ABC×XYZ, insights e sugestões de compra com exportação do pedido em CSV. O experimento de regressão (notebook) está descrito em [machine-learning/README.md](../machine-learning/README.md) e não alimenta a tela.

## Componentes reutilizáveis

`components/ui/`: `Alert` · `Avatar` · `Badge` · `Breadcrumb` · `Button` · `Card` · `ConfirmDialog` · `DataTable` · `EmptyState` · `Input` · `Loading` · `Modal` · `Pagination` · `Select` · `Skeleton` · `StatCard` · `Tabs` · `Textarea`.

`components/layout/`: `AppShell`, `Sidebar`, `Topbar` — estrutura de navegação responsiva compartilhada pelas telas autenticadas. O menu e as ações respeitam o papel do usuário (`lib/permissions.ts`), espelhando as listas de `authorize(...)` do backend (a autorização definitiva é a da API).

Hooks em `hooks/`: `useDebounce`, `useFetch`, `useSidebar`, `useTheme`; contextos em `lib/`: `useAuth`, `useAlerts`.

## Como rodar o projeto

```bash
cd frontend
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Para autenticação e dados reais, suba também a [API do back-end](../backend/README.md) (por padrão em `http://localhost:3001`; configure `NEXT_PUBLIC_API_URL` se for diferente).

```bash
npm run build   # build de produção
npm run start   # servir o build de produção
npm run lint    # ESLint
```

## Convenções de código

- **App Router** — grupos de layout: `(auth)` para telas públicas e `(dashboard)` para telas autenticadas;
- componentes de UI genéricos, sem regra de negócio, em `components/ui/`; estrutura de página em `components/layout/`;
- todo acesso ao backend passa por `lib/api.ts` (ou `useFetch`); upload usa `api.upload(path, FormData)`;
- estilos somente por tokens (`var(--…)`) e utilitários Tailwind; helper `cn` (`clsx`) para classes condicionais;
- tipagens das respostas da API em `types/api.ts`.

## Status atual e pendências

| Área | Status | Observação |
|---|---|---|
| Estrutura e navegação | Implementada | Layouts, componentes, tema claro/escuro e menu por papel. |
| Integração com a API | Implementada nas telas operacionais | `tsc`, ESLint e `next build` sem erros na última verificação (19/10/2026). A interface não é exercitada por testes automatizados em navegador. |
| Foto de produto e inventário assíncrono | Implementados | Dependem do S3/SQS configurados no backend; upload real ao bucket e fila real na AWS ainda não foram exercitados ponta a ponta. |
| IA — Produtos | Protótipo | Modelo de visão não integrado. |

## Próximos passos

1. Exercitar o fluxo completo em navegador com S3 e SQS reais (foto de produto e conclusão de inventário) e registrar evidências;
2. Adicionar testes de interface (ex.: Playwright) para os fluxos críticos;
3. Integrar o modelo de visão na tela `IA — Produtos` quando existir;
4. Avaliar miniaturas/redimensionamento de fotos para listas grandes.
