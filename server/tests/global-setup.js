// 全局测试生命周期：
// - setup：对商品库存与月售拍快照
// - teardown：恢复到测试前，确保多次跑测不污染演示数据
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

let snapshot = []

export async function setup() {
  const products = await prisma.product.findMany({
    select: { id: true, stock: true, monthlySales: true },
  })
  snapshot = products.map((p) => ({ id: p.id, stock: p.stock, monthlySales: p.monthlySales }))
}

export async function teardown() {
  for (const row of snapshot) {
    await prisma.product.update({
      where: { id: row.id },
      data: { stock: row.stock, monthlySales: row.monthlySales },
    })
  }
  await prisma.$disconnect()
}
