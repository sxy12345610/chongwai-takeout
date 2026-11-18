import { computed } from 'vue'
import { orders } from '@/utils/orders'
import { dishes } from '@/data/dishes'

function round(value) {
  return Math.round(value * 100) / 100
}

function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function isCancelled(order) {
  return order.status === 'cancelled'
}

function dayLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * 管理后台统计：全部基于学生端产生的订单与当前商品数据实时计算。
 */
export function useAdminStats() {
  const todayOrders = computed(() => {
    const start = startOfDay(new Date())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return orders.filter((order) => {
      const time = new Date(order.createdAt)
      return time >= start && time < end
    })
  })

  const todayRevenue = computed(() =>
    round(
      todayOrders.value
        .filter((order) => !isCancelled(order))
        .reduce((sum, order) => sum + order.total, 0),
    ),
  )

  const totalDishes = computed(() => dishes.length)

  const pendingOrders = computed(() =>
    orders.filter((order) => order.status === 'pending'),
  )

  const totalOrders = computed(() => orders.length)

  const completedOrders = computed(
    () => orders.filter((order) => order.status === 'completed').length,
  )

  const cancelledOrders = computed(
    () => orders.filter((order) => order.status === 'cancelled').length,
  )

  const totalRevenue = computed(() =>
    round(
      orders
        .filter((order) => !isCancelled(order))
        .reduce((sum, order) => sum + order.total, 0),
    ),
  )

  const last7Days = computed(() => {
    const result = []
    const today = startOfDay(new Date())

    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = new Date(today)
      start.setDate(start.getDate() - offset)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const dayOrders = orders.filter((order) => {
        const time = new Date(order.createdAt)
        return time >= start && time < end
      })

      result.push({
        label: dayLabel(start),
        orders: dayOrders.length,
        revenue: round(
          dayOrders
            .filter((order) => !isCancelled(order))
            .reduce((sum, order) => sum + order.total, 0),
        ),
      })
    }

    return result
  })

  const merchantRanking = computed(() => {
    const map = new Map()

    orders
      .filter((order) => !isCancelled(order))
      .forEach((order) => {
        const entry = map.get(order.merchantId) || {
          id: order.merchantId,
          name: order.merchantName,
          orders: 0,
          revenue: 0,
        }
        entry.orders += 1
        entry.revenue += order.total
        map.set(order.merchantId, entry)
      })

    return Array.from(map.values())
      .map((entry) => ({ ...entry, revenue: round(entry.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
  })

  const hotDishRanking = computed(() => {
    const map = new Map()

    orders
      .filter((order) => !isCancelled(order))
      .forEach((order) => {
        order.items.forEach((item) => {
          const key = `${order.merchantId}:${item.id}`
          const entry = map.get(key) || {
            id: key,
            name: item.name,
            merchantName: order.merchantName,
            quantity: 0,
            revenue: 0,
          }
          entry.quantity += item.quantity
          entry.revenue += item.price * item.quantity
          map.set(key, entry)
        })
      })

    return Array.from(map.values())
      .map((entry) => ({ ...entry, revenue: round(entry.revenue) }))
      .sort((a, b) => b.quantity - a.quantity)
  })

  const latestOrders = computed(() =>
    [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
  )

  return {
    todayOrders,
    todayRevenue,
    totalDishes,
    pendingOrders,
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    last7Days,
    merchantRanking,
    hotDishRanking,
    latestOrders,
  }
}
