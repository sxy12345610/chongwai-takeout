/**
 * 金额格式化：12 -> ¥12，8.5 -> ¥8.5，0 -> 免费
 */
export function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return '¥0'
  if (amount === 0) return '免费'
  return `¥${Number.isInteger(amount) ? amount : amount.toFixed(1)}`
}

/**
 * 金额展示：0 也显示 ¥0，用于营业额等统计场景。
 */
export function formatMoney(value) {
  const amount = Number(value) || 0
  return `¥${Number.isInteger(amount) ? amount : amount.toFixed(1)}`
}

/**
 * 配送费文案：0 -> 免配送费，2 -> ¥2 配送
 */
export function formatDeliveryFee(value) {
  return Number(value) === 0 ? '免配送费' : `${formatPrice(value)} 配送`
}

/**
 * 日期时间格式化：ISO/Date -> 'YYYY-MM-DD HH:mm'，无效值返回 '—'
 */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
