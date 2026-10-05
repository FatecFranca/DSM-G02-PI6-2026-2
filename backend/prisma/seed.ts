import { PrismaClient, Prisma, MovementType, ExitReason } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Deterministic PRNG so every seed run produces the same dataset.
let seedState = 20260705
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const daysAgo = (d: number, hour = 9, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - d)
  date.setHours(hour, minute, 0, 0)
  return date
}
const daysFromNow = (d: number) => daysAgo(-d, 0)
const round2 = (n: number) => Math.round(n * 100) / 100

const PASSWORD = 'Senha@123'

const USERS = [
  { name: 'Carlos Silva', email: 'admin@stockiq.com', role: 'admin', department: 'TI' },
  { name: 'Ana Lima', email: 'supervisor@stockiq.com', role: 'supervisor', department: 'Logística' },
  { name: 'Rafael Costa', email: 'operador@stockiq.com', role: 'operator', department: 'Almoxarifado' },
  { name: 'Roberto Pereira', email: 'visualizador@stockiq.com', role: 'viewer', department: 'Financeiro' },
  { name: 'Juliana Martins', email: 'juliana.martins@stockiq.com', role: 'operator', department: 'Expedição' },
  { name: 'Marcos Oliveira', email: 'marcos.oliveira@stockiq.com', role: 'supervisor', department: 'Compras' },
  { name: 'Fernanda Souza', email: 'fernanda.souza@stockiq.com', role: 'operator', department: 'Compras', status: 'inactive' },
  { name: 'Paulo Nunes', email: 'paulo.nunes@stockiq.com', role: 'operator', department: 'Recebimento', status: 'pending' },
] as const

const CATEGORIES = [
  { name: 'Eletrônicos', slug: 'eletronicos', color: '#2563eb' },
  { name: 'Ferramentas', slug: 'ferramentas', color: '#7c3aed' },
  { name: 'Químicos', slug: 'quimicos', color: '#059669' },
  { name: 'Embalagens', slug: 'embalagens', color: '#d97706' },
  { name: 'EPI', slug: 'epi', color: '#dc2626' },
  { name: 'Material Elétrico', slug: 'material-eletrico', color: '#0891b2' },
  { name: 'Limpeza', slug: 'limpeza', color: '#6b7280' },
]

const BRANDS = ['Nexus Pro', 'SafeGuard', 'ChemPuro', 'AcerFix', 'Tramontina', 'Intelbras', '3M', 'Bosch', 'Suzano', 'Philips']

const SUPPLIERS = [
  { name: 'TechDistrib Comércio Ltda', tradeName: 'TechDistrib', cnpj: '12.345.678/0001-90', email: 'vendas@techdistrib.com.br', phone: '(11) 3456-7890', contactName: 'Marcelo Andrade', category: 'Eletrônicos', city: 'São Paulo', state: 'SP' },
  { name: 'EPI Brasil S.A.', tradeName: 'EPI Brasil', cnpj: '23.456.789/0001-01', email: 'comercial@epibrasil.com.br', phone: '(19) 3344-5566', contactName: 'Patrícia Gomes', category: 'EPI', city: 'Campinas', state: 'SP' },
  { name: 'QuimiNorte Distribuidora Ltda', tradeName: 'QuimiNorte', cnpj: '34.567.890/0001-12', email: 'pedidos@quiminorte.com.br', phone: '(41) 3222-1100', contactName: 'Eduardo Ramos', category: 'Químicos', city: 'Curitiba', state: 'PR' },
  { name: 'Metalfix Comércio de Ferragens Ltda', tradeName: 'Metalfix', cnpj: '45.678.901/0001-23', email: 'contato@metalfix.com.br', phone: '(31) 3777-8899', contactName: 'Sérgio Barbosa', category: 'Ferramentas', city: 'Belo Horizonte', state: 'MG' },
  { name: 'PowerCell Importadora Ltda', tradeName: 'PowerCell', cnpj: '56.789.012/0001-34', email: 'import@powercell.com.br', phone: '(47) 3399-4455', contactName: 'Luciana Prado', category: 'Eletrônicos', city: 'Joinville', state: 'SC' },
  { name: 'EmbalaPack Indústria de Embalagens S.A.', tradeName: 'EmbalaPack', cnpj: '67.890.123/0001-45', email: 'vendas@embalapack.com.br', phone: '(11) 4002-8922', contactName: 'Renato Figueira', category: 'Embalagens', city: 'Guarulhos', state: 'SP' },
  { name: 'SafeStock Comércio Ltda', tradeName: 'SafeStock', cnpj: '78.901.234/0001-56', email: 'safe@safestock.com.br', phone: '(51) 3123-4567', contactName: 'Helena Duarte', category: 'EPI', city: 'Porto Alegre', state: 'RS', status: 'inactive' },
]

