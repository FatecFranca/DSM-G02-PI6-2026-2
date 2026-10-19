import json
import re
from pathlib import Path
from lib import Doc, svg, box, arrow, text, sequence

HERE = Path(__file__).parent
spec = json.loads((HERE.parent / "swagger.json").read_text(encoding="utf-8"))
tests = json.loads((HERE / "data" / "tests.json").read_text())
T = {s["file"]: s["tests"] for s in tests["suites"]}

# ── descrições em português dos 88 endpoints ────────────────────────────────
PT = {
 "POST /api/auth/register": "Registrar usuário (papel padrão: operador)", "POST /api/auth/login": "Login e emissão do token",
 "GET /api/auth/me": "Dados do usuário autenticado", "GET /api/auth/profile": "Perfil completo", "PATCH /api/auth/profile": "Atualizar o próprio perfil",
 "PATCH /api/auth/password": "Alterar a própria senha",
 "GET /api/users": "Listar (paginado)", "GET /api/users/{id}": "Buscar por id", "POST /api/users": "Criar usuário", "PATCH /api/users/{id}": "Atualizar usuário",
 "PATCH /api/users/{id}/status": "Alterar status", "PATCH /api/users/{id}/password": "Redefinir a senha de um usuário", "DELETE /api/users/{id}": "Remover usuário",
 "GET /api/products/scan/{code}": "Buscar por código de barras / SKU / código interno", "GET /api/products": "Listar com busca, categoria, marca, status e situação de estoque",
 "GET /api/products/{id}": "Detalhe com situação de estoque", "POST /api/products": "Criar produto (SKU e código únicos)", "PATCH /api/products/{id}": "Atualizar produto",
 "DELETE /api/products/{id}": "Remover produto (e a foto no storage)", "POST /api/products/{id}/image": "Enviar a foto do produto (multipart, campo `image`) para o S3",
 "DELETE /api/products/{id}/image": "Remover a foto do produto", "GET /api/files/*": "Servir arquivo do driver local por URL assinada",
 "GET /api/categories": "Listar", "GET /api/categories/{id}": "Buscar por id", "POST /api/categories": "Criar", "PATCH /api/categories/{id}": "Atualizar", "DELETE /api/categories/{id}": "Remover",
 "GET /api/brands": "Listar", "GET /api/brands/{id}": "Buscar por id", "POST /api/brands": "Criar", "PATCH /api/brands/{id}": "Atualizar", "DELETE /api/brands/{id}": "Remover",
 "GET /api/suppliers": "Listar (paginado)", "GET /api/suppliers/{id}": "Buscar por id", "POST /api/suppliers": "Criar", "PATCH /api/suppliers/{id}": "Atualizar", "DELETE /api/suppliers/{id}": "Remover",
 "GET /api/customers": "Listar com busca e paginação", "GET /api/customers/{id}": "Buscar por id", "POST /api/customers": "Criar", "PATCH /api/customers/{id}": "Atualizar", "DELETE /api/customers/{id}": "Remover",
 "GET /api/warehouse/stats": "Estatísticas de ocupação", "GET /api/warehouse": "Listar endereços (filtros)", "GET /api/warehouse/{id}": "Buscar por id",
 "POST /api/warehouse": "Criar endereço", "PATCH /api/warehouse/{id}": "Atualizar", "DELETE /api/warehouse/{id}": "Remover",
 "GET /api/movements": "Listar por tipo, produto e período", "GET /api/movements/{id}": "Buscar por id", "POST /api/movements": "Registrar entrada, saída, transferência, perda, ajuste ou inventário",
 "GET /api/lots/alerts": "Lotes a vencer / vencidos", "GET /api/lots": "Listar (produto, status, vencimento)", "GET /api/lots/{id}": "Buscar por id",
 "POST /api/lots": "Criar lote (número único)", "PATCH /api/lots/{id}": "Atualizar lote", "DELETE /api/lots/{id}": "Remover lote",
 "GET /api/inventory": "Listar contagens (com situação do ajuste de estoque)", "GET /api/inventory/{id}": "Detalhe da contagem e dos itens", "POST /api/inventory": "Planejar contagem",
 "PATCH /api/inventory/{id}": "Atualizar andamento; ao concluir, enfileira o ajuste de estoque", "DELETE /api/inventory/{id}": "Remover contagem planejada",
 "POST /api/inventory/{id}/items/{itemId}/count": "Registrar a quantidade contada de um item", "POST /api/inventory/{id}/reprocess": "Reenfileirar o ajuste de estoque (falhou, parcial ou travado)",
 "GET /api/dashboard": "Resumo geral", "GET /api/dashboard/movement-trend": "Tendência mensal", "GET /api/dashboard/category-distribution": "Distribuição por categoria",
 "GET /api/dashboard/top-products": "Mais movimentados", "GET /api/dashboard/abc": "Curva ABC", "GET /api/dashboard/heatmap": "Volume por dia da semana e hora",
 "GET /api/alerts": "Todos os alertas com estado de leitura", "GET /api/alerts/stock": "Alertas de estoque por severidade", "GET /api/alerts/expiring": "Lotes próximos ao vencimento",
 "PATCH /api/alerts/read-all": "Marcar todos como lidos", "PATCH /api/alerts/{id}/read": "Marcar um alerta como lido",
 "GET /api/audit": "Logs de auditoria", "GET /api/audit/{id}": "Detalhe de um log",
 "GET /api/reports/movements": "Movimentações por tipo e produto", "GET /api/reports/stock": "Posição de estoque valorizada", "GET /api/reports/lots": "Validade de lotes",
 "GET /api/reports/warehouse": "Ocupação do armazém", "GET /api/reports/abc": "Curva ABC", "GET /api/reports/inventory": "Contagens e divergências", "GET /api/reports/suppliers": "Compras por fornecedor",
 "GET /api/analytics": "Previsão de demanda, matriz ABC×XYZ, sugestões de compra e insights", "GET /api/analytics/model": "Situação e métricas do modelo de previsão",
 "GET /api/settings": "Dados da empresa e preferências do sistema", "PUT /api/settings": "Atualizar empresa e/ou preferências",
}
TAGS = [("Auth", "Autenticação", "/api/auth"), ("Users", "Usuários", "/api/users"), ("Products", "Produtos", "/api/products"), ("Categories", "Categorias", "/api/categories"),
        ("Brands", "Marcas", "/api/brands"), ("Suppliers", "Fornecedores", "/api/suppliers"), ("Customers", "Clientes", "/api/customers"), ("Warehouse", "Armazém (endereços)", "/api/warehouse"),
        ("Movements", "Movimentações", "/api/movements"), ("Lots", "Lotes", "/api/lots"), ("Inventory", "Inventário", "/api/inventory"), ("Dashboard", "Dashboard", "/api/dashboard"),
        ("Alerts", "Alertas", "/api/alerts"), ("Audit", "Auditoria", "/api/audit"), ("Reports", "Relatórios", "/api/reports"), ("Analytics", "Analytics (IA)", "/api/analytics"), ("Settings", "Configurações", "/api/settings")]

