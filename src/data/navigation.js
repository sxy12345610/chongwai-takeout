import {
  ClipboardList,
  Home,
  ShoppingCart,
  Store,
  User,
} from 'lucide-vue-next'

/**
 * 全站主导航配置（桌面顶部导航与移动端底部导航共用）。
 */
export const primaryNav = [
  { label: '首页', to: '/', icon: Home },
  { label: '商家', to: '/shops', icon: Store },
  { label: '购物车', to: '/cart', icon: ShoppingCart },
  { label: '订单', to: '/orders', icon: ClipboardList },
  { label: '我的', to: '/profile', icon: User },
]