const CUSTOMERS = [
  { name: 'Construtora Horizonte Ltda', tradeName: 'Construtora Horizonte', cnpj: '11.222.333/0001-44', email: 'compras@horizonte.com.br', phone: '(16) 3711-2200', contactName: 'Ricardo Alves', city: 'Franca', state: 'SP' },
  { name: 'Metalúrgica Rápida S.A.', tradeName: 'Metalúrgica Rápida', cnpj: '22.333.444/0001-55', email: 'suprimentos@metrapida.com.br', phone: '(16) 3722-3300', contactName: 'Tatiana Melo', city: 'Ribeirão Preto', state: 'SP' },
  { name: 'Hospital São Lucas', tradeName: 'Hospital São Lucas', cnpj: '33.444.555/0001-66', email: 'almoxarifado@saolucas.org.br', phone: '(16) 3733-4400', contactName: 'Dr. André Pires', city: 'Franca', state: 'SP' },
  { name: 'Indústria Calçadista Pé Firme Ltda', tradeName: 'Pé Firme', cnpj: '44.555.666/0001-77', email: 'compras@pefirme.com.br', phone: '(16) 3744-5500', contactName: 'Cláudia Ferraz', city: 'Franca', state: 'SP' },
  { name: 'Eletro Sul Instalações Ltda', tradeName: 'Eletro Sul', cnpj: '55.666.777/0001-88', email: 'contato@eletrosul.com.br', phone: '(48) 3255-6600', contactName: 'Bruno Teixeira', city: 'Florianópolis', state: 'SC' },
  { name: 'Prefeitura Municipal de Patrocínio Paulista', tradeName: 'Pref. Patrocínio Paulista', cnpj: '66.777.888/0001-99', email: 'licitacoes@patrocinio.sp.gov.br', phone: '(16) 3731-1000', contactName: 'Setor de Compras', city: 'Patrocínio Paulista', state: 'SP' },
  { name: 'Mercado Bom Preço Ltda', tradeName: 'Bom Preço', cnpj: '77.888.999/0001-00', email: 'gerencia@bompreco.com.br', phone: '(16) 3755-7700', contactName: 'Adriana Moura', city: 'Batatais', state: 'SP', status: 'inactive' },
]

type Plan = 'ok' | 'low' | 'critical' | 'out'
interface ProductSeed {
  name: string
  code: string
  sku: string
  category: string
  brand: string
  supplier: number
  unit: string
  buy: number
  sell: number
  weight: number
  plan: Plan
  /** Target volume: roughly how many units this product moves per year. */
  volume: number
  description: string
  status?: 'active' | 'inactive' | 'discontinued'
}