def access(op):
    if op.get("security") == []:
        return ("tag", "info", "Público")
    r = re.search(r"Perfis permitidos:\*\* ([a-z, ]+)\.", op.get("description", ""))
    if not r:
        return ("tag", "gray", "Autenticado")
    roles = [x.strip() for x in r.group(1).split(",")]
    label = {1: "Admin", 2: "Supervisor+", 3: "Operador+"}.get(len(roles), "/".join(roles))
    return ("tag", "warn" if len(roles) == 1 else "ok", label)

ops = []
for path, methods in spec["paths"].items():
    for m, op in methods.items():
        ops.append((m.upper(), path, op))
N_ENDPOINTS = len(ops)

d = Doc("Backend — Documentação Técnica", "StockIQ · Documentação do Backend", "Backend<br>API REST",
        "Documentação técnica da API do StockIQ: arquitetura, modelo de dados, regras de negócio, segurança, mensageria, armazenamento e catálogo completo de endpoints.",
        ["Node.js · Express", "TypeScript", "PostgreSQL · Prisma", "JWT · Zod", "Amazon S3 · SQS", f"{N_ENDPOINTS} endpoints"], "StockIQ-Backend.pdf")

# 01 ─────────────────────────────────────────────────────────────────────────
d.section("01", "Visão geral", "Escopo, números e responsabilidades")
d.p("O backend do StockIQ é uma API REST em Node.js/Express com TypeScript que concentra toda a regra de negócio, a persistência em PostgreSQL (via Prisma ORM) e a autenticação do sistema. É consumida pelo front-end Next.js e pelo aplicativo mobile por HTTP/JSON.")
d.kpis([("17", "Módulos"), (str(N_ENDPOINTS), "Endpoints"), ("14", "Entidades"), (str(tests["total"]), "Testes")])
d.p("A API cobre o ciclo completo de operação de um armazém: produtos (com foto no S3), categorias, marcas, fornecedores e clientes; endereçamento físico; movimentações de estoque; lotes com validade; contagens de inventário com **ajuste de estoque assíncrono por fila (SQS)**; alertas; auditoria; dashboard, relatórios e analytics (previsão de demanda e matriz ABC×XYZ); e configurações do sistema.")
d.cards([("🔐", "Segurança", "JWT, bcrypt, Helmet, CORS, rate limiting e trilha de auditoria."),
         ("✔", "Validação", "Schemas Zod por módulo antes de qualquer regra de negócio."),
         ("⚙", "Camadas claras", "routes → controllers → services → Prisma."),
         ("☁", "Nuvem", "Fotos no Amazon S3 e fila de inventário no Amazon SQS, com worker dedicado."),
         ("📄", "Documentada", "Swagger UI e OpenAPI 3.0 gerados das rotas (`/docs`)."),
         ("🧪", "Testada", f"{tests['total']} testes (Jest + Supertest) contra PostgreSQL real.")])

