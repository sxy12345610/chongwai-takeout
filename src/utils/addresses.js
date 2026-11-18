import { computed, reactive, watch } from 'vue'

const STORAGE_KEY = 'chongwai_addresses'

function readAddresses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (address) =>
        address &&
        typeof address.id === 'string' &&
        typeof address.contactName === 'string' &&
        typeof address.phone === 'string',
    )
  } catch {
    return []
  }
}

export const addresses = reactive(readAddresses())

// 保证默认地址唯一；若已有地址但都没有默认，则把第一条设为默认
function normalizeDefaults() {
  let hasDefault = false
  addresses.forEach((address) => {
    if (!address.isDefault) return
    if (hasDefault) address.isDefault = false
    else hasDefault = true
  })

  if (!hasDefault && addresses.length > 0) addresses[0].isDefault = true
}

normalizeDefaults()

watch(
  addresses,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

export const defaultAddress = computed(
  () => addresses.find((address) => address.isDefault) || addresses[0] || null,
)

export function getAddressById(id) {
  return addresses.find((address) => address.id === id) || null
}

export function formatAddress(address) {
  if (!address) return ''
  const base = [address.campusArea, address.building, address.room]
    .filter(Boolean)
    .join(' ')
  return address.detail ? `${base}，${address.detail}` : base
}

function buildAddress(payload) {
  return {
    id: payload.id || `address-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contactName: payload.contactName.trim(),
    phone: payload.phone.trim(),
    campusArea: payload.campusArea.trim(),
    building: payload.building.trim(),
    room: payload.room.trim(),
    detail: payload.detail?.trim() || '',
    isDefault: Boolean(payload.isDefault),
  }
}

export function addAddress(payload) {
  const address = buildAddress(payload)
  if (address.isDefault || addresses.length === 0) {
    addresses.forEach((item) => {
      item.isDefault = false
    })
    address.isDefault = true
  }
  addresses.unshift(address)
  return address
}

export function updateAddress(id, payload) {
  const index = addresses.findIndex((address) => address.id === id)
  if (index === -1) return null

  const next = buildAddress({ ...payload, id })
  if (!next.isDefault && addresses[index].isDefault) next.isDefault = true

  if (next.isDefault) {
    addresses.forEach((item) => {
      item.isDefault = false
    })
  }

  addresses.splice(index, 1, next)
  normalizeDefaults()
  return next
}

export function removeAddress(id) {
  const index = addresses.findIndex((address) => address.id === id)
  if (index === -1) return false
  addresses.splice(index, 1)
  normalizeDefaults()
  return true
}

export function setDefaultAddress(id) {
  const exists = addresses.some((address) => address.id === id)
  if (!exists) return false
  addresses.forEach((address) => {
    address.isDefault = address.id === id
  })
  return true
}
