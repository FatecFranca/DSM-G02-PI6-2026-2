import swaggerJsdoc from 'swagger-jsdoc'

type Json = Record<string, unknown>

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const arrayOf = (name: string) => ({ type: 'array', items: ref(name) })
const nullableDate = { type: 'string', format: 'date-time', nullable: true }
const id = { type: 'string', example: 'cmq1x2y3z0001abcd' }
const date = { type: 'string', format: 'date-time' }
const str = (example?: string) => ({ type: 'string', ...(example ? { example } : {}) })
const int = (example?: number) => ({ type: 'integer', ...(example !== undefined ? { example } : {}) })
const num = (example?: number) => ({ type: 'number', ...(example !== undefined ? { example } : {}) })
const enumOf = (values: string[], example?: string) => ({ type: 'string', enum: values, example: example ?? values[0] })
const obj = (properties: Json, required?: string[]) => ({
  type: 'object',
  properties,
  ...(required ? { required } : {}),
})
const paginated = (name: string) =>
  obj({
    data: arrayOf(name),
    total: int(42),
    page: int(1),
    limit: int(20),
    totalPages: int(3),
  })

const ROLES = ['admin', 'supervisor', 'operator', 'viewer']
const idRef = { id, name: str('Nome') }

const schemas: Record<string, Json> = {
  Error: obj({ message: str('Descrição do erro') }, ['message']),
  ValidationError: obj(
    {
      message: str('Validation error'),
      errors: {
        type: 'array',
        items: obj({ field: str('email'), message: str('Invalid email') }),
      },
    },
    ['message'],
  ),
  Pagination: obj({ total: int(42), page: int(1), limit: int(20), totalPages: int(3) }),

  // ── Auth / Users ──────────────────────────────────────────────────────────
  User: obj({
    id,
    name: str('Carlos Silva'),
    email: { type: 'string', format: 'email', example: 'admin@stockiq.com' },
    role: enumOf(ROLES, 'admin'),
    department: str('TI'),
    status: enumOf(['active', 'inactive', 'pending'], 'active'),
    avatarUrl: { type: 'string', nullable: true },
    lastLogin: nullableDate,
    createdAt: date,
    updatedAt: date,
  }),
  LoginRequest: obj(
    {
      email: { type: 'string', format: 'email', example: 'admin@stockiq.com' },
      password: { type: 'string', minLength: 6, example: 'Senha@123' },
    },
    ['email', 'password'],
  ),
  RegisterRequest: obj(
    {
      name: str('Maria Souza'),
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      department: str('Logística'),
    },
    ['name', 'email', 'password', 'department'],
  ),
  AuthResult: obj({ user: ref('User'), token: str('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...') }),
  JwtPayload: obj({ user: obj({ sub: id, email: str('admin@stockiq.com'), role: enumOf(ROLES, 'admin'), iat: int(), exp: int() }) }),
  ChangePasswordRequest: obj(
    { currentPassword: { type: 'string', minLength: 6 }, newPassword: { type: 'string', minLength: 6 } },
    ['currentPassword', 'newPassword'],
  ),
  CreateUserRequest: obj(
    {
      name: str('Maria Souza'),
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role: { ...enumOf(ROLES, 'operator'), default: 'operator' },
      department: str('Logística'),
      avatarUrl: { type: 'string', format: 'uri' },
    },
    ['name', 'email', 'password', 'department'],
  ),
  UpdateUserRequest: obj({
    name: str(),
    email: { type: 'string', format: 'email' },
    role: enumOf(ROLES),
    department: str(),
    avatarUrl: { type: 'string', format: 'uri' },
  }),
  UpdateUserStatusRequest: obj({ status: enumOf(['active', 'inactive', 'pending']) }, ['status']),

  // ── Catalog ───────────────────────────────────────────────────────────────
  Category: obj({
    id,
    name: str('Eletrônicos'),
    slug: str('eletronicos'),
    color: str('#2563eb'),
    createdAt: date,
    updatedAt: date,
    _count: obj({ products: int(4) }),
  }),
  CategoryRequest: obj(
    {
      name: str('Eletrônicos'),
      slug: { type: 'string', pattern: '^[a-z0-9-]+$', example: 'eletronicos' },
      color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#2563eb' },
    },
    ['name', 'slug'],
  ),
  Brand: obj({
    id,
    name: str('Bosch'),
    slug: str('bosch'),
    logoUrl: { type: 'string', nullable: true },
    createdAt: date,
    updatedAt: date,
    _count: obj({ products: int(3) }),
  }),
  BrandRequest: obj(
    {
      name: str('Bosch'),
      slug: { type: 'string', pattern: '^[a-z0-9-]+$', example: 'bosch' },
      logoUrl: { type: 'string', format: 'uri' },
    },
    ['name', 'slug'],
  ),
  Supplier: obj({
    id,
    name: str('TechDistrib Comércio Ltda'),
    tradeName: str('TechDistrib'),
    cnpj: str('12.345.678/0001-90'),
    email: str('vendas@techdistrib.com.br'),
    phone: str('(11) 3456-7890'),
    contactName: str('Marcelo Andrade'),
    category: str('Eletrônicos'),
    status: enumOf(['active', 'inactive'], 'active'),
    city: str('São Paulo'),
    state: str('SP'),
    createdAt: date,
    updatedAt: date,
    _count: obj({ products: int(6) }),
  }),
  SupplierRequest: obj(
    {
      name: str('TechDistrib Comércio Ltda'),
      tradeName: str('TechDistrib'),
      cnpj: { type: 'string', pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$', example: '12.345.678/0001-90' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string', minLength: 10, example: '(11) 3456-7890' },
      contactName: str('Marcelo Andrade'),
      category: str('Eletrônicos'),
      status: { ...enumOf(['active', 'inactive'], 'active'), default: 'active' },
      city: str('São Paulo'),
      state: { type: 'string', minLength: 2, maxLength: 2, example: 'SP' },
    },
    ['name', 'tradeName', 'cnpj', 'email', 'phone', 'contactName', 'category', 'city', 'state'],
  ),
  Customer: obj({
    id,
    name: str('Construtora Horizonte Ltda'),
    tradeName: str('Construtora Horizonte'),
    cnpj: str('11.222.333/0001-44'),
    email: str('compras@horizonte.com.br'),
    phone: { type: 'string', nullable: true, example: '(16) 3711-2200' },
    contactName: { type: 'string', nullable: true, example: 'Ricardo Alves' },
    city: str('Franca'),
    state: str('SP'),
    status: enumOf(['active', 'inactive'], 'active'),
    createdAt: date,
    updatedAt: date,
  }),
  CustomerRequest: obj(
    {
      name: str('Construtora Horizonte Ltda'),
      tradeName: str('Construtora Horizonte'),
      cnpj: { type: 'string', pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$', example: '11.222.333/0001-44' },
      email: { type: 'string', format: 'email' },
      phone: str('(16) 3711-2200'),
      contactName: str('Ricardo Alves'),
      city: str('Franca'),
      state: { type: 'string', minLength: 2, maxLength: 2, example: 'SP' },
      status: enumOf(['active', 'inactive'], 'active'),
    },
    ['name', 'tradeName', 'cnpj', 'email', 'city', 'state'],
  ),
  Product: obj({
    id,
    name: str('Cabo HDMI 2.0 2m'),
    internalCode: str('EL-0042'),
    sku: str('CAB-HDMI-2M-BK'),
    barcode: str('7891234510000'),
    unit: str('UN'),
    weight: num(0.18),
    width: num(20),
    height: num(10),
    depth: num(5),
    description: { type: 'string', nullable: true },
    purchasePrice: num(22.5),
    salePrice: num(54.9),
    minStock: int(20),
    maxStock: int(200),
    currentStock: int(87),
    status: enumOf(['active', 'inactive', 'discontinued'], 'active'),
    stockStatus: enumOf(['ok', 'low', 'critical', 'out'], 'ok'),
    imageUrl: { type: 'string', nullable: true },
    categoryId: id,
    brandId: id,
    supplierId: id,
    category: obj(idRef),
    brand: obj(idRef),
    supplier: obj(idRef),
    createdAt: date,
    updatedAt: date,
  }),
  ProductRequest: obj(
    {
      name: str('Cabo HDMI 2.0 2m'),
      internalCode: str('EL-0042'),
      sku: str('CAB-HDMI-2M-BK'),
      barcode: str('7891234510000'),
      categoryId: id,
      brandId: id,
      supplierId: id,
      unit: str('UN'),
      weight: { type: 'number', minimum: 0, default: 0 },
      width: { type: 'number', minimum: 0, default: 0 },
      height: { type: 'number', minimum: 0, default: 0 },
      depth: { type: 'number', minimum: 0, default: 0 },
      description: str(),
      purchasePrice: { type: 'number', minimum: 0, example: 22.5 },
      salePrice: { type: 'number', minimum: 0, example: 54.9 },
      minStock: { type: 'integer', minimum: 0, default: 0 },
      maxStock: { type: 'integer', minimum: 0, default: 0 },
      status: { ...enumOf(['active', 'inactive', 'discontinued'], 'active'), default: 'active' },
      imageUrl: { type: 'string', format: 'uri' },
    },
    ['name', 'internalCode', 'sku', 'barcode', 'categoryId', 'brandId', 'supplierId', 'unit', 'purchasePrice', 'salePrice'],
  ),
  ProductScan: {
    allOf: [
      ref('Product'),
      obj({
        warehouseAddresses: {
          type: 'array',
          items: obj({ id, code: str('A-01-01-A-01'), quantity: int(87), lotNumber: { type: 'string', nullable: true } }),
        },
        lots: {
          type: 'array',
          items: obj({ id, lotNumber: str('LOT-001'), quantity: int(50), expirationDate: date, status: enumOf(['valid', 'expiring']) }),
        },
      }),
    ],
  },

  // ── Warehouse ─────────────────────────────────────────────────────────────
  WarehouseAddress: obj({
    id,
    code: str('A-01-01-A-01'),
    aisle: str('A'),
    street: str('01'),
    shelf: str('01'),
    level: str('A'),
    position: str('01'),
    status: enumOf(['free', 'occupied', 'blocked', 'reserved'], 'occupied'),
    capacity: num(800),
    occupied: num(120),
    lotNumber: { type: 'string', nullable: true },
    quantity: { type: 'integer', nullable: true },
    productId: { type: 'string', nullable: true },
    product: { ...obj({ id, name: str(), internalCode: str() }), nullable: true },
    createdAt: date,
    updatedAt: date,
  }),
  WarehouseAddressRequest: obj(
    {
      code: str('A-01-01-A-01'),
      aisle: str('A'),
      street: str('01'),
      shelf: str('01'),
      level: str('A'),
      position: str('01'),
      capacity: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 800 },
      status: { ...enumOf(['free', 'occupied', 'blocked', 'reserved'], 'free'), default: 'free' },
    },
    ['code', 'aisle', 'street', 'shelf', 'level', 'position', 'capacity'],
  ),
  WarehouseStats: obj({
    totalPositions: int(64),
    freePositions: int(30),
    occupiedPositions: int(27),
    blockedPositions: int(4),
    reservedPositions: int(3),
    occupancyRate: int(42),
  }),

  // ── Movements / Lots / Inventory ──────────────────────────────────────────
  Movement: obj({
    id,
    type: enumOf(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory'], 'entry'),
    quantity: int(50),
    unitCost: num(22.5),
    totalValue: num(1125),
    invoiceNumber: { type: 'string', nullable: true },
    lotNumber: { type: 'string', nullable: true },
    expirationDate: nullableDate,
    exitReason: { ...enumOf(['sale', 'transfer', 'loss', 'break', 'internal'], 'sale'), nullable: true },
    notes: { type: 'string', nullable: true },
    productId: id,
    supplierId: { type: 'string', nullable: true },
    customerId: { type: 'string', nullable: true },
    customerName: { type: 'string', nullable: true },
    fromAddressId: { type: 'string', nullable: true },
    toAddressId: { type: 'string', nullable: true },
    userId: id,
    createdAt: date,
    product: obj({ id, name: str(), internalCode: str() }),
    supplier: { ...obj(idRef), nullable: true },
    user: obj(idRef),
    fromAddress: { ...obj({ id, code: str() }), nullable: true },
    toAddress: { ...obj({ id, code: str() }), nullable: true },
  }),
  MovementRequest: {
    ...obj(
      {
        type: enumOf(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory'], 'entry'),
        productId: id,
        quantity: {
          type: 'integer',
          minimum: 0,
          example: 50,
          description:
            'Units moved. For `inventory` this is the counted stock (absolute); the difference is applied as an adjustment.',
        },
        adjustmentDirection: {
          ...enumOf(['increase', 'decrease']),
          description: 'Required (and only valid) for `adjustment`.',
        },
        manufacturingDate: { ...date, description: 'Needed together with expirationDate when an entry creates a new lot.' },
        unitCost: { type: 'number', minimum: 0, description: 'Defaults to the product purchase price.' },
        invoiceNumber: str('NF-2026-04521'),
        lotNumber: {
          type: 'string',
          description: 'On entries, creates the lot (needs supplierId + expirationDate) or increments an existing one.',
        },
        expirationDate: date,
        exitReason: enumOf(['sale', 'transfer', 'loss', 'break', 'internal']),
        notes: str(),
        supplierId: id,
        customerId: str(),
        customerName: str('Construtora Horizonte'),
        fromAddressId: { ...id, description: 'Required for transfers and, for products already stocked in the warehouse, for exits, losses, decreasing adjustments and counts.' },
        toAddressId: { ...id, description: 'Required for transfers and, for products already stocked in the warehouse, for entries and increasing adjustments.' },
      },
      ['type', 'productId', 'quantity'],
    ),
    description:
      'Stock effect: entry +qty · exit/loss −qty · adjustment ±qty (adjustmentDirection) · inventory sets stock to qty · transfer 0 (moves between addresses). Products tracked by lot also need lotNumber.',
  },
  Lot: obj({
    id,
    lotNumber: str('LOT-QM0091-001'),
    quantity: int(200),
    manufacturingDate: date,
    expirationDate: date,
    address: str('C-03-02-A-01'),
    status: {
      ...enumOf(['valid', 'expiring', 'expired', 'quarantine'], 'valid'),
      description: 'Derived from expirationDate (≤30 days = expiring) unless the lot is in quarantine.',
    },
    productId: id,
    supplierId: id,
    product: obj({ id, name: str(), internalCode: str() }),
    supplier: obj(idRef),
    createdAt: date,
    updatedAt: date,
  }),
  LotRequest: obj(
    {
      lotNumber: str('LOT-QM0091-001'),
      productId: id,
      supplierId: id,
      quantity: { type: 'integer', minimum: 1, example: 200 },
      manufacturingDate: date,
      expirationDate: date,
      addressId: id,
      address: { ...str('C-03-02-A-01'), description: 'Address code; alternative to addressId.' },
      status: { ...enumOf(['valid', 'expiring', 'expired', 'quarantine'], 'valid'), default: 'valid' },
    },
    ['lotNumber', 'productId', 'supplierId', 'quantity', 'manufacturingDate', 'expirationDate'],
  ),
  InventoryCount: obj({
    id,
    name: str('Inventário Geral — Junho/2026'),
    type: enumOf(['full', 'partial', 'cyclic'], 'full'),
    status: enumOf(['planned', 'in_progress', 'review', 'completed'], 'in_progress'),
    startDate: date,
    endDate: nullableDate,
    totalItems: int(26),
    countedItems: int(12),
    divergences: int(1),
    responsibleId: id,
    responsible: obj(idRef),
    createdAt: date,
    updatedAt: date,
  }),
  InventoryCountRequest: obj(
    {
      name: str('Cíclico EPI — Outubro/2026'),
      type: enumOf(['full', 'partial', 'cyclic'], 'cyclic'),
      startDate: date,
      responsibleId: id,
      productIds: {
        type: 'array',
        items: id,
        description: 'Required for partial and cyclic counts; full counts include every active product.',
      },
    },
    ['name', 'type', 'startDate', 'responsibleId'],
  ),
  InventoryCountUpdateRequest: obj({
    status: {
      ...enumOf(['planned', 'in_progress', 'review', 'completed']),
      description:
        'Allowed transitions: planned → in_progress → review → completed (review may return to in_progress). Review requires every item counted.',
    },
  }),
  InventoryCountItem: obj({
    id,
    expectedQuantity: int(24),
    countedQuantity: { type: 'integer', nullable: true, example: 23 },
    discrepancy: int(-1),
    countedAt: nullableDate,
    product: obj({ id, name: str(), internalCode: str(), unit: str('UN') }),
    countedBy: { ...obj(idRef), nullable: true },
  }),
  InventoryCountDetails: {
    allOf: [ref('InventoryCount'), obj({ items: arrayOf('InventoryCountItem') })],
  },
  CountInventoryItemRequest: obj({ countedQuantity: { type: 'integer', minimum: 0, example: 23 } }, ['countedQuantity']),

  // ── Alerts / Audit ────────────────────────────────────────────────────────
  Alert: obj({
    id: { type: 'string', example: 'stock-out-cmq1x2y3z0001abcd', description: 'Stable alert key used to mark as read.' },
    type: enumOf(['critical', 'warning', 'info'], 'critical'),
    category: enumOf(['stock', 'expiry'], 'stock'),
    title: str('Estoque zerado: Álcool 70% INPM 1L'),
    desc: str('O produto QM-0091 atingiu zero unidades em estoque.'),
    read: { type: 'boolean', example: false },
    createdAt: date,
  }),
  AlertsResponse: obj({ alerts: arrayOf('Alert'), total: int(9), unread: int(7) }),
  StockAlertGroup: obj({ count: int(2), items: arrayOf('Product') }),
  StockAlerts: obj({
    outOfStock: ref('StockAlertGroup'),
    critical: ref('StockAlertGroup'),
    low: ref('StockAlertGroup'),
    totalAlerts: int(6),
  }),
  MarkAllReadRequest: obj({ alertKeys: { type: 'array', items: str('stock-out-abc') } }, ['alertKeys']),
  MarkAllReadResult: obj({ marked: int(5) }),
  AuditLog: obj({
    id,
    action: enumOf(['CREATE', 'UPDATE', 'DELETE'], 'UPDATE'),
    entity: str('Product'),
    entityId: id,
    entityName: str('Cabo HDMI 2.0 2m'),
    oldValue: { type: 'object', nullable: true, additionalProperties: true },
    newValue: { type: 'object', nullable: true, additionalProperties: true },
    ip: str('192.168.1.10'),
    userId: id,
    user: obj({ id, name: str(), role: enumOf(ROLES) }),
    createdAt: date,
  }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  DashboardSummary: obj({
    products: obj({ total: int(26), active: int(25), lowStock: int(5), outStock: int(1) }),
    movements: obj({
      today: int(6),
      todayEntries: obj({ count: int(2), value: num(1350) }),
      todayExits: obj({ count: int(4), value: num(2800) }),
    }),
    users: obj({ active: int(6) }),
    lots: obj({ total: int(10), expiringSoon: int(3), validPercentage: int(60) }),
    inventory: obj({ pendingCounts: int(3), accuracy: { type: 'number', nullable: true, example: 99.2 } }),
    warehouse: obj({ total: int(64), free: int(30), occupied: int(27), blocked: int(4), occupancyRate: int(42) }),
    stock: obj({ totalPurchaseValue: num(182000.5), totalSaleValue: num(341000) }),
    recentMovements: arrayOf('Movement'),
  }),
  MovementTrendPoint: obj({ month: str('out. de 26'), entries: int(900), exits: int(850), balance: int(50) }),
  CategoryDistributionItem: obj({
    id,
    name: str('Eletrônicos'),
    color: str('#2563eb'),
    productCount: int(8),
    percentage: int(30),
    stockValue: num(52000),
  }),
  TopProduct: obj({
    product: obj({ id, name: str(), internalCode: str(), currentStock: int(), salePrice: num() }),
    movementCount: int(54),
    totalQuantity: int(980),
    totalValue: num(48000),
    trend: { type: 'integer', example: 12, description: '% change in movement count, last 30 days vs previous 30.' },
  }),
  HeatmapCell: obj({ day: { type: 'integer', minimum: 0, maximum: 6, example: 2 }, hour: int(14), value: int(7) }),
  AbcItem: obj({
    class: enumOf(['A', 'B', 'C']),
    product: obj({ id, name: str(), internalCode: str(), currentStock: int() }),
    totalValue: num(25000),
    accumulatedPercentage: num(41.3),
  }),
  AbcClassStat: obj({ count: int(5), percentage: int(20) }),
  AbcCurve: obj({
    A: arrayOf('AbcItem'),
    B: arrayOf('AbcItem'),
    C: arrayOf('AbcItem'),
    summary: obj({
      totalValue: num(480000),
      A: ref('AbcClassStat'),
      B: ref('AbcClassStat'),
      C: ref('AbcClassStat'),
    }),
  }),

  // ── Reports ───────────────────────────────────────────────────────────────
  MovementReport: obj({
    period: obj({ from: { type: 'string', nullable: true }, to: { type: 'string', nullable: true } }),
    totals: obj({ count: int(1273), quantity: int(40000), value: num(980000) }),
    byType: {
      type: 'array',
      items: obj({ type: enumOf(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory']), count: int(), quantity: int(), value: num() }),
    },
    topProducts: {
      type: 'array',
      items: obj({ product: obj({ id, name: str(), internalCode: str(), unit: str('UN') }), count: int(), quantity: int(), value: num() }),
    },
  }),
  StockReport: obj({
    summary: obj({
      total: int(25),
      out: int(1),
      critical: int(3),
      low: int(4),
      ok: int(17),
      totalStockValue: num(182000),
      totalSaleValue: num(341000),
    }),
    products: {
      type: 'array',
      items: {
        allOf: [ref('Product'), obj({ stockValue: num(), saleValue: num() })],
      },
    },
  }),
  LotExpirationReport: obj({
    windowDays: int(90),
    summary: obj({ expired: int(2), expiringSoon: int(3), valid: int(4), quarantine: int(1) }),
    expired: arrayOf('Lot'),
    expiringSoon: arrayOf('Lot'),
    quarantine: arrayOf('Lot'),
  }),
  WarehouseReport: obj({
    summary: obj({
      total: int(64),
      byStatus: { type: 'object', additionalProperties: int(), example: { free: 30, occupied: 27, blocked: 4, reserved: 3 } },
      totalCapacity: num(41600),
      totalOccupied: num(5200),
      occupancyRate: int(13),
    }),
    addresses: arrayOf('WarehouseAddress'),
  }),
  InventoryReport: obj({
    summary: obj({
      total: int(5),
      completed: int(2),
      in_progress: int(1),
      planned: int(1),
      totalDivergences: int(4),
      avgAccuracy: { type: 'number', nullable: true, example: 99.1 },
    }),
    counts: arrayOf('InventoryCount'),
  }),
  SupplierReport: obj({
    period: obj({ from: { type: 'string', nullable: true }, to: { type: 'string', nullable: true } }),
    summary: obj({ totalSuppliers: int(6), totalEntries: int(120), totalValue: num(540000) }),
    suppliers: {
      type: 'array',
      items: obj({
        supplier: obj({ id, name: str(), tradeName: str(), cnpj: str(), status: enumOf(['active', 'inactive']) }),
        entryCount: int(),
        totalQuantity: int(),
        totalValue: num(),
      }),
    },
  }),

  // ── Settings ──────────────────────────────────────────────────────────────
  Company: obj({
    legalName: str('StockIQ Sistemas de Gestão Ltda'),
    tradeName: str('StockIQ'),
    cnpj: str('12.345.678/0001-99'),
    email: str('contato@stockiq.com.br'),
    phone: str('(11) 3456-7890'),
    website: str('https://stockiq.com.br'),
    address: str('Av. Paulista, 1000'),
    zip: str('01310-100'),
    city: str('São Paulo'),
    state: str('SP'),
  }),
  Preferences: obj({
    expiryAlertDays: { type: 'integer', minimum: 1, maximum: 365, example: 30, description: 'Lots expiring within this window are flagged and alert.' },
  }),
  Settings: obj({ company: ref('Company'), preferences: ref('Preferences') }),
  UpdateSettingsRequest: obj({
    company: { ...ref('Company'), description: 'Partial update' },
    preferences: { ...ref('Preferences'), description: 'Partial update' },
  }),
  UpdateProfileRequest: obj({
    name: str('Maria Souza'),
    department: str('Logística'),
    avatarUrl: { type: 'string', format: 'uri' },
  }),
  ResetPasswordRequest: obj({ newPassword: { type: 'string', minLength: 6 } }, ['newPassword']),

  // ── Analytics ─────────────────────────────────────────────────────────────
  AnalyticsOverview: obj({
    window: obj({ historyMonths: int(6), forecastMonths: int(3) }),
    demand: {
      type: 'array',
      items: obj({ month: str('Out'), real: { type: 'integer', nullable: true, example: 420 }, forecast: int(440) }),
    },
    matrix: {
      type: 'array',
      items: obj({
        productId: id,
        product: str(),
        code: str(),
        abc: enumOf(['A', 'B', 'C']),
        xyz: enumOf(['X', 'Y', 'Z']),
        turnover: num(6.4),
        valueShare: num(12.5),
      }),
    },
    suggestions: {
      type: 'array',
      items: obj({
        productId: id,
        product: str(),
        code: str(),
        category: str(),
        currentStock: int(),
        daysOfCover: { type: 'integer', nullable: true },
        quantity: int(),
        urgency: enumOf(['Urgente', 'Alta', 'Média']),
        reason: str(),
        estimatedCost: num(),
      }),
    },
    insights: {
      type: 'array',
      items: obj({ type: enumOf(['warning', 'success', 'info']), title: str(), desc: str(), action: str(), href: str() }),
    },
  }),
}

const errorResponse = (description: string, schema = 'Error') => ({
  description,
  content: { 'application/json': { schema: ref(schema) } },
})

const responses: Record<string, Json> = {
  Unauthorized: errorResponse('Token ausente, inválido ou expirado'),
  Forbidden: errorResponse('Perfil sem permissão para esta operação'),
  NotFound: errorResponse('Registro não encontrado'),
  Conflict: errorResponse('Conflito (valor único já existente ou registro vinculado)'),
  ValidationError: errorResponse('Erro de validação do corpo/parâmetros', 'ValidationError'),
  TooManyRequests: errorResponse('Limite de requisições excedido'),
}

// ── Operation documentation table ───────────────────────────────────────────
// key: "METHOD /path" → success schema, request body schema and the roles allowed.
interface OpDoc {
  res?: string
  list?: string // array of schema
  page?: string // paginated list of schema
  body?: string
  roles?: string[]
  status?: number
  public?: boolean
  conflict?: boolean
  notFound?: boolean
}

const STAFF = ['admin', 'supervisor']
const WRITERS = ['admin', 'supervisor', 'operator']
const ADMIN = ['admin']

const crud = (base: string, schema: string, request: string, opts: { paged?: boolean; deleteConflict?: boolean } = {}) => ({
  [`GET ${base}`]: opts.paged ? { page: schema } : { list: schema },
  [`GET ${base}/{id}`]: { res: schema, notFound: true },
  [`POST ${base}`]: { res: schema, body: request, roles: STAFF, status: 201, conflict: true },
  [`PATCH ${base}/{id}`]: { res: schema, body: request, roles: STAFF, notFound: true, conflict: true, partial: true },
  [`DELETE ${base}/{id}`]: { roles: ADMIN, status: 204, notFound: true, conflict: !!opts.deleteConflict },
})

const OPS: Record<string, OpDoc & { partial?: boolean }> = {
  'POST /api/auth/register': { res: 'AuthResult', body: 'RegisterRequest', status: 201, public: true, conflict: true },
  'POST /api/auth/login': { res: 'AuthResult', body: 'LoginRequest', public: true },
  'GET /api/auth/me': { res: 'JwtPayload' },
  'GET /api/auth/profile': { res: 'User' },
  'PATCH /api/auth/password': { body: 'ChangePasswordRequest', status: 204 },

  'GET /api/users': { page: 'User' },
  'GET /api/users/{id}': { res: 'User', notFound: true },
  'POST /api/users': { res: 'User', body: 'CreateUserRequest', roles: STAFF, status: 201, conflict: true },
  'PATCH /api/users/{id}': { res: 'User', body: 'UpdateUserRequest', roles: STAFF, notFound: true },
  'PATCH /api/users/{id}/status': { res: 'User', body: 'UpdateUserStatusRequest', roles: ADMIN, notFound: true },
  'DELETE /api/users/{id}': { roles: ADMIN, status: 204, notFound: true },

  'GET /api/products/scan/{code}': { res: 'ProductScan', notFound: true },
  ...crud('/api/products', 'Product', 'ProductRequest', { paged: true }),
  ...crud('/api/categories', 'Category', 'CategoryRequest', { deleteConflict: true }),
  ...crud('/api/brands', 'Brand', 'BrandRequest', { deleteConflict: true }),
  ...crud('/api/suppliers', 'Supplier', 'SupplierRequest', { paged: true, deleteConflict: true }),
  ...crud('/api/customers', 'Customer', 'CustomerRequest', { paged: true }),

  'GET /api/warehouse/stats': { res: 'WarehouseStats' },
  ...crud('/api/warehouse', 'WarehouseAddress', 'WarehouseAddressRequest', { paged: true, deleteConflict: true }),

  'GET /api/movements': { page: 'Movement' },
  'GET /api/movements/{id}': { res: 'Movement', notFound: true },
  'POST /api/movements': { res: 'Movement', body: 'MovementRequest', roles: WRITERS, status: 201, notFound: true },

  'GET /api/lots': { page: 'Lot' },
  'GET /api/lots/alerts': { list: 'Lot' },
  'GET /api/lots/{id}': { res: 'Lot', notFound: true },
  'POST /api/lots': { res: 'Lot', body: 'LotRequest', roles: WRITERS, status: 201, conflict: true },
  'PATCH /api/lots/{id}': { res: 'Lot', body: 'LotRequest', roles: STAFF, notFound: true, partial: true },
  'DELETE /api/lots/{id}': { roles: ADMIN, status: 204, notFound: true },

  'GET /api/inventory': { page: 'InventoryCount' },
  'GET /api/inventory/{id}': { res: 'InventoryCountDetails', notFound: true },
  'POST /api/inventory/{id}/items/{itemId}/count': { res: 'InventoryCountItem', body: 'CountInventoryItemRequest', roles: WRITERS, status: 200, notFound: true, conflict: true },
  'POST /api/inventory': { res: 'InventoryCount', body: 'InventoryCountRequest', roles: STAFF, status: 201, notFound: true },
  'PATCH /api/inventory/{id}': { res: 'InventoryCount', body: 'InventoryCountUpdateRequest', roles: WRITERS, notFound: true, conflict: true },
  'DELETE /api/inventory/{id}': { roles: ADMIN, status: 204, notFound: true, conflict: true },

  'GET /api/dashboard': { res: 'DashboardSummary' },
  'GET /api/dashboard/movement-trend': { list: 'MovementTrendPoint' },
  'GET /api/dashboard/category-distribution': { list: 'CategoryDistributionItem' },
  'GET /api/dashboard/top-products': { list: 'TopProduct' },
  'GET /api/dashboard/heatmap': { list: 'HeatmapCell' },
  'GET /api/dashboard/abc': { res: 'AbcCurve' },

  'GET /api/alerts': { res: 'AlertsResponse' },
  'GET /api/alerts/stock': { res: 'StockAlerts' },
  'GET /api/alerts/expiring': { list: 'Lot' },
  'PATCH /api/alerts/read-all': { res: 'MarkAllReadResult', body: 'MarkAllReadRequest' },
  'PATCH /api/alerts/{id}/read': {},

  'GET /api/audit': { page: 'AuditLog', roles: STAFF },
  'GET /api/audit/{id}': { res: 'AuditLog', roles: STAFF, notFound: true },

  'GET /api/reports/movements': { res: 'MovementReport' },
  'GET /api/reports/stock': { res: 'StockReport' },
  'GET /api/reports/lots': { res: 'LotExpirationReport' },
  'GET /api/reports/warehouse': { res: 'WarehouseReport' },
  'GET /api/reports/abc': { res: 'AbcCurve' },
  'GET /api/reports/inventory': { res: 'InventoryReport' },
  'GET /api/reports/suppliers': { res: 'SupplierReport' },
  'GET /api/analytics': { res: 'AnalyticsOverview' },
  'GET /api/settings': { res: 'Settings' },
  'PUT /api/settings': { res: 'Settings', body: 'UpdateSettingsRequest', roles: ADMIN },
  'PATCH /api/auth/profile': { res: 'User', body: 'UpdateProfileRequest' },
  'PATCH /api/users/{id}/password': { body: 'ResetPasswordRequest', roles: ADMIN, status: 204, notFound: true },
}

const jsonContent = (schema: Json) => ({ 'application/json': { schema } })

/**
 * swagger-jsdoc only reads the hand-written JSDoc blocks; this step completes each
 * operation with response/request schemas, role requirements and the common error responses.
 */
function enrich(spec: Json): Json {
  const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, any>>>

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const doc = OPS[`${method.toUpperCase()} ${path}`] as (OpDoc & { partial?: boolean }) | undefined
      if (!doc) continue

      op.responses ??= {}
      const status = String(doc.status ?? (method === 'post' ? 201 : 200))

      if (status === '204') {
        op.responses['204'] = { description: op.responses['204']?.description ?? 'Sem conteúdo' }
      } else {
        const schema = doc.page
          ? ref(`Paginated${doc.page}`)
          : doc.list
            ? arrayOf(doc.list)
            : doc.res
              ? ref(doc.res)
              : null
        const existing = op.responses[status] ?? {}
        op.responses[status] = {
          description: existing.description ?? 'Sucesso',
          ...(schema ? { content: jsonContent(schema) } : {}),
        }
      }

      if (doc.body && !op.requestBody) {
        op.requestBody = { required: true, content: jsonContent(ref(doc.body)) }
      }
      if (doc.body && doc.partial) {
        op.requestBody.description = 'Todos os campos são opcionais na atualização parcial.'
      }

      if (doc.public) {
        op.security = []
      } else {
        op.responses['401'] = { $ref: '#/components/responses/Unauthorized' }
      }
      if (doc.roles) {
        op.responses['403'] = { $ref: '#/components/responses/Forbidden' }
        op.description = [op.description, `**Perfis permitidos:** ${doc.roles.join(', ')}.`].filter(Boolean).join('\n\n')
      }
      if (doc.body || (op.parameters ?? []).some((p: any) => p.in === 'query')) {
        op.responses['422'] = { $ref: '#/components/responses/ValidationError' }
      }
      if (doc.notFound) op.responses['404'] = { $ref: '#/components/responses/NotFound' }
      if (doc.conflict) op.responses['409'] = { $ref: '#/components/responses/Conflict' }
      if (doc.public) op.responses['429'] = { $ref: '#/components/responses/TooManyRequests' }
      if (op.responses['400'] && !op.responses['400'].content) {
        op.responses['400'] = { ...op.responses['400'], content: jsonContent(ref('Error')) }
      }
    }
  }

  // Paginated wrappers are generated for every schema used as `page`.
  const schemasOut = (spec.components as { schemas: Record<string, Json> }).schemas
  for (const doc of Object.values(OPS)) {
    if (doc.page && !schemasOut[`Paginated${doc.page}`]) schemasOut[`Paginated${doc.page}`] = paginated(doc.page)
  }

  return spec
}

const TAGS = [
  ['Auth', 'Login, cadastro e dados do usuário autenticado'],
  ['Users', 'Gestão de usuários e perfis de acesso'],
  ['Products', 'Cadastro de produtos e leitura por código de barras'],
  ['Categories', 'Categorias de produtos'],
  ['Brands', 'Marcas de produtos'],
  ['Suppliers', 'Fornecedores'],
  ['Customers', 'Clientes'],
  ['Warehouse', 'Endereçamento físico do armazém'],
  ['Movements', 'Movimentações de estoque (entrada, saída, transferência, perda, ajuste, inventário)'],
  ['Lots', 'Lotes e validade'],
  ['Inventory', 'Contagens de inventário'],
  ['Dashboard', 'Indicadores e gráficos do painel'],
  ['Alerts', 'Alertas de estoque e validade, com controle de leitura por usuário'],
  ['Audit', 'Trilha de auditoria (admin e supervisor)'],
  ['Reports', 'Relatórios gerenciais'],
  ['Analytics', 'Previsão de demanda, matriz ABC×XYZ e sugestões de compra'],
  ['Settings', 'Dados da empresa e preferências do sistema'],
].map(([name, description]) => ({ name, description }))

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StockIQ — WMS API',
      version: '1.0.0',
      description: [
        'API REST do StockIQ (WMS / ERP Lite).',
        '',
        '**Autenticação:** faça `POST /api/auth/login`, copie o `token` retornado e clique em **Authorize** (esquema `bearerAuth`).',
        '',
        '**Perfis:** `admin` > `supervisor` > `operator` > `viewer`. Cada operação lista os perfis permitidos.',
        '',
        '**Erros:** respostas de erro seguem `{ "message": string }`; validações retornam 422 com `errors[]`.',
      ].join('\n'),
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? 3001}`,
        description: 'Development server',
      },
    ],
    tags: TAGS,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: schemas as never,
      responses: responses as never,
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
}

export const swaggerSpec = enrich(swaggerJsdoc(options) as Json) as ReturnType<typeof swaggerJsdoc>
