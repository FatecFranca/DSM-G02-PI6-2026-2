# StockIQ — WMS / ERP Lite

**Sistema de gestão de estoque e armazém (Warehouse Management System)**, desenvolvido como Projeto Integrador do 6º semestre — FATEC Franca, Desenvolvimento de Software Multiplataforma.

> Integra os componentes curriculares de **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Sobre este documento

Este README é o ponto de entrada do monorepo e resume o estado conhecido do código e da documentação. A infraestrutura AWS e algumas telas continuam sendo protótipos/planejamento; os status abaixo distinguem o que está implementado do que ainda depende de integração ou implantação.

## Índice

- [Visão geral](#visão-geral)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Arquitetura da solução](#arquitetura-da-solução)
- [Como rodar o projeto completo](#como-rodar-o-projeto-completo)
- [Documentação](#documentação)
- [Status atual conhecido](#status-atual-conhecido)
- [Próximos passos (pós-Sprint 1)](#próximos-passos-pós-sprint-1)
- [Considerações finais](#considerações-finais)

---

## Visão geral

O StockIQ é um sistema em desenvolvimento para gestão de estoque e armazém. O backend oferece APIs para cadastros, movimentações, lotes, inventários, alertas, auditoria, dashboard e relatórios. O frontend consome a API em vários desses módulos, mas ainda mantém protótipos com dados estáticos em algumas telas e componentes. O módulo Python de previsão é experimental e ainda não está integrado à operação do sistema.

| Item | Descrição |
|---|---|
| Nome do sistema | StockIQ — WMS / ERP Lite |
| Domínio | Gestão de estoque, armazenagem, movimentações e inventário |
| Tipo de solução | Aplicação web (API REST + SPA/SSR), multiusuário, com controle de perfis de acesso |
| Disciplinas integradas | Projeto Integrador VI, Computação em Nuvem II, Mineração de Dados |
| Infraestrutura alvo | AWS (VPC/EC2, Load Balancer, mensageria e armazenamento gerenciado) |

Requisitos funcionais e não funcionais completos em [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Estrutura do repositório

Este projeto é dividido em duas aplicações independentes que se comunicam via API REST:

```
pi/
├── backend/          # API REST — Node.js/Express, TypeScript e PostgreSQL (via Prisma ORM)
│                     # → backend/README.md
├── frontend/         # Aplicação web — Next.js/React, interface de operação do sistema
│                     # → frontend/README.md
├── machine-learning/ # Previsão de demanda: modelo + API (mineração de dados)
│                     # → machine-learning/README.md
└── docs/             # Documentação de arquitetura, nuvem, mineração de dados e requisitos
    ├── ARCHITECTURE.md
    └── REQUIREMENTS.md
```

| Repositório | Documentação | Responsabilidade |
|---|---|---|
| [`backend/`](backend) | [backend/README.md](backend/README.md) | API REST com 15 módulos de rotas; `/docs` (Swagger) é a referência dos endpoints atuais |
| [`frontend/`](frontend) | [frontend/README.md](frontend/README.md) | Aplicação Next.js parcialmente integrada à API; algumas telas e elementos ainda usam dados de demonstração |
| [`machine-learning/`](machine-learning) | [machine-learning/README.md](machine-learning/README.md) | Modelo global de previsão de demanda diária (gradient boosting, treinado no Store Sales), API FastAPI e integração com a tela IA Analítica do backend (com fallback para média móvel) |

## Arquitetura da solução

Arquitetura lógica cliente-servidor desacoplada; a infraestrutura AWS é uma proposta ainda não implantada (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

```
Front-end            API REST                Prisma ORM           PostgreSQL
Next.js 16/React ──► Node.js/Express/TS  ──►  Migrations     ──►  Banco relacional
                      JWT · Zod · Helmet          Query builder
                      Rate limit
```

O modelo de dados (13 modelos, 11 enumerações), o diagrama de casos de uso, a arquitetura AWS proposta e o planejamento de mineração de dados estão detalhados em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Como rodar o projeto completo

```bash
# 1. Back-end (API) — porta 3001
cd backend
npm install
cp .env.example .env   # ajuste DATABASE_URL, JWT_SECRET, etc.
npm run prisma:migrate
npm run prisma:seed    # opcional — popula dados de demonstração
npm run dev

# 2. Front-end (interface) — porta 3000, em outro terminal
cd frontend
npm install
npm run dev
```

Instruções detalhadas, variáveis de ambiente e scripts em [backend/README.md](backend/README.md#como-rodar-o-projeto) e [frontend/README.md](frontend/README.md#como-rodar-o-projeto).

## Documentação

| Documento | Conteúdo |
|---|---|
| [backend/README.md](backend/README.md) | Stack, estrutura em camadas, setup, banco de dados, autenticação/RBAC, segurança, testes e resumo de módulos (endpoints atuais no Swagger) |
| [frontend/README.md](frontend/README.md) | Stack, estrutura de pastas, telas implementadas, componentes reutilizáveis, dados mockados, setup |
| [machine-learning/README.md](machine-learning/README.md) | Dataset usado, mapeamento para o schema do StockIQ, features/modelo, backtest, contrato da API, integração com o backend e como rodar |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Escopo, requisitos funcionais (RF01–RF16), requisitos não funcionais (RNF01–RNF10) e regras de acesso por papel |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão lógica, casos de uso, modelo de dados (ER), arquitetura AWS, mensageria (SQS) e planejamento de mineração de dados |

## Status atual conhecido

| Área | Status | Observação |
|---|---|---|
| Requisitos e arquitetura lógica | Documentados | Os documentos descrevem o escopo acordado; não significam que todos os requisitos estejam implementados. |
| Backend | Implementado em parte e em evolução | Há rotas autenticadas e testes; veja `/docs`, os scripts e as ressalvas de testes em [backend/README.md](backend/README.md). |
| Frontend | Integração parcial | Cadastros, produtos, movimentações, inventário, relatórios e outros módulos consomem a API; alertas da interface, IA e configurações ainda têm partes demonstrativas. |
| Banco de dados | Schema e migrations versionados | A aplicação das migrations depende de um PostgreSQL configurado; não se afirma aqui que exista banco implantado ou migration aplicada em produção. |
| Infraestrutura AWS | Planejada | Os serviços e diagramas em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) são uma proposta, não evidência de provisionamento ou deploy. |
| Mineração de dados | Experimento local | A previsão avalia dados históricos externos; ainda não lê movimentos reais nem alimenta a interface IA. |

## Próximos passos (pós-Sprint 1)

1. Concluir a substituição dos dados demonstrativos e a integração das telas restantes, especialmente alertas, IA e configurações;
2. Aplicar e verificar as migrations em um banco de desenvolvimento/teste dedicado antes de planejar qualquer implantação;
3. Aumentar a cobertura dos fluxos ainda sem testes de integração e executar o workflow de CI com PostgreSQL;
4. Decidir e provisionar a infraestrutura de nuvem; até lá, os diagramas AWS são apenas planejamento;
5. Integrar o experimento de previsão a dados operacionais reais somente após validação do modelo e do acesso seguro aos dados.

## Considerações finais

O repositório reúne uma API, uma aplicação web parcialmente integrada, um schema versionado e um experimento de previsão. Ainda há integração de interface, cobertura de testes, aplicação de migrations e implantação de infraestrutura por concluir; a documentação evita tratar esses itens como funcionalidades entregues.