const PRODUCTS: ProductSeed[] = [
  { name: 'Cabo HDMI 2.0 2m', code: 'EL-0042', sku: 'CAB-HDMI-2M-BK', category: 'eletronicos', brand: 'Nexus Pro', supplier: 0, unit: 'UN', buy: 22.5, sell: 54.9, weight: 0.18, plan: 'ok', volume: 900, description: 'Cabo HDMI 2.0 ultra HD 4K, blindagem dupla, conectores dourados.' },
  { name: 'Bateria Li-Ion 18650 3.7V', code: 'EL-0098', sku: 'BAT-18650-37V', category: 'eletronicos', brand: 'Nexus Pro', supplier: 4, unit: 'UN', buy: 28, sell: 62, weight: 0.047, plan: 'ok', volume: 700, description: 'Bateria recarregável Li-Ion 18650 3.7V 2600mAh.' },
  { name: 'Carregador USB-C 20W', code: 'EL-0121', sku: 'CAR-USBC-20W', category: 'eletronicos', brand: 'Intelbras', supplier: 0, unit: 'UN', buy: 31, sell: 79.9, weight: 0.09, plan: 'low', volume: 360, description: 'Carregador de parede USB-C com Power Delivery 20W.' },
  { name: 'Mouse Óptico USB', code: 'EL-0133', sku: 'MOU-OPT-USB', category: 'eletronicos', brand: 'Intelbras', supplier: 0, unit: 'UN', buy: 14, sell: 39.9, weight: 0.1, plan: 'ok', volume: 300, description: 'Mouse óptico com fio, 1000 DPI.' },
  { name: 'Fita Isolante 19mm × 20m', code: 'EL-0077', sku: 'FIT-ISO-19-20', category: 'material-eletrico', brand: '3M', supplier: 0, unit: 'RL', buy: 3.5, sell: 8.9, weight: 0.08, plan: 'ok', volume: 1500, description: 'Fita isolante PVC antichama 19mm × 20m.' },
  { name: 'Cabo PP 2×2,5mm² (rolo 100m)', code: 'EL-0034', sku: 'CAB-PP-2X25', category: 'material-eletrico', brand: 'Intelbras', supplier: 0, unit: 'RL', buy: 280, sell: 459, weight: 9.2, plan: 'ok', volume: 80, description: 'Cabo PP flexível 2×2,5mm², rolo com 100 metros.' },
  { name: 'Lâmpada LED 9W E27', code: 'EL-0112', sku: 'LAM-LED-9W', category: 'material-eletrico', brand: 'Philips', supplier: 0, unit: 'UN', buy: 9.5, sell: 22.9, weight: 0.07, plan: 'critical', volume: 800, description: 'Lâmpada LED bulbo 9W, luz branca 6500K.' },
  { name: 'Disjuntor Bipolar 32A', code: 'EL-0150', sku: 'DIS-BIP-32A', category: 'material-eletrico', brand: 'Intelbras', supplier: 0, unit: 'UN', buy: 24, sell: 58, weight: 0.22, plan: 'ok', volume: 220, description: 'Disjuntor termomagnético bipolar curva C 32A.' },
  { name: 'Luva de Segurança CA 12345', code: 'EP-0018', sku: 'LUV-SEG-CA-M', category: 'epi', brand: 'SafeGuard', supplier: 1, unit: 'PAR', buy: 8.9, sell: 24.9, weight: 0.12, plan: 'critical', volume: 1200, description: 'Luva de segurança em couro, CA 12345.' },
  { name: 'Capacete Amarelo CA 31469', code: 'EP-0031', sku: 'CAP-AMA-CA', category: 'epi', brand: '3M', supplier: 1, unit: 'UN', buy: 52, sell: 119, weight: 0.4, plan: 'ok', volume: 260, description: 'Capacete de segurança classe B com carneira de 4 pontos.' },
  { name: 'Óculos de Proteção Incolor CA 40112', code: 'EP-0052', sku: 'OCU-PRO-INC', category: 'epi', brand: '3M', supplier: 1, unit: 'UN', buy: 6.8, sell: 18.9, weight: 0.05, plan: 'ok', volume: 640, description: 'Óculos de proteção antirrisco e antiembaçante.' },
  { name: 'Protetor Auricular Plug', code: 'EP-0066', sku: 'PRO-AUR-PLUG', category: 'epi', brand: '3M', supplier: 1, unit: 'PAR', buy: 1.8, sell: 5.5, weight: 0.01, plan: 'low', volume: 2000, description: 'Protetor auricular de silicone com cordão, 17dB.' },
  { name: 'Extintor PQS 4kg ABC', code: 'SE-0012', sku: 'EXT-PQS-4KG', category: 'epi', brand: 'SafeGuard', supplier: 6, unit: 'UN', buy: 118, sell: 229, weight: 6.5, plan: 'critical', volume: 70, description: 'Extintor de pó químico seco 4kg classe ABC.' },
  { name: 'Álcool 70% INPM 1L', code: 'QM-0091', sku: 'ALC-70-1L', category: 'quimicos', brand: 'ChemPuro', supplier: 2, unit: 'UN', buy: 12, sell: 28.5, weight: 0.95, plan: 'out', volume: 1400, description: 'Álcool etílico 70% INPM, frasco de 1 litro.' },
  { name: 'Detergente Industrial 5L', code: 'QM-0104', sku: 'DET-IND-5L', category: 'limpeza', brand: 'ChemPuro', supplier: 2, unit: 'GL', buy: 21, sell: 46, weight: 5.1, plan: 'ok', volume: 380, description: 'Detergente neutro concentrado para uso industrial.' },
  { name: 'Desinfetante Hospitalar 5L', code: 'QM-0118', sku: 'DES-HOS-5L', category: 'limpeza', brand: 'ChemPuro', supplier: 2, unit: 'GL', buy: 34, sell: 72, weight: 5.2, plan: 'low', volume: 240, description: 'Desinfetante hospitalar de amplo espectro.' },
  { name: 'Parafuso Sextavado M8×50 ZB', code: 'FE-0203', sku: 'PAR-M8-50-ZB', category: 'ferramentas', brand: 'AcerFix', supplier: 3, unit: 'CX', buy: 18, sell: 39.9, weight: 2.5, plan: 'ok', volume: 520, description: 'Caixa com 100 parafusos sextavados M8×50 zincados.' },
  { name: 'Chave de Fenda Phillips 1/4"', code: 'FE-0215', sku: 'CHA-PHI-14', category: 'ferramentas', brand: 'Tramontina', supplier: 3, unit: 'UN', buy: 11, sell: 27.9, weight: 0.18, plan: 'ok', volume: 210, description: 'Chave Phillips cabo isolado 1/4" × 6".' },
  { name: 'Furadeira de Impacto 650W', code: 'FE-0230', sku: 'FUR-IMP-650', category: 'ferramentas', brand: 'Bosch', supplier: 3, unit: 'UN', buy: 189, sell: 349, weight: 1.9, plan: 'ok', volume: 60, description: 'Furadeira de impacto 650W com mandril 13mm.' },
  { name: 'Alicate Universal 8"', code: 'FE-0244', sku: 'ALI-UNI-8', category: 'ferramentas', brand: 'Tramontina', supplier: 3, unit: 'UN', buy: 19, sell: 44.9, weight: 0.35, plan: 'low', volume: 150, description: 'Alicate universal isolado 1000V, 8 polegadas.' },
  { name: 'Caixa de Papelão 40×30×30', code: 'EM-0055', sku: 'CX-PAP-403030', category: 'embalagens', brand: 'Suzano', supplier: 5, unit: 'UN', buy: 2.9, sell: 6.5, weight: 0.4, plan: 'ok', volume: 3000, description: 'Caixa de papelão ondulado parede simples 40×30×30cm.' },
  { name: 'Fita Adesiva Transparente 48mm', code: 'EM-0062', sku: 'FIT-ADE-48', category: 'embalagens', brand: '3M', supplier: 5, unit: 'RL', buy: 3.2, sell: 7.9, weight: 0.2, plan: 'ok', volume: 1800, description: 'Fita de embalagem BOPP transparente 48mm × 100m.' },
  { name: 'Filme Stretch 500mm', code: 'EM-0071', sku: 'FIL-STR-500', category: 'embalagens', brand: 'Suzano', supplier: 5, unit: 'RL', buy: 24, sell: 49.9, weight: 2.1, plan: 'critical', volume: 420, description: 'Filme stretch manual 500mm, 2kg.' },
  { name: 'Plástico Bolha 1,20m × 100m', code: 'EM-0080', sku: 'PLA-BOL-120', category: 'embalagens', brand: 'Suzano', supplier: 5, unit: 'RL', buy: 58, sell: 119, weight: 3.8, plan: 'ok', volume: 90, description: 'Rolo de plástico bolha 1,20m × 100m.' },
  { name: 'Máscara PFF2 sem Válvula', code: 'EP-0090', sku: 'MAS-PFF2', category: 'epi', brand: '3M', supplier: 1, unit: 'UN', buy: 2.4, sell: 6.9, weight: 0.02, plan: 'ok', volume: 2500, description: 'Respirador descartável PFF2 (N95), CA 38.964.' },
  { name: 'Calculadora de Bolso (descontinuada)', code: 'EL-0999', sku: 'CAL-BOL-OLD', category: 'eletronicos', brand: 'Intelbras', supplier: 0, unit: 'UN', buy: 8, sell: 19.9, weight: 0.1, plan: 'ok', volume: 12, description: 'Linha descontinuada pelo fabricante.', status: 'discontinued' },
]

