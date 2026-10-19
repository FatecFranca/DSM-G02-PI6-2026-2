# Requisitos do Sistema — StockIQ

Este documento consolida o escopo e os requisitos definidos na Sprint 1, extraídos da documentação técnica de planejamento (`Sprint 1 - Gabriel e Lívia.pdf`). Mantido em Markdown para ficar versionado e consultável junto ao código, sem depender de reabrir o PDF a cada sprint. **Status atualizados na Sprint 2 (19/10/2026).**

## Escopo

O escopo pretendido para o StockIQ inclui cadastro de produtos, categorias, marcas, fornecedores e clientes; endereçamento físico; movimentações; controle de lotes; inventários; alertas; auditoria; dashboard; relatórios; e IA analítica. O nível de implementação de cada requisito está discriminado na tabela de status, e não se presume que todo o escopo esteja completo.

**Fora do escopo desta primeira versão:** emissão fiscal (NF-e), integração com marketplaces e pagamentos.

## Requisitos Funcionais

Os status distinguem API/regra de negócio da experiência integrada. “Parcial” indica que há implementação útil, mas ainda falta parte do escopo ou a integração ponta a ponta; “Protótipo” identifica telas ou experimentos que não são funcionalidades operacionais.

| Código | Descrição | Status |
|---|---|---|
| RF01 | Cadastro e autenticação de usuários (e-mail/senha) com emissão de token JWT | Implementado na API |
| RF02 | Controle de acesso por perfil (Administrador, Supervisor, Operador, Visualizador) | Implementado na API; ações dependem de autorização por rota |
| RF03 | CRUD de produtos (SKU, código interno, código de barras, dimensões, peso, preços, estoque mín/máx) | Implementado na API e nas telas (inclui edição) |
| RF04 | Consulta de produto por leitura de código de barras (scanner) | Consulta pela API disponível; interação de leitura física depende do dispositivo e não é validada aqui |
| RF05 | Cadastro de categorias e marcas de produtos | Implementado na API e telas principais |
| RF06 | Cadastro de fornecedores e clientes (dados cadastrais, CNPJ, contato) | Implementado na API e telas principais |
| RF07 | Cadastro de endereços de armazenagem com status e capacidade | Implementado na API; integração de tela disponível |
| RF08 | Registro de movimentações de estoque vinculadas a produto, usuário, fornecedor/cliente e endereços | Implementado na API; exige banco/migrations e respeita as dimensões rastreadas pelo produto |
| RF09 | Controle de lotes com datas de fabricação/validade e status automático | Implementado: o status (`valid`, `expiring`, `expired`) é atualizado por **job periódico** (ao subir a API/worker e a cada 60 min, configurável) e a cada consulta; `quarantine` é manual |
| RF10 | Planejamento e execução de contagens de inventário (completa, parcial, cíclica) | Implementado: contagens e divergências por item; ao concluir, o **ajuste de estoque é processado de forma assíncrona** (fila SQS + worker, idempotente, com reprocessamento). Produtos em vários endereços/lotes exigem ajuste manual; inventários concluídos antes do recurso não são reprocessados. Fila real na AWS pendente (ver RNF11) |
| RF11 | Alertas automáticos de estoque abaixo do mínimo e de lotes próximos ao vencimento | Implementado na API, no front-end e no app: **notificações no sino da barra superior** (contador de não lidos, painel, marcar como lido por usuário) e tela de alertas, incluindo avisos de inventário com ajuste de estoque falho ou com pendências. Não há envio de e-mail/push |
| RF12 | Log de auditoria (ação, entidade, valor antigo/novo, usuário, IP, data/hora) | Middleware conectado a operações críticas; cobertura não implica auditoria de toda mutação possível |
| RF13 | Dashboard com resumo geral, movimentações recentes e produtos mais movimentados | Implementado via API; integração do dashboard disponível |
| RF14 | Relatórios de movimentações, posição de estoque, validade de lotes, ocupação, curva ABC, inventário e compras por fornecedor | Parcial: endpoints existem; alguns relatórios ainda retornam conjuntos completos sem paginação |
| RF15 | Módulo de IA Analítica com previsão de demanda, classificação ABC/XYZ e sugestões de reposição | Parcial (a simulação com os modelos do notebook está no RF20): a tela consome `GET /api/analytics` (previsão por média móvel; serviço de ML externo opcional, não incluído no repositório), matriz ABC×XYZ e sugestões de compra calculadas sobre as movimentações reais. O modelo de regressão do notebook (R² 0,92 no teste) não alimenta a interface |
| RF16 | Documentação interativa da API (Swagger/OpenAPI) | Implementado (88 endpoints; `docs/swagger.json` exportado do código) |
| RF17 | Foto do produto: envio pelo front-end, armazenamento no Amazon S3 e exibição por URL assinada | Implementado (driver `s3` e `local`, validação do arquivo, remoção e limpeza de órfãos). Upload real ao bucket ainda não exercitado nos testes automatizados |
| RF18 | Configurações do sistema (dados da empresa e preferências: dias de alerta de validade, prazo de reposição) | Implementado (`/api/settings`; edição restrita ao administrador) |
| RF19 | Identificação de produto por foto: o usuário envia a imagem e a IA sugere nome, categoria, marca e descrição, e lista produtos parecidos do catálogo | Implementado (backend, web e mobile; modelo de visão da OpenAI, chave só no servidor). Testado com respostas simuladas do provedor; o uso real depende de `OPENAI_API_KEY` |
| RF20 | Simulação de vendas "e se…" (loja, família, promoção, data) com os modelos de regressão do notebook | Implementado (`ml-service` + `/api/simulation/*` + tela Simulação de Vendas); os modelos reproduzem o notebook (R² idêntico). Divisão treino/teste aleatória: o R² é otimista para dias futuros |

