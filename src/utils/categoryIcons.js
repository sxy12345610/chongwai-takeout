import {
  Apple,
  CakeSlice,
  CupSoda,
  Flame,
  LayoutGrid,
  Pizza,
  Soup,
  UtensilsCrossed,
} from 'lucide-vue-next'

/**
 * 分类 key 与 lucide 图标的映射，供首页和商家页复用。
 */
export const categoryIcons = {
  chinese: UtensilsCrossed,
  snack: Flame,
  drink: CupSoda,
  western: Pizza,
  fruit: Apple,
  noodle: Soup,
  dessert: CakeSlice,
  all: LayoutGrid,
}
