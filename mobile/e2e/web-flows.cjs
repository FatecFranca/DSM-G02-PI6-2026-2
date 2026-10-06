/**
 * E2E do app (build web) contra a API real: login, entrada, saída, contagem de inventário, CRUD e permissões.
 *
 *   1. backend rodando e populado (npm run prisma:seed) em API_URL
 *   2. npm run export:web && npm run serve:web          (app em APP_URL)
 *   3. npm run e2e
 *
 * ATENÇÃO: altera dados do banco de desenvolvimento (estoque de um produto, cria um inventário). Rode o seed depois.
 * Variáveis: API_URL, APP_URL, CHROME_PATH.
 */
const { chromium } = require('playwright-core')
const API = process.env.API_URL ?? 'http://localhost:3001/api'
const APP = process.env.APP_URL ?? 'http://localhost:8081'
const results = []
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`) }

async function token(email) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Senha@123' }) })
  return (await r.json()).token
}
const get = async (t, path) => (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${t}` } })).json()

async function session(browser, email, password = 'Senha@123') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.errors = []
  p.on('pageerror', e => p.errors.push(e.message))
  await p.goto(`${APP}/login`, { waitUntil: 'networkidle' })
  await p.getByLabel('E-mail corporativo').fill(email)
  await p.getByLabel('Senha').first().fill(password)
  await p.getByRole('button', { name: 'Entrar' }).click()
  return p
}
const pickSelect = async (p, label, option) => {
  await p.getByLabel(label, { exact: false }).first().click()
  await p.getByRole('menuitem').filter({ hasText: option }).first().click()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
  const admin = await token('admin@stockiq.com')

  // 1. login com senha errada
  {
    const p = await session(browser, 'admin@stockiq.com', 'errada123')
    await p.waitForTimeout(1200)
    check('login inválido mostra erro e permanece no login', (await p.getByText('Invalid credentials').count()) > 0 && p.url().includes('/login'))
  }

  // 2. entrada de estoque (operador)
  const mouse = (await get(admin, '/products?search=Mouse&limit=1')).data[0]
  const before = mouse.currentStock
  {
    const p = await session(browser, 'operador@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/entradas/nova`, { waitUntil: 'networkidle' })
    await p.getByLabel('Produto').first().click()
    await p.getByPlaceholder('Nome, código, SKU ou código de barras').fill('Mouse')
    await p.getByText('Mouse Óptico USB').first().click()
    await p.getByLabel('Quantidade').fill('3')
    await pickSelect(p, 'Endereço de destino', 'mesmo produto')
    await p.getByRole('button', { name: 'Registrar entrada' }).click()
    await p.waitForTimeout(1500)
    const after = (await get(admin, `/products/${mouse.id}`)).currentStock
    check('entrada via app aumenta o estoque', after === before + 3, `${before} → ${after}`)
    check('após salvar volta para a lista', !p.url().includes('/nova'))
  }

  // 3. saída com validação de estoque
  {
    const p = await session(browser, 'operador@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/saidas/nova?productId=${mouse.id}`, { waitUntil: 'networkidle' })
    await p.getByLabel('Quantidade').fill('9999')
    await pickSelect(p, 'Endereço de origem', 'A-')
    await p.getByRole('button', { name: 'Registrar saída' }).click()
    await p.waitForTimeout(500)
    check('saída acima do estoque é barrada no app', (await p.getByText('Estoque insuficiente').count()) > 0)
    await p.getByLabel('Quantidade').fill('2')
    await p.getByRole('button', { name: 'Registrar saída' }).click()
    await p.waitForTimeout(1500)
    const after = (await get(admin, `/products/${mouse.id}`)).currentStock
    check('saída via app reduz o estoque', after === before + 3 - 2, `${before + 3} → ${after}`)
  }

  // 4. contagem de inventário (cria o próprio inventário para não depender do seed)
  {
    const post = async (path, body, method = 'POST') => (await fetch(`${API}${path}`, { method, headers: { 'content-type': 'application/json', Authorization: `Bearer ${admin}` }, body: JSON.stringify(body) })).json()
    const me = await get(admin, '/auth/profile')
    const inv = await post('/inventory', { name: `E2E ${new Date().toISOString()}`, type: 'partial', startDate: new Date().toISOString(), responsibleId: me.id, productIds: [mouse.id] })
    await post(`/inventory/${inv.id}`, { status: 'in_progress' }, 'PATCH')
    const item = (await get(admin, `/inventory/${inv.id}`)).items[0]
    const p = await session(browser, 'supervisor@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/inventario/${inv.id}`, { waitUntil: 'networkidle' })
    await p.getByLabel('Quantidade contada').fill(String(item.expectedQuantity - 1))
    await p.getByRole('button', { name: 'Registrar' }).click()
    await p.waitForTimeout(1500)
    const after = (await get(admin, `/inventory/${inv.id}`)).items[0]
    check('contagem registrada com divergência', after.countedQuantity === item.expectedQuantity - 1 && after.discrepancy === -1, `esperado ${item.expectedQuantity}, contado ${after.countedQuantity}`)
    const refreshed = await get(admin, `/inventory/${inv.id}`)
    check('inventário reflete itens contados e divergência', refreshed.countedItems === 1 && refreshed.divergences === 1)
  }

  // 5. categoria: criar e excluir (admin)
  {
    const p = await session(browser, 'admin@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/categorias`, { waitUntil: 'networkidle' })
    await p.getByLabel('Nova categoria').click()
    await p.getByLabel('Nome da categoria').fill('Categoria Mobile QA')
    await p.getByRole('button', { name: 'Criar' }).click()
    await p.waitForTimeout(1200)
    const created = (await get(admin, '/categories')).find(c => c.name === 'Categoria Mobile QA')
    check('categoria criada pelo app', !!created)
    if (created) {
      await p.getByText('Categoria Mobile QA').first().click()
      await p.getByLabel('Excluir').first().click()
      await p.getByRole('button', { name: 'Excluir' }).last().click()
      await p.waitForTimeout(1200)
      const still = (await get(admin, '/categories')).some(c => c.id === created.id)
      check('categoria excluída pelo app', !still)
    }
  }

  // 6. permissões
  {
    const p = await session(browser, 'visualizador@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/movimentar`, { waitUntil: 'networkidle' })
    check('visualizador não vê "Nova entrada" em Movimentar', (await p.getByText('Nova entrada').count()) === 0 && (await p.getByText('Scanner').count()) > 0)
    await p.goto(`${APP}/usuarios`, { waitUntil: 'networkidle' })
    check('visualizador é bloqueado em Usuários', (await p.getByText('Você não tem permissão').count()) > 0)
    await p.goto(`${APP}/mais`, { waitUntil: 'networkidle' })
    check('menu Mais esconde Usuários/Auditoria para visualizador', (await p.getByText('Auditoria').count()) === 0)
  }

  // 7. logout limpa a sessão
  {
    const p = await session(browser, 'admin@stockiq.com')
    await p.waitForURL(u => !u.pathname.includes('login'), { timeout: 8000 })
    await p.goto(`${APP}/mais`, { waitUntil: 'networkidle' })
    await p.getByRole('button', { name: 'Sair da conta' }).click()
    await p.waitForTimeout(800)
    await p.goto(`${APP}/produtos`, { waitUntil: 'networkidle' })
    check('após sair, rotas protegidas voltam ao login', p.url().includes('/login'))
  }

  await browser.close()
  const failed = results.filter(r => !r).length
  console.log(`\n${results.length - failed}/${results.length} verificações ok`)
  process.exit(failed ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
