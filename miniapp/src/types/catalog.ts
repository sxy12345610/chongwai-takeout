/** 与后端 catalog 接口一一对应的类型（依据 server/src/modules/catalog 实际返回字段） */

export interface Category {
  id: string
  key: string
  name: string
  sortOrder: number
}

export interface Merchant {
  id: string
  name: string
  description: string | null
  announcement: string | null
  categoryLabel: string | null
  tags: string[]
  minOrderCents: number
  deliveryFeeCents: number
  deliveryTimeMin: number
  isOpen: boolean
  rating: number
  monthlySales: number
  imageUrl: string | null
  coverFrom: string | null
  coverTo: string | null
}

export interface PageResult<T> {
  list: T[]
  page: number
  pageSize: number
  total: number
}
