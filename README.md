# StockIQ — WMS / ERP Lite

**Sistema de gestão de estoque e armazém (Warehouse Management System)**, desenvolvido como Projeto Integrador do 6º semestre — FATEC Franca, Desenvolvimento de Software Multiplataforma.

> Integra os componentes curriculares de **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Sobre este documento

Este README consolida as entregas mínimas da **1ª Sprint** do projeto e serve como ponto de entrada do monorepo. O conteúdo técnico reflete o estado atual do código em [`backend/`](backend) e [`frontend/`](frontend) — não é apenas um planejamento teórico.

## Índice

- [Visão geral](#visão-geral)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Arquitetura da solução](#arquitetura-da-solução)
- [Como rodar o projeto completo](#como-rodar-o-projeto-completo)
- [Documentação](#documentação)
- [Status consolidado da Sprint 1](#status-consolidado-da-sprint-1)
- [Próximos passos (pós-Sprint 1)](#próximos-passos-pós-sprint-1)
- [Considerações finais](#considerações-finais)

---

## Visão geral

O StockIQ cobre o ciclo completo de operação de um armazém de médio porte: cadastro de produtos e suas categorias, marcas, fornecedores e clientes; endereçamento físico do estoque; registro de movimentações (entrada, saída, transferência, perda, ajuste e inventário); controle de lotes com data de validade; contagens periódicas de inventário; alertas automáticos de estoque baixo e de vencimento; trilha de auditoria; dashboard e relatórios gerenciais (incluindo curva ABC); e um módulo de IA analítica voltado à previsão de demanda e sugestão de reposição.

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
├── backend/    # API REST — Node.js/Express, TypeScript e PostgreSQL (via Prisma ORM)
│               # → backend/README.md
├── frontend/   # Aplicação web — Next.js/React, interface de operação do sistema
│               # → frontend/README.md
└── docs/       # Documentação de arquitetura, nuvem, mineração de dados e requisitos
    ├── ARCHITECTURE.md
    └── REQUIREMENTS.md
```

| Repositório | Documentação | Responsabilidade |
|---|---|---|
| [`backend/`](backend) | [backend/README.md](backend/README.md) | API REST autenticada, validada, documentada (Swagger) e testada — 15 módulos / 67 endpoints |
| [`frontend/`](frontend) | [frontend/README.md](frontend/README.md) | Protótipo navegável de todas as telas do sistema (Next.js/React), atualmente com dados mockados |

## Arquitetura da solução

Arquitetura cliente-servidor desacoplada, hospedada em infraestrutura AWS (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

```
Front-end            API REST                Prisma ORM           PostgreSQL
Next.js 16/React ──► Node.js/Express/TS  ──►  Migrations     ──►  Banco relacional
                      JWT · Zod · Helmet          Query builder
                      Rate limit
```

O modelo de dados (12 entidades, 11 enumerações), o diagrama de casos de uso, a arquitetura AWS proposta e o planejamento de mineração de dados estão detalhados em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
| [backend/README.md](backend/README.md) | Stack, estrutura em camadas, setup, banco de dados, autenticação/RBAC, segurança, testes, tabela completa de endpoints |
| [frontend/README.md](frontend/README.md) | Stack, estrutura de pastas, telas implementadas, componentes reutilizáveis, dados mockados, setup |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Escopo, requisitos funcionais (RF01–RF16), requisitos não funcionais (RNF01–RNF10) e hierarquia de perfis de acesso |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão lógica, casos de uso, modelo de dados (ER), arquitetura AWS, mensageria (SQS) e planejamento de mineração de dados |

## Status consolidado da Sprint 1

| Entrega mínima | Status | Observação |
|---|---|---|
| Definição de escopo e requisitos | ✅ Concluído | 16 RF + 10 RNF documentados |
| Modelagem inicial (casos de uso, arquitetura) | ✅ Concluído | Diagrama de classes/sequência ficam para a próxima sprint |
| Estrutura inicial do back-end (framework + API configurada) | ✅ Concluído | 15 módulos / 67 endpoints, autenticado e testado |
| Protótipo inicial do front-end (telas estáticas) | ✅ Concluído | 20+ telas navegáveis; integração real com a API pendente |
| Banco de dados modelado (conceitual e lógico) | ✅ Concluído | 12 entidades, Prisma Migrate versionando o schema |
| Computação em Nuvem II — serviços e justificativa | ✅ Concluído | Arquitetura AWS definida; provisionamento é próximo passo |
| Mineração de Dados — base e planejamento inicial | ✅ Concluído | Base definida (dados do próprio sistema) + roteiro CRISP-DM |

## Próximos passos (pós-Sprint 1)

1. Integrar o front-end à API real, substituindo os dados mockados por chamadas HTTP autenticadas;
2. Provisionar a infraestrutura AWS descrita em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (VPC, EC2, Load Balancer, S3, primeira fila SQS);
3. Automatizar o deploy do back-end e do front-end nas instâncias EC2 (CI/CD simples ou scripts de deploy);
4. Gerar massa de dados simulada representativa para viabilizar os primeiros experimentos de mineração de dados;
5. Prototipar, em notebook Python, os primeiros modelos de classificação ABC/XYZ e previsão de demanda;
6. Elaborar diagrama de classes e diagramas de sequência dos fluxos críticos (movimentação, alerta, contagem de inventário);
7. Escrever testes automatizados para os módulos ainda não cobertos (fornecedores, clientes, lotes, inventário, relatórios).

## Considerações finais

A Sprint 1 cumpriu seu objetivo de estruturar a base técnica do StockIQ: escopo e requisitos documentados, modelagem inicial produzida, back-end funcional com autenticação e mais de 60 endpoints, protótipo navegável do front-end, banco de dados modelado e implantado via migrations, além das definições de infraestrutura em nuvem e do plano inicial de mineração de dados — ambos diretamente conectados ao domínio real do sistema (estoque, movimentações e lotes), e não tratados como exercícios teóricos isolados.

O maior risco identificado para as próximas sprints é a integração entre as três frentes — aplicação, nuvem e mineração de dados — dentro do prazo do semestre. Por isso, os próximos passos priorizam primeiro a integração front-end/back-end e o provisionamento básico da nuvem, para então liberar tempo da equipe para os experimentos de mineração de dados sobre uma base de dados real e em produção.
