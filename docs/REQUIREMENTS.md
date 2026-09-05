# Requisitos do Sistema — StockIQ

Este documento consolida o escopo e os requisitos definidos na Sprint 1, extraídos da documentação técnica de planejamento (`Sprint 1 - Gabriel e Lívia.pdf`). Mantido em Markdown para ficar versionado e consultável junto ao código, sem depender de reabrir o PDF a cada sprint.

## Escopo

O StockIQ cobre o ciclo completo de operação de um armazém de médio porte: cadastro de produtos e suas categorias, marcas, fornecedores e clientes; endereçamento físico do estoque (corredor, rua, prateleira, nível, posição); registro de movimentações (entrada, saída, transferência, perda, ajuste e inventário); controle de lotes com data de validade; contagens periódicas de inventário com apuração de divergências; alertas automáticos de estoque baixo e de vencimento; trilha de auditoria de operações críticas; dashboard e relatórios gerenciais (incluindo curva ABC); e um módulo de IA analítica voltado à previsão de demanda e sugestão de reposição.

**Fora do escopo desta primeira versão:** emissão fiscal (NF-e), integração com marketplaces e pagamentos.

## Requisitos Funcionais

| Código | Descrição | Status |
|---|---|---|
| RF01 | Cadastro e autenticação de usuários (e-mail/senha) com emissão de token JWT | ✅ Implementado |
| RF02 | Controle de acesso por perfil (Administrador, Supervisor, Operador, Visualizador) | ✅ Implementado |
| RF03 | CRUD de produtos (SKU, código interno, código de barras, dimensões, peso, preços, estoque mín/máx) | ✅ Implementado |
| RF04 | Consulta de produto por leitura de código de barras (scanner) | ✅ Implementado |
| RF05 | Cadastro de categorias e marcas de produtos | ✅ Implementado |
| RF06 | Cadastro de fornecedores e clientes (dados cadastrais, CNPJ, contato) | ✅ Implementado |
| RF07 | Cadastro de endereços de armazenagem com status e capacidade | ✅ Implementado |
| RF08 | Registro de movimentações de estoque vinculadas a produto, usuário, fornecedor/cliente e endereços | ✅ Implementado |
| RF09 | Controle de lotes com datas de fabricação/validade e status automático | ✅ Implementado |
| RF10 | Planejamento e execução de contagens de inventário (completa, parcial, cíclica) | ✅ Implementado |
| RF11 | Alertas automáticos de estoque abaixo do mínimo e de lotes próximos ao vencimento | ✅ Implementado |
| RF12 | Log de auditoria (ação, entidade, valor antigo/novo, usuário, IP, data/hora) | ✅ Implementado |
| RF13 | Dashboard com resumo geral, movimentações recentes e produtos mais movimentados | ✅ Implementado |
| RF14 | Relatórios de movimentações, posição de estoque, validade de lotes, ocupação, curva ABC, inventário e compras por fornecedor | ✅ Implementado |
| RF15 | Módulo de IA Analítica com previsão de demanda, classificação ABC/XYZ e sugestões de reposição | 🧪 Protótipo (dados mock) |
| RF16 | Documentação interativa da API (Swagger/OpenAPI) | ✅ Implementado |

## Requisitos Não Funcionais

| Código | Descrição |
|---|---|
| RNF01 | **Segurança** — senhas com hash (bcrypt), autenticação JWT, cabeçalhos de segurança HTTP (Helmet), CORS controlado e rate limiting |
| RNF02 | **Validação** — toda entrada da API validada em camada própria (Zod) antes de chegar à regra de negócio |
| RNF03 | **Disponibilidade** — infraestrutura em nuvem com balanceamento de carga entre múltiplas instâncias |
| RNF04 | **Escalabilidade** — arquitetura apta a escalar horizontalmente o back-end conforme aumento de carga |
| RNF05 | **Desempenho** — listagens com paginação e filtros para evitar sobrecarga em grandes volumes |
| RNF06 | **Responsividade** — front-end utilizável em desktop e dispositivos móveis (leitura de código de barras em coletores/celulares) |
| RNF07 | **Manutenibilidade** — código em camadas (rotas, controllers, services, schemas, middlewares), 100% tipado em TypeScript |
| RNF08 | **Testabilidade** — cobertura de testes automatizados (Jest + Supertest) nos principais fluxos da API |
| RNF09 | **Rastreabilidade** — toda alteração crítica é auditável via log de auditoria |
| RNF10 | **Observabilidade** — logs de aplicação (Morgan) e métricas de infraestrutura monitoradas (CloudWatch, na nuvem) |

## Perfis de acesso (RBAC)

O acesso é hierárquico: cada perfil herda as permissões do perfil imediatamente abaixo, acrescentando novas capacidades.

```
Visualizador  →  autenticar-se, rastrear produto via scanner, consultar dashboard/relatórios/alertas
     │
Operador      →  + registrar movimentações (entrada, saída, transferência, ajuste, contagem)
     │
Supervisor    →  + gerenciar produtos, cadastros, lotes e endereços
     │
Administrador →  + gerenciar usuários e consultar auditoria
```

No código, essa hierarquia é aplicada via `authorize('admin' | 'supervisor')` nas rotas sensíveis (ver [backend/README.md](../backend/README.md#autenticação-e-controle-de-acesso)); todas as demais rotas exigem apenas um token válido (`authenticate`).

## Rastreamento de mudanças

Novos requisitos poderão ser incorporados nas próximas sprints conforme validação com o orientador e evolução do módulo de IA analítica. Ao alterar um requisito aqui, atualize também a tabela de status correspondente no [README raiz](../README.md#status-consolidado-da-sprint-1).
