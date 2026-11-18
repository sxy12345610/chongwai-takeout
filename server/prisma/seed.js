import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

/**
 * 种子脚本：把现有演示版中的商家、分类、菜品导入 PostgreSQL。
 *
 * - 使用确定性 UUID，重复执行不会产生重复数据（upsert）。
 * - 金额由元转换为整数分。
 * - 账号仅在提供 SEED_DEMO_PASSWORD 时创建，避免把演示密码写进代码。
 * - 历史 LocalStorage 订单与地址不导入，避免污染真实库。
 */
const prisma = new PrismaClient()
const seedData = JSON.parse(
  readFileSync(new URL('./seed-data.json', import.meta.url), 'utf8'),
)

/** 由字符串生成稳定的 UUID（v5 风格），保证多次 seed 得到相同主键。 */
function stableUuid(input) {
  const hash = createHash('sha1').update(input).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(
    17,
    20,
  )}-${hash.slice(20, 32)}`
}

const yuanToCents = (value) => Math.round(Number(value) * 100)

async function seedCategories() {
  const idByKey = new Map()

  for (const category of seedData.categories) {
    const record = await prisma.category.upsert({
      where: { key: category.key },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        id: stableUuid(`category:${category.key}`),
        key: category.key,
        name: category.name,
        sortOrder: category.sortOrder,
      },
    })
    idByKey.set(record.key, record.id)
  }

  return idByKey
}

async function seedMerchants() {
  const idBySlug = new Map()

  for (const merchant of seedData.merchants) {
    const id = stableUuid(`merchant:${merchant.id}`)
    const payload = {
      name: merchant.name,
      description: merchant.description || null,
      announcement: merchant.announcement || null,
      categoryLabel: merchant.categoryLabel || null,
      tags: Array.isArray(merchant.tags) ? merchant.tags : [],
      minOrderCents: yuanToCents(merchant.minOrder),
      deliveryFeeCents: yuanToCents(merchant.deliveryFee),
      deliveryTimeMin: Number(merchant.deliveryTime) || 20,
      isOpen: merchant.isOpen !== false,
      rating: merchant.rating ?? 5.0,
      monthlySales: Number(merchant.monthlySales) || 0,
      imageUrl: merchant.image || null,
      coverFrom: merchant.cover?.from || '#1769AA',
      coverTo: merchant.cover?.to || '#4E9FDF',
      status: 'ACTIVE',
    }

    await prisma.merchant.upsert({
      where: { id },
      update: payload,
      create: { id, ...payload },
    })

    idBySlug.set(merchant.id, id)
  }

  return idBySlug
}

async function seedProducts(merchantIdBySlug, categoryIdByKey) {
  const INITIAL_STOCK = 100

  for (const dish of seedData.dishes) {
    const merchantId = merchantIdBySlug.get(dish.merchantId)
    if (!merchantId) {
      throw new Error(`菜品 ${dish.name} 找不到所属商家 ${dish.merchantId}`)
    }

    const id = stableUuid(`product:${dish.id}`)
    const payload = {
      merchantId,
      categoryId: categoryIdByKey.get(dish.categoryKey) || null,
      name: dish.name,
      description: dish.description || null,
      imageUrl: dish.image || null,
      priceCents: yuanToCents(dish.price),
      stock: INITIAL_STOCK,
      monthlySales: Number(dish.monthlySales) || 0,
      menuCategory: dish.menuCategory || null,
      isAvailable: dish.isAvailable !== false,
      isHot: Boolean(dish.isHot),
      deletedAt: null,
    }

    await prisma.product.upsert({
      where: { id },
      update: payload,
      create: { id, ...payload },
    })
  }
}

async function seedDemoAccounts() {
  const password = process.env.SEED_DEMO_PASSWORD
  const userPhone = process.env.SEED_USER_PHONE
  const merchantPhone = process.env.SEED_MERCHANT_PHONE

  if (!password) {
    console.log('[seed] 未设置 SEED_DEMO_PASSWORD，跳过演示账号初始化')
    return
  }
  if (!userPhone || !merchantPhone) {
    console.log('[seed] 未设置 SEED_USER_PHONE / SEED_MERCHANT_PHONE，跳过演示账号初始化')
    return
  }
  if (password.length < 8) {
    throw new Error('SEED_DEMO_PASSWORD 至少需要 8 位')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { phone: userPhone },
    update: { status: 'ACTIVE' },
    create: {
      phone: userPhone,
      passwordHash,
      nickname: '重外同学',
    },
  })

  const merchantUser = await prisma.user.upsert({
    where: { phone: merchantPhone },
    update: { status: 'ACTIVE' },
    create: {
      phone: merchantPhone,
      passwordHash,
      nickname: '商家管理员',
    },
  })

  const firstMerchant = seedData.merchants[0]
  if (!firstMerchant) return

  const merchantId = stableUuid(`merchant:${firstMerchant.id}`)
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId, userId: merchantUser.id } },
    update: { role: 'OWNER' },
    create: { merchantId, userId: merchantUser.id, role: 'OWNER' },
  })

  console.log(`[seed] 演示用户 ${user.phone}、商家账号 ${merchantUser.phone} 已初始化`)
}

async function main() {
  console.log('[seed] 开始导入演示数据...')

  const categoryIdByKey = await seedCategories()
  const merchantIdBySlug = await seedMerchants()
  await seedProducts(merchantIdBySlug, categoryIdByKey)
  await seedDemoAccounts()

  console.log(
    `[seed] 完成：分类 ${seedData.categories.length}、商家 ${seedData.merchants.length}、菜品 ${seedData.dishes.length}`,
  )
}

main()
  .catch((error) => {
    console.error('[seed] 失败：', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
