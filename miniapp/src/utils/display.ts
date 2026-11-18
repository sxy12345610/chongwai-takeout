/** 展示层格式化工具（后端金额均为整数分） */

export function formatPrice(cents: number): string {
  const yuan = cents / 100
  return `¥${cents % 100 === 0 ? yuan.toFixed(0) : yuan.toFixed(2)}`
}

export function formatMinOrder(cents: number): string {
  return cents > 0 ? `${formatPrice(cents)} 起送` : '无起送价'
}

export function formatDeliveryFee(cents: number): string {
  return cents > 0 ? `配送费 ${formatPrice(cents)}` : '免配送费'
}

export function formatSales(count: number): string {
  if (count >= 10000) return `月售 ${(count / 10000).toFixed(1)}万`
  return `月售 ${count}`
}

export function formatRating(rating: number): string {
  const value = Number(rating)
  return Number.isFinite(value) ? value.toFixed(1) : '--'
}

/**
 * 商家图片：后端返回的是相对路径（如 /images/shops/tea-station.jpg），
 * 后端不提供静态图片服务，因此映射到小程序本地静态资源 static/shops/。
 * 绝对 http(s) 地址按原样使用。
 */
export function resolveShopImage(imageUrl?: string | null): string {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const fileName = imageUrl.split('/').pop()
  return fileName ? `/static/shops/${fileName}` : ''
}