# 02 ─────────────────────────────────────────────────────────────────────────
d.section("02", "Stack tecnológica", "Tecnologias e finalidade")
d.table(["Camada", "Tecnologia", "Finalidade"], [
    ["Linguagem", "TypeScript 5", "Tipagem estática ponta a ponta"],
    ["Framework HTTP", "Express 4", "Roteamento e cadeia de middlewares"],
    ["ORM", "Prisma 6", "Modelagem, migrations versionadas e acesso tipado ao PostgreSQL"],
    ["Banco de dados", "PostgreSQL 16", "Persistência relacional transacional"],
    ["Autenticação", "jsonwebtoken · bcryptjs", "Token JWT assinado e hash de senha (custo 10)"],
    ["Validação", "Zod 3", "Schemas de entrada com mensagens padronizadas"],
    ["Segurança", "Helmet · CORS · express-rate-limit", "Cabeçalhos seguros, origem e limite de requisições"],
    ["Upload", "multer 2", "Recepção de multipart em memória, com limite de tamanho e tipo"],
    ["Nuvem", "AWS SDK v3 (S3, SQS)", "Armazenamento de fotos e mensageria assíncrona"],
    ["Documentação", "swagger-jsdoc · swagger-ui-express", "OpenAPI 3.0 em `/docs` e `/docs.json`"],
    ["Testes", "Jest 29 · Supertest · ts-jest", "Testes unitários e de integração"],
    ["Logs", "Morgan", "Log de requisições HTTP (silenciado nos testes)"],
], ["", "", ""])

# 03 ─────────────────────────────────────────────────────────────────────────
d.section("03", "Arquitetura em camadas", "Rotas, controllers, services, Prisma")
d.p("Cada módulo de negócio é composto por artefatos com responsabilidades distintas. Preocupações transversais (autenticação, validação, auditoria, limites, upload e erros) vivem em middlewares e nunca dentro de controllers ou services.")
a = []
a.append(box(10, 10, 110, 36, "Front-end / App", "HTTP · JSON", "slate"))
a.append(box(180, 4, 190, 40, "routes/", "endpoint, método e guards", "blue"))
a.append(box(180, 62, 190, 40, "controllers/", "req/res e delegação", "blue"))
a.append(box(180, 120, 190, 40, "services/", "regra de negócio e acesso a dados", "blue"))
a.append(box(180, 178, 190, 40, "Prisma Client", "query builder tipado (singleton)", "violet"))
a.append(box(180, 236, 190, 38, "PostgreSQL", "14 tabelas · 12 enums", "green"))
for y in (44, 102, 160, 218):
    a.append(arrow(275, y, 275, y + 18))
a.append(arrow(120, 28, 180, 24, "HTTP"))
a.append(box(430, 4, 160, 30, "auth.middleware", "", "amber", 9.5))
a.append(box(430, 42, 160, 30, "validate.middleware", "", "amber", 9.5))
a.append(box(430, 80, 160, 30, "audit.middleware", "", "amber", 9.5))
a.append(box(430, 118, 160, 30, "upload.middleware", "", "amber", 9.5))
a.append(box(430, 156, 160, 30, "rate-limit.middleware", "", "amber", 9.5))
a.append(box(430, 194, 160, 30, "error.middleware", "", "amber", 9.5))
a.append(text(510, 244, "Transversais (por rota)", 8.5))
a.append(box(10, 120, 110, 40, "workers/", "consumo da fila SQS", "cyan"))
a.append(arrow(120, 140, 180, 140, "usa", dashed=True))
d.figure(svg(600, 285, "".join(a)), "Camadas da API, middlewares transversais e worker")
d.h3("Estrutura de pastas")
d.code('''backend/
├── src/
│   ├── app.ts                  # Express, middlewares globais e registro de rotas
│   ├── server.ts               # Bootstrap: banco, HTTP e worker embutido
│   ├── worker.ts               # Processo dedicado ao consumo das filas (npm run worker)
│   ├── config/swagger.ts       # Definição OpenAPI
│   ├── routes/        (18)     # Endpoints + guards de acesso
│   ├── controllers/   (13)     # req/res
│   ├── services/      (20)     # Regra de negócio, Prisma, storage (S3) e fila (SQS)
│   ├── schemas/       (10)     # Schemas Zod de entrada
│   ├── middleware/    (6)      # auth · validate · audit · upload · error · rate-limit
│   ├── workers/                # inventory.worker.ts
│   └── prisma/client.ts        # Prisma Client singleton
├── prisma/                     # schema.prisma · seed.ts · migrations/ (5)
├── scripts/                    # setup-queues · cleanup-storage · export-swagger · check-swagger
├── __tests__/                  # Testes (Jest + Supertest) — 22 suítes
└── .env.example''')

# 04 ─────────────────────────────────────────────────────────────────────────
d.section("04", "Ciclo de vida da requisição", "Pipeline de middlewares")
d.p("Toda requisição atravessa uma cadeia fixa de middlewares. Qualquer falha é convertida em uma resposta JSON padronizada pelo manipulador de erros central.")
p = []
names = [("helmet", "headers"), ("cors", "origem"), ("json", "corpo"), ("morgan", "log"), ("rate limit", "200/15 min"), ("authenticate", "JWT"), ("authorize", "papel"), ("validate", "Zod")]
for i, (n, s) in enumerate(names):
    p.append(box(6 + i * 76, 6, 68, 40, n, s, "blue" if i < 5 else "amber", 9))
    if i: p.append(arrow(6 + i * 76 - 8, 26, 6 + i * 76, 26))
