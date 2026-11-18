import { computed, reactive, watch } from 'vue'

const STORAGE_KEY = 'chongwai_cart'

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) => item && typeof item.id === 'string' && Number(item.quantity) > 0,
    )
  } catch {
    return []
  }
}

const cartItems = reactive(readCart())

/** 购物车条目唯一键，按商家 + 菜品区分，避免跨店串单。 */
function itemKeyOf(item) {
  return `${item.merchantId}:${item.id}`
}

// 默认全部选中，便于直接结算
const selectedKeys = reactive(new Set(cartItems.map(itemKeyOf)))

watch(
  cartItems,
  (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },
  { deep: true },
)

export const cartCount = computed(() =>
  cartItems.reduce((total, item) => total + item.quantity, 0),
)

export const cartTotal = computed(() =>
  cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
)

export const cartMerchantGroups = computed(() => {
  const groups = new Map()

  cartItems.forEach((item) => {
    if (!groups.has(item.merchantId)) {
      groups.set(item.merchantId, {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        items: [],
        count: 0,
        total: 0,
      })
    }

    const group = groups.get(item.merchantId)
    group.items.push(item)
    group.count += item.quantity
    group.total += item.price * item.quantity
  })

  return Array.from(groups.values())
})

/* ---------------------------- 结算选择 ---------------------------- */

export const selectedCartItems = computed(() =>
  cartItems.filter((item) => selectedKeys.has(itemKeyOf(item))),
)

export const selectedCount = computed(() =>
  selectedCartItems.value.reduce((total, item) => total + item.quantity, 0),
)

export const selectedTotal = computed(() =>
  selectedCartItems.value.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  ),
)

export const allCartSelected = computed(
  () =>
    cartItems.length > 0 &&
    cartItems.every((item) => selectedKeys.has(itemKeyOf(item))),
)

export function isItemSelected(item) {
  return selectedKeys.has(itemKeyOf(item))
}

export function toggleItemSelection(item) {
  const key = itemKeyOf(item)
  if (selectedKeys.has(key)) selectedKeys.delete(key)
  else selectedKeys.add(key)
}

export function isGroupSelected(group) {
  return (
    group.items.length > 0 &&
    group.items.every((item) => selectedKeys.has(itemKeyOf(item)))
  )
}

export function toggleGroupSelection(group) {
  const shouldSelect = !isGroupSelected(group)
  group.items.forEach((item) => {
    const key = itemKeyOf(item)
    if (shouldSelect) selectedKeys.add(key)
    else selectedKeys.delete(key)
  })
}

export function selectAllCartItems() {
  cartItems.forEach((item) => selectedKeys.add(itemKeyOf(item)))
}

export function clearCartSelection() {
  selectedKeys.clear()
}

/* ---------------------------- 增删改查 ---------------------------- */

function matchesCartItem(item, dishId, merchantId) {
  return item.id === dishId && (!merchantId || item.merchantId === merchantId)
}

export function getCartQuantity(dishId, merchantId) {
  const item = cartItems.find((cartItem) =>
    matchesCartItem(cartItem, dishId, merchantId),
  )
  return item ? item.quantity : 0
}

export function getMerchantCartCount(merchantId) {
  if (!merchantId) return 0
  return cartItems
    .filter((item) => item.merchantId === merchantId)
    .reduce((total, item) => total + item.quantity, 0)
}

export function getMerchantCartTotal(merchantId) {
  if (!merchantId) return 0
  return cartItems
    .filter((item) => item.merchantId === merchantId)
    .reduce((total, item) => total + item.price * item.quantity, 0)
}

export function addToCart(dish) {
  const existing = cartItems.find(
    (item) => item.id === dish.id && item.merchantId === dish.merchantId,
  )
  if (existing) {
    existing.quantity += 1
    selectedKeys.add(itemKeyOf(existing))
    return
  }

  const nextItem = {
    id: dish.id,
    name: dish.name,
    price: dish.price,
    image: dish.image,
    merchantId: dish.merchantId,
    merchantName: dish.merchantName,
    quantity: 1,
  }
  cartItems.push(nextItem)
  selectedKeys.add(itemKeyOf(nextItem))
}

export function incrementCartItem(dishId, merchantId) {
  const item = cartItems.find((cartItem) =>
    matchesCartItem(cartItem, dishId, merchantId),
  )
  if (item) item.quantity += 1
}

export function decrementCartItem(dishId, merchantId) {
  const index = cartItems.findIndex((item) =>
    matchesCartItem(item, dishId, merchantId),
  )
  if (index === -1) return
  if (cartItems[index].quantity > 1) {
    cartItems[index].quantity -= 1
  } else {
    selectedKeys.delete(itemKeyOf(cartItems[index]))
    cartItems.splice(index, 1)
  }
}

export function removeCartItem(dishId, merchantId) {
  const index = cartItems.findIndex((item) =>
    matchesCartItem(item, dishId, merchantId),
  )
  if (index !== -1) {
    selectedKeys.delete(itemKeyOf(cartItems[index]))
    cartItems.splice(index, 1)
  }
}

/** 结算成功后只移除已提交的商品，未选中的商品继续保留。 */
export function removeCartItems(items) {
  const keys = new Set(items.map(itemKeyOf))
  for (let index = cartItems.length - 1; index >= 0; index -= 1) {
    const key = itemKeyOf(cartItems[index])
    if (!keys.has(key)) continue
    selectedKeys.delete(key)
    cartItems.splice(index, 1)
  }
}

export function clearCart() {
  selectedKeys.clear()
  cartItems.splice(0, cartItems.length)
}

export { cartItems }
