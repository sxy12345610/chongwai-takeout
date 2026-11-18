import { reactive, watch } from 'vue'
import { merchants } from '@/data/merchants'

const STORAGE_KEY = 'chongwai_orders'

/** 订单状态：待接单 → 制作中 → 配送中 → 已完成，已取消仅从待接单触发。 */
export const orderStatuses = [
  { key: 'pending', label: '待接单' },
  { key: 'preparing', label: '制作中' },
  { key: 'delivering', label: '配送中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

const nextStatusMap = {
  pending: 'preparing',
  preparing: 'delivering',
  delivering: 'completed',
}

/** 演示用优惠：单个商家商品金额满 30 元减 3 元。 */
const DISCOUNT_THRESHOLD = 30
const DISCOUNT_AMOUNT = 3

function round(value) {
  return Math.round(value * 100) / 100
}

function readOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (order) =>
        order &&
        typeof order.id === 'string' &&
        Array.isArray(order.items) &&
        order.items.length > 0,
    )
  } catch {
    return []
  }
}

export const orders = reactive(readOrders())

watch(
  orders,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

export function getStatusLabel(status) {
  return orderStatuses.find((item) => item.key === status)?.label || '未知状态'
}

export function formatOrderTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function calculateDiscount(subtotal) {
  return subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0
}

export function getMerchantDeliveryFee(merchantId) {
  return merchants.find((merchant) => merchant.id === merchantId)?.deliveryFee ?? 0
}

function createOrderNo(date, index) {
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `CW${stamp}${String(index + 1).padStart(2, '0')}`
}

/**
 * 按商家拆分订单：每个商家生成独立订单、独立金额与订单编号。
 * 返回本次新创建的订单数组。
 */
export function createOrdersFromItems(items, customer = {}) {
  const grouped = new Map()

  items.forEach((item) => {
    if (!grouped.has(item.merchantId)) {
      grouped.set(item.merchantId, {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        items: [],
      })
    }

    const group = grouped.get(item.merchantId)
    group.items.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    })
  })

  const now = new Date()
  const createdAt = now.toISOString()
  const created = []

  Array.from(grouped.values()).forEach((group, index) => {
    const subtotal = round(
      group.items.reduce((total, item) => total + item.price * item.quantity, 0),
    )
    const deliveryFee = getMerchantDeliveryFee(group.merchantId)
    const discount = calculateDiscount(subtotal)
    const total = round(subtotal + deliveryFee - discount)

    created.push({
      id: `order-${now.getTime()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      orderNo: createOrderNo(now, index),
      merchantId: group.merchantId,
      merchantName: group.merchantName,
      items: group.items,
      subtotal,
      deliveryFee,
      discount,
      total,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
      contactName: customer.contactName?.trim() || '',
      phone: customer.phone?.trim() || '',
      address: customer.address?.trim() || '',
      note: customer.note?.trim() || '',
    })
  })

  orders.unshift(...created)
  return created
}

export function getOrderById(orderId) {
  return orders.find((order) => order.id === orderId)
}

export function advanceOrderStatus(orderId) {
  const order = getOrderById(orderId)
  if (!order) return null

  const nextStatus = nextStatusMap[order.status]
  if (!nextStatus) return null

  order.status = nextStatus
  order.updatedAt = new Date().toISOString()
  return nextStatus
}

/** 仅“待接单”状态允许取消。 */
export function cancelOrder(orderId) {
  const order = getOrderById(orderId)
  if (!order || order.status !== 'pending') return false

  order.status = 'cancelled'
  order.updatedAt = new Date().toISOString()
  return true
}

export function canCancelOrder(order) {
  return order?.status === 'pending'
}

export function getNextStatusLabel(status) {
  const nextStatus = nextStatusMap[status]
  if (!nextStatus) return ''
  return getStatusLabel(nextStatus)
}
