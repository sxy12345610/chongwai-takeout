import { prisma } from '../../lib/prisma.js'
import { CODES, forbidden, isUuid, notFound } from '../../utils/httpError.js'

const select = {
  id: true,
  contactName: true,
  phone: true,
  campusArea: true,
  building: true,
  room: true,
  detail: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
}

/** 校验地址归属，返回地址记录，越权或不存在统一抛 404（不泄露存在性）。 */
async function assertOwnership(userId, addressId) {
  if (!isUuid(addressId)) throw notFound('地址不存在', CODES.NOT_FOUND)
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: { ...select, userId: true },
  })
  if (!address || address.userId !== userId) {
    throw notFound('地址不存在', CODES.NOT_FOUND)
  }
  return address
}

/** GET /addresses */
export async function listAddresses(userId) {
  return prisma.address.findMany({
    where: { userId },
    select,
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
}

/** POST /addresses：首条地址自动设为默认。 */
export async function createAddress(userId, payload) {
  const existing = await prisma.address.count({ where: { userId } })
  const isDefault = payload.isDefault === true || existing === 0

  return prisma.$transaction(async (tx) => {
    // 若要设为默认，先把该用户的旧默认取消（配合部分唯一索引）
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }
    return tx.address.create({
      data: {
        userId,
        contactName: payload.contactName,
        phone: payload.phone,
        campusArea: payload.campusArea ?? null,
        building: payload.building ?? null,
        room: payload.room ?? null,
        detail: payload.detail ?? null,
        isDefault,
      },
      select,
    })
  })
}

/** PUT /addresses/:id */
export async function updateAddress(userId, addressId, payload) {
  await assertOwnership(userId, addressId)

  return prisma.$transaction(async (tx) => {
    if (payload.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      })
    }
    return tx.address.update({
      where: { id: addressId },
      data: {
        contactName: payload.contactName,
        phone: payload.phone,
        campusArea: payload.campusArea ?? null,
        building: payload.building ?? null,
        room: payload.room ?? null,
        detail: payload.detail ?? null,
        // 仅当显式传布尔时才更新默认标记
        ...(typeof payload.isDefault === 'boolean'
          ? { isDefault: payload.isDefault }
          : {}),
      },
      select,
    })
  })
}

/** DELETE /addresses/:id */
export async function deleteAddress(userId, addressId) {
  await assertOwnership(userId, addressId)
  await prisma.address.delete({ where: { id: addressId } })
  return { id: addressId }
}

/** PATCH /addresses/:id/default */
export async function setDefaultAddress(userId, addressId) {
  await assertOwnership(userId, addressId)

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId, isDefault: true, NOT: { id: addressId } },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
      select,
    }),
  ])
  return prisma.address.findUnique({ where: { id: addressId }, select })
}

/** 供下单使用：取用户默认地址；没有则取最新一条；都没有抛错。 */
export async function resolveAddressForOrder(userId, addressId) {
  const where = { userId }
  if (addressId) where.id = addressId
  const address = await prisma.address.findFirst({
    where,
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
  if (!address) {
    throw forbidden('请先添加收货地址')
  }
  return address
}