p.append(box(6, 90, 160, 40, "errorHandler", "ZodError 422 · AppError · 4xx/5xx", "red"))
p.append(box(440, 90, 160, 40, "controller → service", "Prisma / PostgreSQL", "green"))
p.append(arrow(300, 46, 90, 90, "401 · 403 · 422 · 429", dx=-40, dy=-6))
p.append(arrow(560, 46, 520, 90, "sucesso", dx=24))
d.figure(svg(612, 140, "".join(p)), "Pipeline de middlewares (azul: globais · âmbar: por rota)")
d.h3("Sequência — registro de uma movimentação")
d.figure(sequence(["Cliente", "Rotas", "Service", "Prisma", "PostgreSQL"], [
    (0, 1, "POST /api/movements + Bearer", "call"), (1, 1, "authenticate → validate (Zod)", "self"), (1, 2, "create(data, userId)", "call"),
    (2, 3, "product.findUnique", "call"), (2, 2, "regras: saldo, endereço, lote", "self"), (2, 3, "$transaction: movement.create + product.update", "call"),
    (3, 4, "INSERT + UPDATE", "call"), (1, 0, "201 Created — movimentação", "ret")],
    colors=["slate", "blue", "cyan", "violet", "green"], width=640), "POST /api/movements")

# 05 ─────────────────────────────────────────────────────────────────────────
d.section("05", "Modelo de dados", "ER, entidades e enumerações")
d.p("O modelo é definido em `prisma/schema.prisma` e versionado por **5 migrations**. São **14 entidades** e **12 enumerações**; os identificadores são `cuid` e as tabelas usam nomes em `snake_case` plural.")
B = {}
def ent(name, x, y, w=120, h=40, sub="", color="blue"):
    B[name] = (x, y, w, h)
    return box(x, y, w, h, name, sub, color, 10)
def link(a, b, label="1:N"):
    ax, ay, aw, ah = B[a]; bx, by, bw, bh = B[b]
    if ax + aw < bx: x1, y1, x2, y2 = ax + aw, ay + ah / 2, bx, by + bh / 2
    elif bx + bw < ax: x1, y1, x2, y2 = ax, ay + ah / 2, bx + bw, by + bh / 2
    elif ay < by: x1, y1, x2, y2 = ax + aw / 2, ay + ah, bx + bw / 2, by
    else: x1, y1, x2, y2 = ax + aw / 2, ay, bx + bw / 2, by + bh
    return arrow(x1, y1, x2, y2, label, dx=0, dy=-3)
er = []
er += [ent("Category", 10, 8, sub="nome · slug · cor", color="green"), ent("Brand", 10, 66, sub="nome · slug", color="green"), ent("Supplier", 10, 124, sub="CNPJ · contato", color="green")]
er += [ent("Product", 215, 36, w=150, h=56, sub="SKU · código · preços\nestoque mín/máx/atual", color="blue"), ent("Lot", 160, 140, w=110, sub="validade · quantidade", color="amber"), ent("WarehouseAddress", 300, 140, w=140, sub="corredor · rua · nível", color="amber")]
er += [ent("Customer", 500, 4, w=130, h=34, sub="", color="green"), ent("Movement", 500, 58, w=130, h=52, sub="tipo · quantidade · valor", color="violet"), ent("InventoryCount", 500, 140, w=130, sub="tipo · status · job (fila)", color="violet"), ent("InventoryCountItem", 500, 205, w=130, sub="esperado · contado · ajuste", color="violet")]
er += [ent("User", 680, 100, w=110, sub="papel · status", color="red"), ent("AuditLog", 680, 28, w=110, h=36, sub="", color="slate"), ent("Notification", 680, 176, w=110, h=36, sub="", color="slate"), ent("Setting", 10, 205, w=130, h=36, sub="empresa · preferências", color="slate")]
for a_, b_, l_ in [("Category", "Product", ""), ("Brand", "Product", ""), ("Supplier", "Product", ""), ("Product", "Movement", ""), ("Product", "Lot", ""), ("Product", "WarehouseAddress", ""),
                   ("User", "Movement", ""), ("User", "InventoryCount", ""), ("User", "AuditLog", ""), ("User", "Notification", ""), ("InventoryCount", "InventoryCountItem", ""), ("Customer", "Movement", "")]:
    er.append(link(a_, b_, l_))