async function resetDatabase() {
  await prisma.setting.deleteMany()
  await prisma.inventoryCountItem.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.inventoryCount.deleteMany()
  await prisma.movement.deleteMany()
  await prisma.lot.deleteMany()
  await prisma.warehouseAddress.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.brand.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

async function main() {
  console.log('Resetting and seeding database…')
  await resetDatabase()

  // ── Users ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  const users = []
  for (const [i, u] of USERS.entries()) {
    users.push(
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: passwordHash,
          role: u.role,
          department: u.department,
          status: 'status' in u ? u.status : 'active',
          lastLogin: 'status' in u ? daysAgo(40) : daysAgo(0, 8 + i, 15),
          createdAt: daysAgo(400 - i * 20),
        },
      }),
    )
  }
  const [admin, supervisor, operator, , juliana, marcos] = users
  const activeOperators = [operator, juliana, supervisor, marcos]

  // ── Settings ────────────────────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      {
        key: 'company',
        value: {
          legalName: 'StockIQ Sistemas de Gestão Ltda', tradeName: 'StockIQ', cnpj: '12.345.678/0001-99',
          email: 'contato@stockiq.com.br', phone: '(16) 3711-0000', website: 'https://stockiq.com.br',
          address: 'Av. Major Nicácio, 2500', zip: '14400-000', city: 'Franca', state: 'SP',
        },
      },
      { key: 'preferences', value: { expiryAlertDays: 30 } },
    ],
  })

  // ── Catalog ─────────────────────────────────────────────────────────────
  const categories = new Map<string, string>()
  for (const c of CATEGORIES) categories.set(c.slug, (await prisma.category.create({ data: c })).id)

  const brands = new Map<string, string>()
  for (const name of BRANDS) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    brands.set(name, (await prisma.brand.create({ data: { name, slug } })).id)
  }

  const suppliers = []
  for (const s of SUPPLIERS) suppliers.push(await prisma.supplier.create({ data: { ...s, status: ('status' in s ? s.status : 'active') as 'active' | 'inactive' } }))

  const customers = []
  for (const c of CUSTOMERS) customers.push(await prisma.customer.create({ data: { ...c, status: ('status' in c ? c.status : 'active') as 'active' | 'inactive' } }))

  // ── Warehouse addresses (4 aisles × 2 streets × 4 shelves × 2 levels = 64) ──
  const addresses = []
  for (const aisle of ['A', 'B', 'C', 'D']) {
    for (const street of ['01', '02']) {
      for (const shelf of ['01', '02', '03', '04']) {
        for (const level of ['A', 'B']) {
          const position = '01'
          addresses.push(
            await prisma.warehouseAddress.create({
              data: {
                code: `${aisle}-${street}-${shelf}-${level}-${position}`,
                aisle,
                street,
                shelf,
                level,
                position,
                capacity: level === 'A' ? 800 : 500,
              },
            }),
          )
        }
      }
    }
  }

  // ── Products + movement history ─────────────────────────────────────────
  interface MovementRow {
    type: MovementType
    quantity: number
    unitCost: number
    totalValue: number
    productId: string
    userId: string
    createdAt: Date
    supplierId?: string
    customerId?: string
    customerName?: string
    invoiceNumber?: string
    lotNumber?: string
    exitReason?: ExitReason
    notes?: string
  }
  const movements: MovementRow[] = []
  const createdProducts: { id: string; seed: ProductSeed; stock: number; supplierId: string }[] = []
  let invoiceCounter = 4400

  for (const p of PRODUCTS) {
    const supplier = suppliers[p.supplier]
    const sellable = (p.status ?? 'active') === 'active'

    // Build a chronological history of entries/exits spanning the last ~12 months.
    const events: { day: number; type: 'entry' | 'exit' | 'loss' | 'adjustment'; qty: number }[] = []
    const entryCount = sellable ? randInt(5, 9) : 2
    const perEntry = Math.max(2, Math.round(p.volume / entryCount))
    for (let i = 0; i < entryCount; i++) {
      const day = Math.round(355 - (i * 330) / entryCount + randInt(-6, 6))
      events.push({ day: Math.max(2, day), type: 'entry', qty: Math.max(1, Math.round(perEntry * (0.7 + rand() * 0.6))) })
    }
    const exitCount = sellable ? randInt(30, 55) : 4
    for (let i = 0; i < exitCount; i++) {
      // Slightly more demand in recent months (growth trend for the forecast).
      const day = Math.floor(Math.pow(rand(), 1.25) * 340) + 1
      const qty = Math.max(1, Math.round((p.volume / exitCount) * (0.4 + rand() * 1.2)))
      events.push({ day, type: rand() < 0.04 ? 'loss' : 'exit', qty: rand() < 0.04 ? Math.max(1, Math.round(qty / 10)) : qty })
    }
    events.sort((a, b) => b.day - a.day) // oldest first

    let balance = 0
    const rows: MovementRow[] = []
    const productId = `pending-${p.code}`
    for (const e of events) {
      const quantity = e.qty
      if (e.type !== 'entry' && balance < quantity) continue // never go negative
      balance += e.type === 'entry' ? quantity : -quantity
      const hour = pick([8, 9, 10, 11, 13, 14, 15, 16, 17])
      const createdAt = daysAgo(e.day, hour, randInt(0, 59))
      const user = pick(activeOperators)
      if (e.type === 'entry') {
        invoiceCounter++
        const unitCost = round2(p.buy * (0.95 + rand() * 0.1))
        rows.push({
          type: 'entry', quantity, unitCost, totalValue: round2(quantity * unitCost), productId, userId: user.id, createdAt,
          supplierId: supplier.id, invoiceNumber: `NF-${createdAt.getFullYear()}-${String(invoiceCounter).padStart(5, '0')}`,
        })
      } else if (e.type === 'loss') {
        rows.push({
          type: 'loss', quantity, unitCost: p.buy, totalValue: round2(quantity * p.buy), productId, userId: user.id, createdAt,
          exitReason: 'loss', notes: pick(['Quebra durante movimentação', 'Avaria no transporte', 'Item danificado na prateleira']),
        })
      } else {
        const customer = pick(customers.filter((c) => c.status === 'active'))
        const reason = pick<ExitReason>(['sale', 'sale', 'sale', 'internal', 'break'])
        rows.push({
          type: 'exit', quantity, unitCost: p.sell, totalValue: round2(quantity * p.sell), productId, userId: user.id, createdAt,
          exitReason: reason, customerId: reason === 'sale' ? customer.id : undefined,
          customerName: reason === 'sale' ? customer.tradeName : undefined,
          notes: reason === 'internal' ? 'Consumo interno' : undefined,
        })
      }
    }

    // Steer the final balance into the planned stock status (min stock is derived from it).
    let minStock: number
    let maxStock: number
    if (p.plan === 'out' && balance > 0) {
      rows.push({
        type: 'exit', quantity: balance, unitCost: p.sell, totalValue: round2(balance * p.sell), productId,
        userId: operator.id, createdAt: daysAgo(1, 10, 30), exitReason: 'sale',
        customerId: customers[0].id, customerName: customers[0].tradeName,
      })
      balance = 0
    }
    if (balance === 0 && p.plan !== 'out') {
      const qty = Math.max(20, Math.round(p.volume / 8))
      rows.push({ type: 'entry', quantity: qty, unitCost: p.buy, totalValue: round2(qty * p.buy), productId, userId: operator.id, createdAt: daysAgo(3, 9, 10), supplierId: supplier.id, invoiceNumber: `NF-${new Date().getFullYear()}-${String(++invoiceCounter).padStart(5, '0')}` })
      balance = qty
    }
    switch (p.plan) {
      case 'ok': minStock = Math.max(1, Math.round(balance * 0.35)); break
      case 'low': minStock = Math.max(2, Math.round(balance * 1.4)); break
      case 'critical': minStock = Math.max(4, Math.round(balance * 3)); break
      default: minStock = Math.max(20, Math.round(p.volume / 10)); break
    }
    maxStock = Math.max(minStock * 4, balance * 2)

    const product = await prisma.product.create({
      data: {
        name: p.name,
        internalCode: p.code,
        sku: p.sku,
        barcode: `78912345${String(createdProducts.length + 10000).padStart(5, '0')}`,
        unit: p.unit,
        weight: p.weight,
        width: randInt(2, 40),
        height: randInt(2, 40),
        depth: randInt(2, 40),
        description: p.description,
        purchasePrice: p.buy,
        salePrice: p.sell,
        minStock,
        maxStock,
        currentStock: balance,
        status: p.status ?? 'active',
        categoryId: categories.get(p.category)!,
        brandId: brands.get(p.brand)!,
        supplierId: supplier.id,
        createdAt: daysAgo(380),
      },
    })
    for (const r of rows) movements.push({ ...r, productId: product.id })
    createdProducts.push({ id: product.id, seed: p, stock: balance, supplierId: supplier.id })
  }

  // A few transfers and adjustments for variety (don't change total stock for transfers).
  const sampleProducts = createdProducts.filter((p) => p.stock > 5).slice(0, 8)
  for (const [i, p] of sampleProducts.entries()) {
    movements.push({
      type: 'transfer', quantity: Math.min(p.stock, randInt(5, 40)), unitCost: p.seed.buy,
      totalValue: 0, productId: p.id, userId: pick(activeOperators).id, createdAt: daysAgo(randInt(1, 25), 14, i * 7),
      notes: 'Reorganização de endereços',
    })
  }

  // Inventory adjustments (negative = divergence found in the count).
  const adjusted = createdProducts.filter((p) => p.stock > 10 && p.seed.plan === 'ok').slice(0, 3)
  for (const p of adjusted) {
    const qty = -randInt(1, 4)
    movements.push({
      type: 'adjustment', quantity: qty, unitCost: p.seed.buy, totalValue: round2(qty * p.seed.buy),
      productId: p.id, userId: supervisor.id, createdAt: daysAgo(randInt(3, 20), 16, 0), notes: 'Divergência apurada no inventário',
    })
    p.stock += qty
    await prisma.product.update({ where: { id: p.id }, data: { currentStock: p.stock } })
  }

  // Movements today so the dashboard "today" widgets have data.
  const todayProducts = createdProducts.filter((p) => p.seed.plan === 'ok' && p.stock > 30).slice(0, 6)
  for (const [i, p] of todayProducts.entries()) {
    const isEntry = i % 3 === 0
    const qty = randInt(5, 25)
    const createdAt = new Date()
    createdAt.setHours(Math.max(0, createdAt.getHours() - (i + 1)), randInt(0, 59), 0, 0)
    movements.push(
      isEntry
        ? { type: 'entry', quantity: qty, unitCost: p.seed.buy, totalValue: round2(qty * p.seed.buy), productId: p.id, userId: pick(activeOperators).id, createdAt, supplierId: p.supplierId, invoiceNumber: `NF-${createdAt.getFullYear()}-${String(++invoiceCounter).padStart(5, '0')}` }
        : { type: 'exit', quantity: qty, unitCost: p.seed.sell, totalValue: round2(qty * p.seed.sell), productId: p.id, userId: pick(activeOperators).id, createdAt, exitReason: 'sale', customerId: customers[i % 4].id, customerName: customers[i % 4].tradeName },
    )
    p.stock += isEntry ? qty : -qty
    await prisma.product.update({ where: { id: p.id }, data: { currentStock: p.stock } })
  }

  await prisma.movement.createMany({ data: movements as Prisma.MovementCreateManyInput[] })

  // ── Warehouse positions: place products into addresses ──────────────────
  const placeable = createdProducts.filter((p) => p.stock > 0)
  const addressByProduct = new Map<string, string>()
  for (const [i, p] of placeable.entries()) {
    const address = addresses[i * 2]
    if (!address) break
    addressByProduct.set(p.id, address.code)
    const quantity = Math.min(p.stock, address.capacity)
    await prisma.warehouseAddress.update({
      where: { id: address.id },
      data: { status: 'occupied', productId: p.id, quantity, occupied: quantity, lotNumber: null },
    })
  }
  const spare = addresses.slice(placeable.length * 2 + 1)
  for (const a of spare.slice(0, 4)) await prisma.warehouseAddress.update({ where: { id: a.id }, data: { status: 'blocked' } })
  for (const a of spare.slice(4, 7)) await prisma.warehouseAddress.update({ where: { id: a.id }, data: { status: 'reserved' } })

  // ── Lots: one lot per tracked product, sitting at the product's address ──
  // The movement rules treat any product with stocked lots as lot-tracked, so each
  // lot holds the product's full stock and its address carries the lot number.
  const addressByCode = new Map(addresses.map((a) => [a.code, a.id]))
  const lotPlans: { code: string; mfg: number; exp: number; status: 'valid' | 'expiring' | 'expired' | 'quarantine' }[] = [
    { code: 'QM-0104', mfg: 120, exp: 250, status: 'valid' },
    { code: 'QM-0118', mfg: 200, exp: 18, status: 'expiring' },
    { code: 'SE-0012', mfg: 700, exp: -30, status: 'expired' },
    { code: 'EP-0018', mfg: 365, exp: 9, status: 'expiring' },
    { code: 'EP-0052', mfg: 90, exp: 640, status: 'valid' },
    { code: 'EP-0090', mfg: 60, exp: 25, status: 'expiring' },
    { code: 'EM-0071', mfg: 400, exp: -12, status: 'expired' },
    { code: 'FE-0244', mfg: 30, exp: 330, status: 'quarantine' },
    { code: 'EL-0098', mfg: 150, exp: 900, status: 'valid' },
  ]
  let lotCounter = 0
  for (const l of lotPlans) {
    const prod = createdProducts.find((p) => p.seed.code === l.code)!
    const addressCode = addressByProduct.get(prod.id)
    if (!addressCode || prod.stock <= 0) continue
    const lotNumber = `LOT-${l.code.replace('-', '')}-${String(++lotCounter).padStart(3, '0')}`
    await prisma.lot.create({
      data: {
        lotNumber,
        quantity: prod.stock,
        manufacturingDate: daysAgo(l.mfg),
        expirationDate: l.exp >= 0 ? daysFromNow(l.exp) : daysAgo(-l.exp),
        address: addressCode,
        addressId: addressByCode.get(addressCode),
        status: l.status,
        productId: prod.id,
        supplierId: prod.supplierId,
      },
    })
    await prisma.warehouseAddress.update({ where: { code: addressCode }, data: { lotNumber } })
  }

  // ── Inventory counts (with per-product items, as the API creates them) ────
  const activeProducts = createdProducts.filter((p) => (p.seed.status ?? 'active') === 'active')
  const byCategory = (slug: string) => activeProducts.filter((p) => p.seed.category === slug)
  const countPlans: {
    name: string; type: 'full' | 'partial' | 'cyclic'; status: 'planned' | 'in_progress' | 'review' | 'completed'
    start: Date; end?: Date; responsible: string; products: typeof activeProducts; counted: number; divergentIdx: number[]; createdAt: Date
  }[] = [
    { name: 'Inventário Geral — Março/2026', type: 'full', status: 'completed', start: daysAgo(190), end: daysAgo(187), responsible: admin.id, products: activeProducts, counted: activeProducts.length, divergentIdx: [], createdAt: daysAgo(195) },
    { name: 'Inventário Geral — Junho/2026', type: 'full', status: 'completed', start: daysAgo(100), end: daysAgo(97), responsible: supervisor.id, products: activeProducts, counted: activeProducts.length, divergentIdx: [3], createdAt: daysAgo(105) },
    { name: 'Cíclico EPI — Setembro/2026', type: 'cyclic', status: 'review', start: daysAgo(12), responsible: marcos.id, products: byCategory('epi'), counted: byCategory('epi').length, divergentIdx: [1], createdAt: daysAgo(14) },
    { name: 'Cíclico Químicos — Outubro/2026', type: 'cyclic', status: 'in_progress', start: daysAgo(2), responsible: supervisor.id, products: [...byCategory('quimicos'), ...byCategory('limpeza')], counted: 2, divergentIdx: [], createdAt: daysAgo(3) },
    { name: 'Parcial Eletrônicos — Q4/2026', type: 'partial', status: 'planned', start: daysFromNow(9), responsible: juliana.id, products: byCategory('eletronicos'), counted: 0, divergentIdx: [], createdAt: daysAgo(1) },
  ]
  for (const plan of countPlans) {
    const divergent = plan.divergentIdx.filter((i) => i < plan.counted).length
    const count = await prisma.inventoryCount.create({
      data: {
        name: plan.name, type: plan.type, status: plan.status, startDate: plan.start, endDate: plan.end,
        totalItems: plan.products.length, countedItems: plan.counted, divergences: divergent,
        responsibleId: plan.responsible, createdAt: plan.createdAt,
      },
    })
    await prisma.inventoryCountItem.createMany({
      data: plan.products.map((p, i) => {
        const isCounted = i < plan.counted
        const discrepancy = isCounted && plan.divergentIdx.includes(i) ? -1 : 0
        return {
          inventoryCountId: count.id, productId: p.id, expectedQuantity: p.stock,
          countedQuantity: isCounted ? p.stock + discrepancy : null, discrepancy,
          countedAt: isCounted ? plan.start : null, countedById: isCounted ? plan.responsible : null,
        }
      }),
    })
  }

  // ── Audit trail ─────────────────────────────────────────────────────────
  const ips = ['192.168.1.10', '192.168.1.22', '192.168.1.45', '10.0.0.8']
  const cat = (slug: string) => CATEGORIES.find((c) => c.slug === slug)!
  const audits: Prisma.AuditLogCreateManyInput[] = [
    { action: 'CREATE', entity: 'User', entityId: users[6].id, entityName: users[6].name, newValue: { role: 'operator', department: 'Compras' }, userId: admin.id, ip: ips[0], createdAt: daysAgo(210) },
    { action: 'UPDATE', entity: 'User', entityId: users[6].id, entityName: users[6].name, oldValue: { status: 'active' }, newValue: { status: 'inactive' }, userId: admin.id, ip: ips[0], createdAt: daysAgo(45) },
    { action: 'CREATE', entity: 'Category', entityId: 'seed', entityName: cat('limpeza').name, newValue: { name: 'Limpeza', color: cat('limpeza').color }, userId: supervisor.id, ip: ips[1], createdAt: daysAgo(150) },
    { action: 'DELETE', entity: 'Category', entityId: 'seed-deleted', entityName: 'Importados', oldValue: { name: 'Importados', color: '#64748b' }, userId: admin.id, ip: ips[0], createdAt: daysAgo(120) },
    { action: 'UPDATE', entity: 'Supplier', entityId: 'seed', entityName: 'SafeStock Comércio Ltda', oldValue: { status: 'active' }, newValue: { status: 'inactive' }, userId: admin.id, ip: ips[0], createdAt: daysAgo(60) },
    ...createdProducts.slice(0, 8).map((p, i) => ({
      action: i % 3 === 0 ? 'CREATE' : 'UPDATE', entity: 'Product', entityId: p.id, entityName: p.seed.name,
      oldValue: i % 3 === 0 ? undefined : { salePrice: round2(p.seed.sell * 0.92) },
      newValue: i % 3 === 0 ? { name: p.seed.name, salePrice: p.seed.sell } : { salePrice: p.seed.sell },
      userId: pick([admin, supervisor, marcos]).id, ip: pick(ips), createdAt: daysAgo(randInt(2, 90), randInt(8, 17), randInt(0, 59)),
    })) as Prisma.AuditLogCreateManyInput[],
    { action: 'UPDATE', entity: 'Lot', entityId: 'seed', entityName: 'LOT-QM0104-009', oldValue: { status: 'valid' }, newValue: { status: 'quarantine' }, userId: supervisor.id, ip: ips[1], createdAt: daysAgo(6) },
    { action: 'CREATE', entity: 'Inventory', entityId: 'seed', entityName: 'Parcial Eletrônicos — Q4/2026', newValue: { type: 'partial', status: 'planned' }, userId: supervisor.id, ip: ips[1], createdAt: daysAgo(1) },
  ]
  await prisma.auditLog.createMany({ data: audits })

  console.log(`✔ ${users.length} users, ${createdProducts.length} products, ${movements.length} movements, ${addresses.length} addresses, ${lotPlans.length} lots`)
  console.log('\nLogins (senha para todos: ' + PASSWORD + '):')
  for (const u of USERS) {
    const status = 'status' in u ? ` [${u.status} — não consegue logar]` : ''
    console.log(`  ${u.role.padEnd(10)} ${u.email}${status}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
