import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { swaggerSpec } from './config/swagger'
import { errorHandler } from './middleware/error.middleware'
import { globalLimiter } from './middleware/rate-limit.middleware'

import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import productRoutes from './routes/product.routes'
import categoryRoutes from './routes/category.routes'
import brandRoutes from './routes/brand.routes'
import supplierRoutes from './routes/supplier.routes'
import customerRoutes from './routes/customer.routes'
import warehouseRoutes from './routes/warehouse.routes'
import movementRoutes from './routes/movement.routes'
import lotRoutes from './routes/lot.routes'
import inventoryRoutes from './routes/inventory.routes'
import dashboardRoutes from './routes/dashboard.routes'
import alertRoutes from './routes/alert.routes'
import auditRoutes from './routes/audit.routes'
import reportRoutes from './routes/report.routes'

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json())
app.use(morgan(process.env.NODE_ENV === 'test' ? 'silent' : 'dev'))
app.use(globalLimiter)

app.get('/', (_req, res) => {
  const port = process.env.PORT ?? 3001
  const baseUrl = `http://localhost:${port}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WMS API — Documentação</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #21253a;
      --border: #2d3148;
      --accent: #6366f1;
      --accent-glow: rgba(99,102,241,.18);
      --green: #22c55e;
      --yellow: #eab308;
      --red: #ef4444;
      --blue: #3b82f6;
      --cyan: #06b6d4;
      --orange: #f97316;
      --purple: #a855f7;
      --text: #e2e8f0;
      --muted: #64748b;
      --radius: 10px;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    /* ── HEADER ── */
    header {
      background: linear-gradient(135deg, #1e1b4b 0%, #1a1d27 60%, #0f1117 100%);
      border-bottom: 1px solid var(--border);
      padding: 48px 24px 36px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    header::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 60% 80% at 50% 0%, rgba(99,102,241,.15), transparent);
      pointer-events: none;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent-glow);
      border: 1px solid rgba(99,102,241,.4);
      color: #a5b4fc;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    header h1 {
      font-size: clamp(28px, 5vw, 48px);
      font-weight: 800;
      letter-spacing: -.02em;
      background: linear-gradient(135deg, #e0e7ff, #a5b4fc, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    header p {
      color: var(--muted);
      font-size: 16px;
      max-width: 520px;
      margin: 0 auto 28px;
    }
    .header-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all .2s;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 4px 20px rgba(99,102,241,.35);
    }
    .btn-primary:hover { background: #4f46e5; transform: translateY(-1px); }
    .btn-outline {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-outline:hover { border-color: var(--accent); color: #a5b4fc; background: var(--accent-glow); }

    /* ── MAIN LAYOUT ── */
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }

    /* ── STATS ROW ── */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 48px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      text-align: center;
    }
    .stat-card .num {
      font-size: 32px;
      font-weight: 800;
      color: var(--accent);
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-card .lbl {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .07em;
    }

    /* ── SECTION TITLE ── */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: var(--muted);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    /* ── AUTH BOX ── */
    .auth-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 40px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .auth-box .icon { font-size: 24px; flex-shrink: 0; }
    .auth-box h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .auth-box p { font-size: 13px; color: var(--muted); }
    .auth-box code {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      background: var(--surface2);
      border: 1px solid var(--border);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #a5b4fc;
    }

    /* ── ENDPOINT GROUPS ── */
    .groups { display: grid; gap: 20px; }

    .group {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      user-select: none;
    }
    .group-header:hover { background: #262a40; }
    .group-icon { font-size: 20px; }
    .group-name { font-weight: 700; font-size: 15px; flex: 1; }
    .group-base {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 12px;
      color: var(--muted);
      background: var(--bg);
      padding: 3px 10px;
      border-radius: 5px;
      border: 1px solid var(--border);
    }
    .group-count {
      background: var(--accent-glow);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid rgba(99,102,241,.3);
    }
    .group-toggle { color: var(--muted); font-size: 12px; transition: transform .2s; }
    .group.open .group-toggle { transform: rotate(180deg); }

    .endpoints { display: none; }
    .group.open .endpoints { display: block; }

    .endpoint {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 13px 20px;
      border-bottom: 1px solid var(--border);
      transition: background .15s;
    }
    .endpoint:last-child { border-bottom: none; }
    .endpoint:hover { background: rgba(255,255,255,.03); }

    .method {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      padding: 4px 10px;
      border-radius: 5px;
      text-align: center;
      border: 1px solid;
    }
    .GET    { color: var(--green);  border-color: rgba(34,197,94,.35);  background: rgba(34,197,94,.08); }
    .POST   { color: var(--blue);   border-color: rgba(59,130,246,.35); background: rgba(59,130,246,.08); }
    .PATCH  { color: var(--yellow); border-color: rgba(234,179,8,.35);  background: rgba(234,179,8,.08); }
    .DELETE { color: var(--red);    border-color: rgba(239,68,68,.35);  background: rgba(239,68,68,.08); }

    .ep-path {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 13px;
      color: var(--text);
    }
    .ep-path .param { color: #f97316; }

    .ep-desc { font-size: 12px; color: var(--muted); text-align: right; }

    .role-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .role-admin { background: rgba(239,68,68,.15); color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
    .role-supervisor { background: rgba(234,179,8,.1); color: #fde68a; border: 1px solid rgba(234,179,8,.25); }
    .role-public { background: rgba(34,197,94,.1); color: #86efac; border: 1px solid rgba(34,197,94,.25); }

    /* ── FOOTER ── */
    footer {
      border-top: 1px solid var(--border);
      padding: 24px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }
    footer a { color: #818cf8; text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 600px) {
      .endpoint { grid-template-columns: 70px 1fr; }
      .ep-desc { display: none; }
    }
  </style>
</head>
<body>

<header>
  <div class="badge">⚡ REST API</div>
  <h1>WMS API</h1>
  <p>Warehouse Management System — Sistema completo para gestão de estoque, movimentações e armazéns.</p>
  <div class="header-actions">
    <a class="btn btn-primary" href="/docs">📄 Swagger UI</a>
    <a class="btn btn-outline" href="/docs.json">{ } OpenAPI JSON</a>
  </div>
</header>

<main>

  <div class="stats">
    <div class="stat-card"><div class="num">15</div><div class="lbl">Módulos</div></div>
    <div class="stat-card"><div class="num">67</div><div class="lbl">Endpoints</div></div>
    <div class="stat-card"><div class="num">JWT</div><div class="lbl">Autenticação</div></div>
    <div class="stat-card"><div class="num">3</div><div class="lbl">Níveis de acesso</div></div>
  </div>

  <div class="section-title">Autenticação</div>
  <div class="auth-box">
    <div class="icon">🔐</div>
    <div>
      <h3>Bearer Token (JWT)</h3>
      <p>Todas as rotas protegidas exigem o header <code>Authorization: Bearer &lt;token&gt;</code>.<br/>
      Obtenha o token via <code>POST /api/auth/login</code>. Tokens expiram conforme configuração do servidor.</p>
    </div>
  </div>

  <div class="section-title">Endpoints</div>
  <div class="groups" id="groups"></div>

</main>

<footer>
  WMS API v1.0.0 &mdash; <a href="/docs">Documentação interativa (Swagger)</a>
  &nbsp;·&nbsp; Base URL: <code style="color:#818cf8">${baseUrl}</code>
</footer>

<script>
  const groups = [
    {
      name: 'Autenticação', icon: '🔐', base: '/api/auth', open: true,
      endpoints: [
        { method: 'POST', path: '/api/auth/register', desc: 'Registrar novo usuário', role: 'public' },
        { method: 'POST', path: '/api/auth/login',    desc: 'Login e obtenção de token', role: 'public' },
        { method: 'GET',  path: '/api/auth/me',       desc: 'Dados do usuário autenticado', role: null },
        { method: 'GET',  path: '/api/auth/profile',  desc: 'Perfil completo', role: null },
        { method: 'PATCH',path: '/api/auth/password', desc: 'Alterar senha', role: null },
      ]
    },
    {
      name: 'Usuários', icon: '👤', base: '/api/users',
      endpoints: [
        { method: 'GET',    path: '/api/users',     desc: 'Listar usuários', role: null },
        { method: 'GET',    path: '/api/users/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/users',     desc: 'Criar usuário', role: 'admin' },
        { method: 'PATCH',  path: '/api/users/:id', desc: 'Atualizar usuário', role: 'admin' },
        { method: 'DELETE', path: '/api/users/:id', desc: 'Remover usuário', role: 'admin' },
      ]
    },
    {
      name: 'Produtos', icon: '📦', base: '/api/products',
      endpoints: [
        { method: 'GET',    path: '/api/products/scan/:code', desc: 'Scan por código de barras', role: null },
        { method: 'GET',    path: '/api/products',            desc: 'Listar produtos (filtros + paginação)', role: null },
        { method: 'GET',    path: '/api/products/:id',        desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/products',            desc: 'Criar produto', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/products/:id',        desc: 'Atualizar produto', role: 'supervisor' },
        { method: 'DELETE', path: '/api/products/:id',        desc: 'Remover produto', role: 'admin' },
      ]
    },
    {
      name: 'Categorias', icon: '🗂️', base: '/api/categories',
      endpoints: [
        { method: 'GET',    path: '/api/categories',     desc: 'Listar categorias', role: null },
        { method: 'GET',    path: '/api/categories/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/categories',     desc: 'Criar categoria', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/categories/:id', desc: 'Atualizar categoria', role: 'supervisor' },
        { method: 'DELETE', path: '/api/categories/:id', desc: 'Remover categoria', role: 'admin' },
      ]
    },
    {
      name: 'Marcas', icon: '🏷️', base: '/api/brands',
      endpoints: [
        { method: 'GET',    path: '/api/brands',     desc: 'Listar marcas', role: null },
        { method: 'GET',    path: '/api/brands/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/brands',     desc: 'Criar marca', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/brands/:id', desc: 'Atualizar marca', role: 'supervisor' },
        { method: 'DELETE', path: '/api/brands/:id', desc: 'Remover marca', role: 'admin' },
      ]
    },
    {
      name: 'Fornecedores', icon: '🏭', base: '/api/suppliers',
      endpoints: [
        { method: 'GET',    path: '/api/suppliers',     desc: 'Listar fornecedores', role: null },
        { method: 'GET',    path: '/api/suppliers/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/suppliers',     desc: 'Criar fornecedor', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/suppliers/:id', desc: 'Atualizar fornecedor', role: 'supervisor' },
        { method: 'DELETE', path: '/api/suppliers/:id', desc: 'Remover fornecedor', role: 'admin' },
      ]
    },
    {
      name: 'Clientes', icon: '🏪', base: '/api/customers',
      endpoints: [
        { method: 'GET',    path: '/api/customers',     desc: 'Listar clientes (busca + paginação)', role: null },
        { method: 'GET',    path: '/api/customers/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/customers',     desc: 'Criar cliente', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/customers/:id', desc: 'Atualizar cliente', role: 'supervisor' },
        { method: 'DELETE', path: '/api/customers/:id', desc: 'Remover cliente', role: 'admin' },
      ]
    },
    {
      name: 'Armazéns', icon: '🏢', base: '/api/warehouse',
      endpoints: [
        { method: 'GET',    path: '/api/warehouse',     desc: 'Listar armazéns', role: null },
        { method: 'GET',    path: '/api/warehouse/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/warehouse',     desc: 'Criar armazém', role: 'supervisor' },
        { method: 'PATCH',  path: '/api/warehouse/:id', desc: 'Atualizar armazém', role: 'supervisor' },
        { method: 'DELETE', path: '/api/warehouse/:id', desc: 'Remover armazém', role: 'admin' },
      ]
    },
    {
      name: 'Movimentações', icon: '🔄', base: '/api/movements',
      endpoints: [
        { method: 'GET',  path: '/api/movements',     desc: 'Listar movimentações (filtros + paginação)', role: null },
        { method: 'GET',  path: '/api/movements/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST', path: '/api/movements',     desc: 'Registrar movimentação (entrada/saída)', role: null },
      ]
    },
    {
      name: 'Lotes', icon: '📋', base: '/api/lots',
      endpoints: [
        { method: 'GET',    path: '/api/lots',     desc: 'Listar lotes', role: null },
        { method: 'GET',    path: '/api/lots/:id', desc: 'Buscar por ID', role: null },
        { method: 'POST',   path: '/api/lots',     desc: 'Criar lote', role: null },
        { method: 'PATCH',  path: '/api/lots/:id', desc: 'Atualizar lote', role: 'supervisor' },
        { method: 'DELETE', path: '/api/lots/:id', desc: 'Remover lote', role: 'admin' },
      ]
    },
    {
      name: 'Inventário', icon: '📊', base: '/api/inventory',
      endpoints: [
        { method: 'GET',   path: '/api/inventory',            desc: 'Posição atual do estoque', role: null },
        { method: 'GET',   path: '/api/inventory/low-stock',  desc: 'Produtos com estoque baixo', role: null },
        { method: 'GET',   path: '/api/inventory/expiring',   desc: 'Lotes próximos ao vencimento', role: null },
        { method: 'GET',   path: '/api/inventory/:productId', desc: 'Histórico de estoque por produto', role: null },
      ]
    },
    {
      name: 'Dashboard', icon: '📈', base: '/api/dashboard',
      endpoints: [
        { method: 'GET', path: '/api/dashboard/summary',     desc: 'Resumo geral do sistema', role: null },
        { method: 'GET', path: '/api/dashboard/movements',   desc: 'Movimentações recentes', role: null },
        { method: 'GET', path: '/api/dashboard/top-products',desc: 'Produtos mais movimentados', role: null },
      ]
    },
    {
      name: 'Alertas', icon: '🔔', base: '/api/alerts',
      endpoints: [
        { method: 'GET',   path: '/api/alerts',            desc: 'Todos os alertas com status de leitura', role: null },
        { method: 'GET',   path: '/api/alerts/stock',       desc: 'Alertas de estoque (agrupados por severidade)', role: null },
        { method: 'GET',   path: '/api/alerts/expiring',    desc: 'Lotes próximos ao vencimento', role: null },
        { method: 'PATCH', path: '/api/alerts/read-all',    desc: 'Marcar todos como lidos', role: null },
        { method: 'PATCH', path: '/api/alerts/:id/read',    desc: 'Marcar alerta como lido', role: null },
      ]
    },
    {
      name: 'Auditoria', icon: '🕵️', base: '/api/audit',
      endpoints: [
        { method: 'GET', path: '/api/audit',     desc: 'Logs de auditoria', role: 'admin' },
        { method: 'GET', path: '/api/audit/:id', desc: 'Detalhe de log', role: 'admin' },
      ]
    },
    {
      name: 'Relatórios', icon: '📑', base: '/api/reports',
      endpoints: [
        { method: 'GET', path: '/api/reports/movements',  desc: 'Movimentações por tipo e produto', role: null },
        { method: 'GET', path: '/api/reports/stock',      desc: 'Posição de estoque com valores', role: null },
        { method: 'GET', path: '/api/reports/lots',       desc: 'Validade de lotes (vencidos, vencendo, válidos)', role: null },
        { method: 'GET', path: '/api/reports/warehouse',  desc: 'Ocupação do armazém', role: null },
        { method: 'GET', path: '/api/reports/abc',        desc: 'Curva ABC por valor de movimentação', role: null },
        { method: 'GET', path: '/api/reports/inventory',  desc: 'Contagens de inventário e divergências', role: null },
        { method: 'GET', path: '/api/reports/suppliers',  desc: 'Compras e entradas por fornecedor', role: null },
      ]
    },
  ];

  const roleBadge = (role) => {
    if (!role) return '';
    const map = { admin: 'role-admin', supervisor: 'role-supervisor', public: 'role-public' };
    const labels = { admin: '🔒 Admin', supervisor: '🛡 Supervisor', public: '🌐 Público' };
    return \`<span class="role-badge \${map[role]}">\${labels[role]}</span>\`;
  };

  const formatPath = (path) =>
    path.replace(/(:[\w]+)/g, '<span class="param">$1</span>');

  const container = document.getElementById('groups');
  groups.forEach((g, i) => {
    const open = g.open ? 'open' : '';
    const div = document.createElement('div');
    div.className = 'group ' + open;
    div.innerHTML = \`
      <div class="group-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="group-icon">\${g.icon}</span>
        <span class="group-name">\${g.name}</span>
        <span class="group-base">\${g.base}</span>
        <span class="group-count">\${g.endpoints.length} rotas</span>
        <span class="group-toggle">▼</span>
      </div>
      <div class="endpoints">
        \${g.endpoints.map(ep => \`
          <div class="endpoint">
            <span class="method \${ep.method}">\${ep.method}</span>
            <span class="ep-path">\${formatPath(ep.path)}</span>
            <span class="ep-desc">\${roleBadge(ep.role) || \`<span style="color:var(--muted);font-size:12px">\${ep.desc}</span>\`}</span>
          </div>
        \`).join('')}
      </div>
    \`;
    container.appendChild(div);
  });
</script>

</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }))
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/movements', movementRoutes)
app.use('/api/lots', lotRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/reports', reportRoutes)

app.use(errorHandler)

export default app