d.figure(svg(800, 250, "".join(er)), "Diagrama entidade-relacionamento (simplificado)")
d.h3("Entidades")
d.table(["Entidade", "Campos principais", "Relacionamentos"], [
    ["User", "nome, e-mail (único), senha (hash), papel, departamento, status, avatarUrl, lastLogin", "1:N Movement, AuditLog, InventoryCount, Notification"],
    ["Category · Brand", "nome, slug, cor / logoUrl", "1:N Product"],
    ["Supplier · Customer", "nome, nome fantasia, CNPJ (único), e-mail, telefone, contato, cidade, UF, status", "Supplier: 1:N Product, Movement, Lot · Customer: referenciado por Movement"],
    ["Product", "nome, código interno, SKU, código de barras, unidade, dimensões, preços, estoque mín/máx/atual, status, `imageUrl`, `imageKey`", "N:1 Category, Brand, Supplier; 1:N Movement, Lot, WarehouseAddress"],
    ["WarehouseAddress", "código, corredor, rua, prateleira, nível, posição, status, capacidade, ocupação, lote, quantidade", "N:1 Product (opcional); origem/destino de Movement"],
    ["Movement", "tipo, quantidade, custo, valor total, NF, lote, motivo de saída, observações", "N:1 Product, User; opcionais Supplier, Customer, Lot, endereços"],
    ["Lot", "número (único), quantidade, fabricação, validade, endereço, status", "N:1 Product, Supplier"],
    ["InventoryCount", "nome, tipo, status, datas, totais, **jobStatus**, jobError, jobQueuedAt, jobFinishedAt, adjustedItems, failedItems", "N:1 User (responsável); 1:N InventoryCountItem"],
    ["InventoryCountItem", "esperado, contado, divergência, contado por/em, **adjustedAt**, **adjustmentError**", "N:1 InventoryCount, Product, User"],
    ["Notification", "alertKey, readAt — único por (alertKey, userId)", "N:1 User"],
    ["AuditLog", "ação, entidade, id, nome, valor antigo/novo (JSON), IP", "N:1 User"],
    ["Setting", "chave (`company`, `preferences`) e valor JSON", "—"],
], ["", "", ""])
d.h3("Enumerações")
d.table(["Enum", "Valores"], [
    ["UserRole", "admin · supervisor · operator · viewer"], ["UserStatus", "active · inactive · pending"], ["ProductStatus", "active · inactive · discontinued"],
    ["PositionStatus", "free · occupied · blocked · reserved"], ["MovementType", "entry · exit · transfer · loss · adjustment · inventory"], ["ExitReason", "sale · transfer · loss · break · internal"],
    ["LotStatus", "valid · expiring · expired · quarantine"], ["InventoryCountType", "full · partial · cyclic"], ["InventoryCountStatus", "planned · in_progress · review · completed"],
    ["**InventoryJobStatus**", "pending · processing · completed · partial · failed"], ["SupplierStatus · CustomerStatus", "active · inactive"],
], ["", ""])

# 06 ─────────────────────────────────────────────────────────────────────────
d.section("06", "Autenticação e autorização", "JWT, RBAC e matriz de permissões")
d.p("O login retorna um token JWT assinado com `JWT_SECRET`, contendo `sub` (id), `email` e `role`. Rotas protegidas exigem `Authorization: Bearer <token>`. Senhas são armazenadas apenas como hash bcrypt. O middleware `authenticate` confere o token e o estado/papel atuais da conta; `authorize(...)` aplica a lista de papéis permitidos em cada rota.")
d.figure(sequence(["Cliente", "API /auth", "Service", "PostgreSQL"], [
    (0, 1, "POST /login {email, password}", "call"), (1, 1, "authLimiter → validate (Zod)", "self"), (1, 2, "login(data)", "call"),
    (2, 3, "user.findUnique(email)", "call"), (3, 2, "usuário + hash", "ret"), (2, 2, "bcrypt.compare · status ativo", "self"), (2, 3, "update lastLogin", "call"),
    (1, 0, "200 { user, token }", "ret")], colors=["slate", "blue", "cyan", "green"], width=600), "Fluxo de login")
d.note("Como é aplicado", "As permissões são configuradas **explicitamente em cada rota**: a lista de papéis de `authorize(...)` é a fonte de verdade (visível no Swagger, em “Perfis permitidos”). Falhas retornam 401 (token) ou 403 (permissão). Os rótulos abaixo (Supervisor+, Operador+) apenas resumem as listas usadas.")
d.table(["Módulo", "Leitura", "Criar", "Alterar", "Excluir"], [
    ["Produtos · Categorias · Marcas · Fornecedores · Clientes · Endereços", "Autenticado", "admin, supervisor", "admin, supervisor", "admin"],
    ["Foto do produto (upload/remoção)", "Autenticado (URL assinada)", "admin, supervisor", "admin, supervisor", "admin, supervisor"],
    ["Usuários", "Autenticado", "admin, supervisor", "admin, supervisor (status e senha: admin)", "admin"],
    ["Movimentações", "Autenticado", "admin, supervisor, operator", "—", "—"],
    ["Lotes", "Autenticado", "admin, supervisor, operator", "admin, supervisor", "admin"],
    ["Inventário (contagens)", "Autenticado", "admin, supervisor", "admin, supervisor, operator (reprocessar: admin, supervisor)", "admin"],
    ["Dashboard · Relatórios · Analytics", "Autenticado", "—", "—", "—"],
    ["Alertas", "Autenticado", "—", "marcar como lido: autenticado", "—"],
    ["Auditoria", "admin, supervisor", "—", "—", "—"],
    ["Configurações", "Autenticado", "—", "admin", "—"],
    ["Auth: register · login", "Público", "—", "senha/perfil: autenticado", "—"],
], ["", "", "", "", ""])

