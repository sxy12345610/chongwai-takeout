import { request } from './request'
import type { Category, Merchant, PageResult } from '@/types/catalog'

export interface MerchantQuery {
  keyword?: string
  categoryKey?: string
  isOpen?: boolean
  page?: number
  pageSize?: number
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = []
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value === undefined || value === '') return
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

/** GET /categories */
export function getCategories(): Promise<Category[]> {
  return request<Category[]>({ url: '/categories' })
}

/** GET /merchants */
export function listMerchants(query: MerchantQuery = {}): Promise<PageResult<Merchant>> {
  const qs = buildQuery({
    keyword: query.keyword,
    categoryKey: query.categoryKey,
    isOpen: query.isOpen,
    page: query.page,
    pageSize: query.pageSize,
  })
  return request<PageResult<Merchant>>({ url: `/merchants${qs}` })
}
