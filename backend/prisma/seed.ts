import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wms.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@wms.com',
      password: adminPassword,
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const cat = await prisma.category.upsert({
    where: { slug: 'eletronicos' },
    update: {},
    create: { name: 'Eletrônicos', slug: 'eletronicos', color: '#6366f1' },
  })

  const brand = await prisma.brand.upsert({
    where: { slug: 'samsung' },
    update: {},
    create: { name: 'Samsung', slug: 'samsung' },
  })

  const supplier = await prisma.supplier.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Fornecedor Padrão',
      tradeName: 'FP Ltda',
      cnpj: '00.000.000/0001-00',
      email: 'fornecedor@example.com',
      phone: '11999999999',
      contactName: 'João Silva',
      category: 'Eletrônicos',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  await prisma.product.upsert({
    where: { sku: 'SAM-TV-55' },
    update: {},
    create: {
      name: 'Smart TV 55"',
      internalCode: 'TV-001',
      sku: 'SAM-TV-55',
      barcode: '7890000000001',
      unit: 'UN',
      weight: 18.5,
      width: 124,
      height: 72,
      depth: 8,
      description: 'Smart TV 55 polegadas 4K',
      purchasePrice: 1800,
      salePrice: 2500,
      minStock: 2,
      maxStock: 20,
      currentStock: 5,
      categoryId: cat.id,
      brandId: brand.id,
      supplierId: supplier.id,
    },
  })

  for (let i = 1; i <= 6; i++) {
    await prisma.warehouseAddress.upsert({
      where: { code: `A-01-0${i}-B-0${i}` },
      update: {},
      create: {
        code: `A-01-0${i}-B-0${i}`,
        aisle: 'A',
        street: '01',
        shelf: `0${i}`,
        level: 'B',
        position: `0${i}`,
        capacity: 1000,
        status: i <= 2 ? 'occupied' : 'free',
      },
    })
  }

  console.log(`Seed completed. Admin: admin@wms.com / admin123`)
  console.log(`Admin ID: ${admin.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