# 07 ─────────────────────────────────────────────────────────────────────────
d.section("07", "Regras de negócio", "Movimentações, inventário, fotos, analytics")
d.h3("Registro de movimentações")
d.p("A criação de uma movimentação é atômica: o registro do movimento e a atualização do saldo (produto, endereço e lote) ocorrem na mesma transação. `entry` e `adjustment` (aumento) incrementam o saldo; `exit`, `loss` e `adjustment` (redução) decrementam e exigem saldo suficiente (senão 400); `inventory` define o saldo para a quantidade contada; `transfer` move entre endereços sem alterar o saldo. O valor total é `quantity × unitCost`. A lógica é exposta como `createWithin(tx, …)` para ser reaproveitada em outros fluxos transacionais (o worker do inventário).")
d.h3("Situação de estoque")
d.table(["Situação", "Regra (saldo × mínimo)", "Uso"], [
    [("tag", "ok", "ok"), "saldo > mínimo", "Listagem de produtos e filtros"], [("tag", "warn", "low"), "mínimo/2 < saldo ≤ mínimo", "Alerta de reposição"],
    [("tag", "bad", "critical"), "0 < saldo ≤ mínimo/2", "Alerta de alta prioridade"], [("tag", "bad", "out"), "saldo = 0", "Alerta de ruptura"]], ["", "", ""])
d.h3("Inventário e ajuste de estoque assíncrono")
d.p("A contagem segue `planned → in_progress → review → completed`. Registrar a contagem de um item calcula a divergência (`contado − esperado`). Ao **concluir** (`review → completed`), a API grava `jobStatus = pending` e publica uma mensagem no **SQS**; o **worker** então registra uma movimentação `inventory` para cada item divergente (o estoque passa a ser a quantidade contada), em lotes de `INVENTORY_BATCH_SIZE` itens, atualizando `adjustedItems`/`failedItems` para a tela acompanhar.")
d.ul(["**Idempotência:** cada item só é ajustado se `adjustedAt` for nulo — marca gravada na mesma transação da movimentação. Reentregas e reprocessamentos não duplicam ajustes.",
      "**Pendência manual:** produto em vários endereços ou lotes não pode ser ajustado automaticamente; o item recebe `adjustmentError` e o job termina como `partial`.",
      "**Falhas:** erro inesperado devolve a mensagem à fila; após `QUEUE_MAX_RECEIVES` tentativas o job vira `failed` e a fila move a mensagem à DLQ. `POST /api/inventory/{id}/reprocess` reenfileira jobs `failed`, `partial` ou travados há mais de 15 min.",
      "Inventários concluídos **antes** deste recurso têm `jobStatus = null` e não são reprocessados."])
d.h3("Foto de produto (Amazon S3)")
d.p("`POST /api/products/{id}/image` recebe `multipart/form-data` (campo `image`; JPEG, PNG, WebP ou GIF até 5 MB), confere o tipo pelos primeiros bytes (SVG é recusado), grava no S3 em `<prefixo>products/<idProduto>/<uuid>.<ext>` e guarda a chave em `products.imageKey`. As respostas de produto trazem `imageUrl` como **URL assinada temporária**. A foto antiga só é apagada depois que a nova está gravada; excluir o produto apaga a foto. `npm run storage:cleanup` remove objetos órfãos. Detalhes em *Computação em Nuvem*.")
d.h3("Alertas, lotes e curva ABC")
d.p("O módulo de alertas consolida, em tempo real, produtos em ruptura, críticos e com estoque baixo, além de lotes a vencer (janela configurável, padrão 30 dias) e vencidos; a leitura é persistida por usuário em `notifications` (`alertKey`). Lotes têm número único, fabricação, validade, endereço e status. A curva ABC ordena os produtos pelo valor movimentado (`Σ totalValue`): classe A até 80% acumulado, B até 95%, C acima.")
d.h3("Analytics (previsão de demanda e matriz ABC×XYZ)")
d.p("`GET /api/analytics` entrega a previsão semanal de demanda (histórico real × projeção, com faixa de incerteza), a matriz **ABC × XYZ** (valor movimentado × variabilidade da demanda, CV = desvio ÷ média: X < 0,5; Y até 1,0; Z acima), o giro e as **sugestões de compra** (cobertura de 28 dias de demanda prevista + estoque de segurança, considerando o prazo de reposição das configurações) com urgência e motivo, além de *insights*. A previsão vem de um serviço de ML **opcional** (`ML_SERVICE_URL`); sem ele — que é o caso deste repositório, que não inclui o serviço Python — o backend usa **média móvel**, e `GET /api/analytics/model` informa a origem usada.")
d.h3("Dashboard e configurações")
d.p("O dashboard oferece resumo geral (KPIs, ocupação e valor de estoque), tendência mensal de entradas e saídas, distribuição por categoria, produtos mais movimentados, curva ABC e mapa de calor por dia/hora. `GET/PUT /api/settings` guarda os dados da empresa e as preferências (dias de alerta de validade e prazo de reposição); só o administrador altera.")

# 08 ─────────────────────────────────────────────────────────────────────────
d.section("08", "Catálogo de endpoints", f"{len(TAGS)} módulos · {N_ENDPOINTS} rotas", newpage=True)
d.p("Base URL padrão: `http://localhost:3001`. Todas as rotas ficam sob `/api`. Listagens aceitam paginação (`page`, `limit` ≤ 100) e retornam `{ data, total, page, limit, totalPages }`. Esta tabela é gerada a partir do `swagger.json` exportado do código (`npm run docs:export`).")
for i, (tag, label, base) in enumerate(TAGS, 1):
    rows = []
    for m, path, op in ops:
        if op.get("tags", [""])[0] != tag: continue
        key = f"{m} {path}"
        sub = path[len(base):] or "/"
        sub = re.sub(r"\{(\w+)\}", r":\1", sub)
        rows.append((path, [("tag", f"m-{m.lower()}", m), sub, PT.get(key, op.get("summary", "")), access(op)]))
    order = {"GET": 0, "POST": 1, "PUT": 2, "PATCH": 3, "DELETE": 4}
    rows.sort(key=lambda r: (r[1][0][2] != "GET", 0))  # estável
    d.h4(f"{i:02d} · {label}  {base}")
    d.table(["Método", "Rota", "Descrição", "Acesso"], [r[1] for r in rows], ["c", "m", "", "c"])
