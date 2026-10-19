# StockIQ — WMS / ERP Lite

**Sistema de gestão de estoque e armazém (Warehouse Management System)**, desenvolvido como Projeto Integrador do 6º semestre — FATEC Franca, Desenvolvimento de Software Multiplataforma.

> Integra os componentes curriculares de **Projeto Integrador VI**, **Computação em Nuvem II** e **Mineração de Dados**.

Autores: **Gabriel da Silveira Pessoni** e **Lívia Portela Ferreira**

---

## Sobre este documento

Este README é o ponto de entrada do monorepo e resume o estado conhecido do código e da documentação (atualizado na Sprint 2, em 19/10/2026). Os status abaixo distinguem o que está implementado e verificado do que ainda depende de provisionamento ou implantação na nuvem.

## Índice

- [Visão geral](#visão-geral)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Arquitetura da solução](#arquitetura-da-solução)
- [Como rodar o projeto completo](#como-rodar-o-projeto-completo)
- [Documentação](#documentação)
- [Status atual conhecido](#status-atual-conhecido)
- [Próximos passos](#próximos-passos)
- [Considerações finais](#considerações-finais)

---

## Visão geral

O StockIQ é um sistema para gestão de estoque e armazém. O backend oferece APIs para cadastros, movimentações, lotes, inventários, alertas, auditoria, dashboard, relatórios, analytics e configurações, além de **fotos de produto no Amazon S3** e **ajuste de estoque do inventário por fila (Amazon SQS)**. O frontend web e o app mobile consomem a API; as telas operacionais usam dados reais. A previsão de demanda por regressão é um experimento (notebook) que ainda não alimenta o sistema; a tela IA Analítica usa o analytics do backend (média móvel, ABC×XYZ e sugestões de compra).

| Item | Descrição |
|---|---|
| Nome do sistema | StockIQ — WMS / ERP Lite |
| Domínio | Gestão de estoque, armazenagem, movimentações e inventário |
| Tipo de solução | Aplicação web (API REST + SPA/SSR), multiusuário, com controle de perfis de acesso |
| Disciplinas integradas | Projeto Integrador VI, Computação em Nuvem II, Mineração de Dados |
| Infraestrutura alvo | AWS (VPC/EC2, Load Balancer, mensageria e armazenamento gerenciado) |

Requisitos funcionais e não funcionais completos em [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Estrutura do repositório

O projeto é dividido em aplicações independentes que se comunicam via API REST:

```
pi/
├── backend/          # API REST — Node.js/Express, TypeScript e PostgreSQL (via Prisma ORM)
│                     # → backend/README.md
├── frontend/         # Aplicação web — Next.js/React, interface de operação do sistema
│                     # → frontend/README.md
├── mobile/           # App React Native (Expo) — mesmas telas e endpoints do web
│                     # → mobile/README.md
├── machine-learning/ # Experimento de previsão de vendas por regressão (notebook + relatório)
│                     # → machine-learning/README.md
└── docs/             # Documentação: arquitetura, requisitos, Swagger e PDFs técnicos
    ├── ARCHITECTURE.md · REQUIREMENTS.md · swagger.json
    ├── StockIQ-Backend.pdf · StockIQ-Frontend.pdf
    ├── StockIQ-Machine-Learning.pdf · StockIQ-Computacao-em-Nuvem.pdf
    └── src/          # Gerador dos PDFs (python3 docs/src/build.py)
```

| Repositório | Documentação | Responsabilidade |
|---|---|---|
| [`backend/`](backend) | [backend/README.md](backend/README.md) | API REST com 17 módulos e 88 endpoints; fotos no S3, fila SQS e worker; `/docs` (Swagger) é a referência dos endpoints |
| [`frontend/`](frontend) | [frontend/README.md](frontend/README.md) | Aplicação Next.js integrada à API nas telas operacionais (foto de produto, acompanhamento do inventário assíncrono, IA Analítica) |
| [`machine-learning/`](machine-learning) | [machine-learning/README.md](machine-learning/README.md) | Notebook de previsão de vendas por regressão (pré-processamento, seleção de atributos, Regressão Linear e Random Forest) sobre o Store Sales, com relatório ABNT |

## Arquitetura da solução

Arquitetura lógica cliente-servidor desacoplada; a infraestrutura AWS é uma proposta ainda não implantada (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

```
Front-end            API REST                Prisma ORM           PostgreSQL
Next.js 16/React ──► Node.js/Express/TS  ──►  Migrations     ──►  Banco relacional
Mobile (Expo)         JWT · Zod · Helmet          Query builder
                      Rate limit
                          │
                          ├──► Amazon S3   fotos de produto (URLs assinadas)
                          └──► Amazon SQS  fila de inventário ──► worker ──► ajuste de estoque
```

O modelo de dados (14 modelos, 12 enumerações), o diagrama de casos de uso, a arquitetura AWS e a mineração de dados estão detalhados em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e nos PDFs técnicos em [docs/](docs).

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
| [frontend/README.md](frontend/README.md) | Stack, estrutura de pastas, telas e integração, componentes reutilizáveis, setup |
| [machine-learning/README.md](machine-learning/README.md) | Notebook de regressão: pré-processamento, seleção de atributos, modelos, resultados, limitações e como rodar |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Escopo, requisitos funcionais (RF01–RF16), requisitos não funcionais (RNF01–RNF10) e regras de acesso por papel |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Visão lógica, casos de uso, modelo de dados (ER), arquitetura AWS, mensageria (SQS) e mineração de dados |
| [docs/StockIQ-Backend.pdf](docs/StockIQ-Backend.pdf) · [Frontend](docs/StockIQ-Frontend.pdf) · [Machine Learning](docs/StockIQ-Machine-Learning.pdf) | Documentação técnica de cada componente (gerada por `python3 docs/src/build.py`) |
| [docs/StockIQ-Computacao-em-Nuvem.pdf](docs/StockIQ-Computacao-em-Nuvem.pdf) | Computação em Nuvem II: S3, SQS, segurança, evidências e pendências |

## Status atual conhecido

| Área | Status | Observação |
|---|---|---|
| Requisitos e arquitetura lógica | Documentados | Os documentos descrevem o escopo acordado; não significam que todos os requisitos estejam implementados. |
| Backend | Implementado e testado | 88 endpoints (Swagger em `/docs`); 173 testes (Jest + Supertest) passando contra PostgreSQL real em 19/10/2026. |
| Frontend | Integrado à API | As telas operacionais usam dados reais; `tsc`, ESLint e `next build` sem erros. Não há testes automatizados de interface em navegador. |
| Banco de dados | Schema e migrations versionados | 5 migrations aplicadas do zero em banco descartável (Docker); o banco de desenvolvimento precisa aplicar as migrations novas (`prisma migrate deploy`). |
| Fotos de produto (S3) | Implementado | Driver `s3`/`local`; bucket configurado no `.env`. Upload real ao bucket ainda não exercitado nos testes automatizados. |
| Mensageria (SQS) | Implementada; fila real pendente | Fila, worker, DLQ e reprocessamento validados com servidor SQS compatível (ElasticMQ) e banco real; a criação da fila na conta AWS depende de um usuário IAM com permissões de SQS. |
| Infraestrutura AWS (EC2, ALB, RDS) | Planejada | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) descreve a proposta; não há provisionamento nem deploy neste repositório. |
| Mineração de dados | Experimento + analytics | Notebook de regressão (melhor R² = 0,92, divisão aleatória); a IA Analítica usa média móvel, ABC×XYZ e sugestões de compra do backend. O notebook não está integrado à API. |

## Próximos passos

1. Obter credenciais AWS do projeto com permissão de SQS e S3, criar a fila (`npm run queues:setup`) e exercitar fotos e inventário ponta a ponta, registrando evidências (prints);
2. Aplicar as migrations novas no banco de desenvolvimento (`npx prisma migrate deploy`);
3. Provisionar a infraestrutura de nuvem (API e worker em EC2, banco em RDS, Application Load Balancer, CloudWatch);
4. Evoluir a mineração de dados: divisão treino/teste por data, vendas passadas como atributo, previsão dos dias futuros e integração com a IA Analítica;
5. Adicionar testes de interface (Playwright) para os fluxos críticos.

## Considerações finais

O repositório reúne uma API testada, uma aplicação web e um app mobile integrados a ela, um schema versionado, integração com S3 e SQS e um experimento de previsão. Ainda há por concluir o provisionamento da infraestrutura de nuvem, a fila na conta AWS, a integração do modelo de previsão ao sistema e testes automatizados de interface; a documentação evita tratar esses itens como entregues.