## Requisitos Não Funcionais

| Código | Descrição | Status atual |
|---|---|---|
| RNF01 | **Segurança** — senhas com hash (bcrypt), autenticação JWT, cabeçalhos de segurança HTTP (Helmet), CORS controlado e rate limiting | Parcialmente implementado na aplicação; revisar CORS e configuração por ambiente antes de implantação |
| RNF02 | **Validação** — toda entrada da API validada em camada própria (Zod) antes de chegar à regra de negócio | Aplicada às rotas com schemas; cobertura de parâmetros varia por rota |
| RNF03 | **Disponibilidade** — infraestrutura em nuvem com balanceamento de carga entre múltiplas instâncias | Planejado; não há infraestrutura provisionada/versionada neste repositório |
| RNF04 | **Escalabilidade** — arquitetura apta a escalar horizontalmente o back-end conforme aumento de carga | Não verificado sob carga; implantação horizontal ainda é planejamento |
| RNF05 | **Desempenho** — listagens com paginação e filtros para evitar sobrecarga em grandes volumes | Parcial; algumas listagens são paginadas e indexadas, mas relatórios ainda podem carregar conjuntos completos |
| RNF06 | **Responsividade** — front-end utilizável em desktop e dispositivos móveis (leitura de código de barras em coletores/celulares) | Layout responsivo; leitura física e validação em dispositivos não verificadas |
| RNF07 | **Manutenibilidade** — código em camadas (rotas, controllers, services, schemas, middlewares), 100% tipado em TypeScript | Estrutura em camadas e TypeScript; não se declara cobertura tipada total |
| RNF08 | **Testabilidade** — cobertura de testes automatizados (Jest + Supertest) nos principais fluxos da API | 173 testes em 22 suítes passando contra PostgreSQL real (19/10/2026), incluindo S3/SQS simulados e o fluxo do inventário assíncrono; cobertura não é exaustiva e não há testes de interface |
| RNF09 | **Rastreabilidade** — toda alteração crítica é auditável via log de auditoria | Middleware conectado às rotas críticas; cobertura precisa ser mantida conforme novas operações são adicionadas |
| RNF10 | **Observabilidade** — logs de aplicação (Morgan) e métricas de infraestrutura monitoradas (CloudWatch, na nuvem) | Morgan disponível; CloudWatch e métricas de infraestrutura não configurados |
| RNF11 | **Processamento assíncrono** — operações pesadas executadas fora da requisição HTTP, por fila de mensagens, com tolerância a falhas | Implementado para o ajuste de estoque do inventário (SQS + worker, DLQ, idempotência, reprocessamento); validado com servidor SQS compatível e banco real. A fila na conta AWS depende de permissões de SQS no usuário IAM |

## Perfis de acesso (RBAC)

O acesso é controlado por papel. As permissões são configuradas explicitamente em cada rota sensível; não se deve inferir que um perfil herde automaticamente todas as permissões de outro.

Os perfis definidos são **Visualizador**, **Operador**, **Supervisor** e **Administrador**. `authenticate` valida o token e o estado/papel atuais da conta, enquanto `authorize(...)` aplica a lista de papéis permitida em cada rota. As capacidades não são assumidas por herança: verifique a rota específica no Swagger e no código (ver [backend/README.md](../backend/README.md#autenticação-e-controle-de-acesso)).

## Rastreamento de mudanças

Novos requisitos poderão ser incorporados nas próximas sprints conforme validação com o orientador e evolução do módulo de IA analítica. Ao alterar um requisito aqui, atualize também a tabela de status correspondente no [README raiz](../README.md#status-atual-conhecido).