# o "tag" m-get etc. usa a classe de cor definida no CSS

# 09 ─────────────────────────────────────────────────────────────────────────
d.section("09", "Validação e tratamento de erros", "Zod, AppError, códigos HTTP")
d.p("Cada módulo possui schemas Zod em `src/schemas`. O middleware `validate` valida o corpo e `validateQuery` valida e converte (`coerce`) os parâmetros de consulta antes de chegarem ao controller.")
d.code('''const createMovementSchema = z.object({
  type: z.enum(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory']),
  productId: z.string().cuid(),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0).default(0),
  ...
}).superRefine(/* regras cruzadas: quantidade > 0, direção do ajuste, endereços da transferência */)''')
d.table(["Código", "Origem", "Corpo"], [
    ["400", "Regra de negócio violada (ex.: estoque insuficiente, arquivo ausente)", "`{ message }`"], ["401", "Token ausente, inválido ou expirado; credenciais inválidas", "`{ message }`"],
    ["403", "Papel sem permissão; conta inativa", "`{ message }`"], ["404", "Recurso não encontrado", "`{ message }`"],
    ["409", "Conflito (unicidade, estado concorrente, nada a reprocessar)", "`{ message }`"], ["413", "Foto maior que `STORAGE_MAX_IMAGE_MB`", "`{ message }`"],
    ["415", "Arquivo que não é JPEG, PNG, WebP ou GIF", "`{ message }`"], ["422", "Falha de validação Zod", "`{ message, errors: [{ field, message }] }`"],
    ["429", "Limite de requisições excedido", "`{ message }`"], ["500", "Erro inesperado (detalhes só no log do servidor)", "`{ message }`"],
    ["503", "Storage ou fila não configurados/indisponíveis; banco indisponível", "`{ message }`"]], ["c", "", ""])

# 10 ─────────────────────────────────────────────────────────────────────────
d.section("10", "Segurança e auditoria", "Helmet, CORS, rate limit, audit log")
d.table(["Mecanismo", "Detalhes"], [
    ["Helmet", "Cabeçalhos HTTP de segurança em toda a API"], ["CORS", "Habilitado para consumo pelo front-end (revisar origens por ambiente antes de implantar)"],
    ["Rate limiting", "`globalLimiter`: 200 req / 15 min por IP · `authLimiter`: 20 req / 15 min em `/auth/login` e `/auth/register`"],
    ["Senhas", "Hash bcrypt (custo 10); o hash nunca é devolvido nas respostas"], ["JWT", "Assinado com `JWT_SECRET`, expiração configurável (`JWT_EXPIRES_IN`)"],
    ["Validação", "Toda entrada passa por schema Zod antes da regra de negócio"],
    ["Upload", "Autenticado, papel admin/supervisor, limite de tamanho, tipo conferido pelo conteúdo, SVG recusado, chaves restritas ao prefixo do projeto"],
    ["Credenciais de nuvem", "Apenas em variáveis de ambiente (`.env` fora do Git); URLs assinadas têm validade curta"],
    ["Erros", "`AppError` + handler central; erros internos não vazam detalhes ao cliente"]], ["", ""])
d.p("A tabela `audit_logs` registra ação, entidade, id e nome, valor novo/antigo (JSON), IP e usuário. O middleware `audit(entity, action)` intercepta a resposta JSON de operações bem-sucedidas e grava o log sem atrasar a resposta; senhas e **URLs assinadas** são removidas antes de gravar. A consulta fica em `/api/audit`, restrita a supervisor e administrador.")

# 11 ─────────────────────────────────────────────────────────────────────────
d.section("11", "Testes automatizados", f"{tests['total']} testes · {len(T)} suítes")
d.p(f"A suíte (Jest + Supertest) exercita a aplicação Express real contra um PostgreSQL dedicado (`TEST_DATABASE_URL`, com “test” no nome) e usa simulações para AWS. Última execução completa: **{tests['passed']} de {tests['total']} passando** ({tests['generated'][8:]}/{tests['generated'][5:7]}/{tests['generated'][:4]}).")
SC = {"auth.test.ts": "Registro, login, perfil e senha", "user.test.ts": "CRUD de usuários e permissões", "product.test.ts": "CRUD de produtos, scan, filtros", "category.test.ts": "CRUD de categorias",
      "movement.test.ts": "Entrada/saída e saldo", "movement-service.test.ts": "Regras de movimentação (serviço)", "warehouse.test.ts": "Endereços de armazém", "flows.test.ts": "Fluxos ponta a ponta entre módulos",
      "critical-security.test.ts": "Segurança: acesso, tokens, validações críticas", "inventory-service.test.ts": "Transições e contagem do inventário", "report-service.test.ts": "Relatórios",
      "ml-service.test.ts": "Cliente do serviço de previsão e fallback", "ml-analytics.test.ts": "Analytics, ABC×XYZ e sugestões", "storage-service.test.ts": "Storage S3/local, URLs assinadas, tipos de imagem",
      "product-image-service.test.ts": "Foto de produto: ordem, falhas, limites, URL assinada", "audit-sanitize.test.ts": "Remoção de segredos no log de auditoria",
      "queue-service.test.ts": "Fila SQS/local: envio, visibilidade, DLQ", "queue-sqs-integration.test.ts": "Driver SQS contra servidor SQS real (opcional)",
      "inventory-processing.test.ts": "Ajuste de estoque: idempotência, lotes, pendências", "inventory-worker.test.ts": "Worker: retry, falha final, mensagem inválida",
      "inventory-queue-flow.test.ts": "Concluir inventário enfileira; reprocessamento", "inventory-async-e2e.test.ts": "Inventário assíncrono ponta a ponta (banco real)"}
d.table(["Arquivo", "Escopo", "Casos"], [[f"`{s['file']}`", SC.get(s["file"], ""), s["tests"]] for s in tests["suites"]] + [["**Total**", "", f"**{tests['total']}**"]], ["", "", "c"])
d.code('''npm test                # suíte completa (--runInBand)
npm run test:coverage   # relatório em coverage/
SQS_TEST_ENDPOINT=http://127.0.0.1:9324 npm test -- queue-sqs-integration   # teste opcional do driver SQS''')

# 12 ─────────────────────────────────────────────────────────────────────────
d.section("12", "Operação e execução", "Variáveis, scripts, Swagger")
d.code('''cd backend
npm install
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET (+ storage/fila, se usar)
npm run prisma:migrate        # aplica migrations
npm run prisma:seed           # dados de demonstração
npm run dev                   # http://localhost:3001 (hot-reload; worker embutido)''')
d.h3("Variáveis de ambiente")
d.table(["Variável", "Descrição"], [
    ["`DATABASE_URL` · `TEST_DATABASE_URL`", "PostgreSQL de aplicação e de testes (nome com “test”)"], ["`PORT` · `NODE_ENV`", "Porta (3001) e ambiente"], ["`JWT_SECRET` · `JWT_EXPIRES_IN`", "Assinatura e validade dos tokens"],
    ["`STORAGE_DRIVER`, `S3_*`, `STORAGE_*`", "Fotos de produto: driver `s3`/`local`, bucket, região, credenciais, prefixo, validade das URLs, limite de tamanho, carência de órfãos"],
    ["`QUEUE_DRIVER`, `SQS_*`, `QUEUE_*`, `INVENTORY_BATCH_SIZE`", "Mensageria: driver `sqs`/`local`, URL da fila, credenciais, visibilidade, tentativas, worker `embedded`/`off`, tamanho do lote"],
    ["`ML_SERVICE_URL` · `ML_TIMEOUT_MS`", "Serviço de previsão opcional; sem ele a previsão usa média móvel"]], ["", ""])
d.h3("Scripts")
d.table(["Script", "Função"], [
    ["`dev` · `build` · `start`", "Hot-reload; compila para `dist/`; executa o build"], ["`worker` · `worker:start`", "Processo dedicado ao consumo da fila (use `QUEUE_WORKER=off` na API)"],
    ["`prisma:migrate` · `prisma:generate` · `prisma:studio` · `prisma:seed`", "Migrations, client, interface gráfica e massa de demonstração"],
    ["`queues:setup`", "Cria a fila de inventário e a DLQ no SQS e imprime as variáveis"], ["`storage:cleanup`", "Remove do storage fotos sem produto (`--dry-run` só lista)"],
    ["`docs:check` · `docs:export`", "Confere rotas × Swagger · exporta `docs/swagger.json`"], ["`test` · `test:coverage`", "Testes e cobertura"]], ["", ""])
d.table(["URL", "Conteúdo"], [["`GET /`", "Painel HTML com todos os módulos e endpoints"], ["`GET /docs`", "Swagger UI com autenticação Bearer"], ["`GET /docs.json`", "Especificação OpenAPI 3.0"],
                            ["`GET /health/live` · `/health/ready`", "Liveness e prontidão (conexão com o banco)"]], ["", ""])

# 13 ─────────────────────────────────────────────────────────────────────────
d.section("13", "Infraestrutura em nuvem", "S3, SQS e implantação-alvo")
d.p("Os dois serviços AWS usados pelo backend estão detalhados no documento **Computação em Nuvem II**: Amazon S3 (fotos) e Amazon SQS (fila do inventário). A arquitetura-alvo prevê API e worker em EC2, banco em RDS, Application Load Balancer, ACM e CloudWatch.")
d.table(["Serviço", "Papel", "Situação"], [
    ["Amazon S3", "Fotos de produto (upload via API, URLs assinadas)", ("tag", "ok", "Implementado")], ["Amazon SQS", "Fila de inventário + DLQ, consumida pelo worker", ("tag", "warn", "Implementado · fila real pendente")],
    ["EC2 · ALB · RDS · CloudWatch", "Hospedagem, balanceamento, banco e observabilidade", ("tag", "gray", "Planejado")]], ["", "", ""])

if __name__ == "__main__":
    print(d.build())
