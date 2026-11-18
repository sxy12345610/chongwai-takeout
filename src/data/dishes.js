import { computed, reactive, watch } from 'vue'
import { localImage } from '@/utils/image'

/**
 * 全部菜品采用统一字段：所属商家、分类、介绍、销量、价格、图片。
 * menuCategory 用于商家详情页左侧分类，isHot 用于首页热门推荐，
 * isAvailable 用于管理后台的上架/下架状态。
 */
const seedDishes = [
  {
    id: 'canteen-braised-pork-rice',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '招牌卤肉饭',
    description: '肥瘦相间的卤肉搭配卤蛋与时蔬，酱香浓郁。',
    monthlySales: 986,
    price: 16.8,
    categoryKey: 'chinese',
    menuCategory: '招牌推荐',
    isHot: true,
    image: localImage('dishes/canteen-braised-pork-rice.jpg'),
  },
  {
    id: 'canteen-mushroom-chicken-rice',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '香菇滑鸡饭',
    description: '鲜嫩鸡腿肉与香菇同焖，汤汁拌饭更香。',
    monthlySales: 756,
    price: 17.8,
    categoryKey: 'chinese',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/canteen-mushroom-chicken-rice.jpg'),
  },
  {
    id: 'canteen-yuxiang-pork-rice',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '鱼香肉丝盖饭',
    description: '酸甜微辣的鱼香肉丝，配上颗粒分明的米饭。',
    monthlySales: 638,
    price: 15.8,
    categoryKey: 'chinese',
    menuCategory: '盖饭套餐',
    isHot: false,
    image: localImage('dishes/canteen-yuxiang-pork-rice.jpg'),
  },
  {
    id: 'canteen-tomato-egg-rice',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '番茄炒蛋盖饭',
    description: '经典家常番茄炒蛋，酸甜开胃，清爽不腻。',
    monthlySales: 582,
    price: 12.8,
    categoryKey: 'chinese',
    menuCategory: '盖饭套餐',
    isHot: false,
    image: localImage('dishes/canteen-tomato-egg-rice.jpg'),
  },
  {
    id: 'canteen-kungpao-chicken',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '宫保鸡丁',
    description: '鸡丁滑嫩，花生香脆，微辣下饭。',
    monthlySales: 426,
    price: 18.8,
    categoryKey: 'chinese',
    menuCategory: '家常小炒',
    isHot: false,
    image: localImage('dishes/canteen-kungpao-chicken.jpg'),
  },
  {
    id: 'canteen-seasonal-greens',
    merchantId: 'chongwai-canteen',
    merchantName: '重外美食食堂',
    name: '清炒时蔬',
    description: '当日新鲜蔬菜快速清炒，清爽解腻。',
    monthlySales: 318,
    price: 8.8,
    categoryKey: 'chinese',
    menuCategory: '家常小炒',
    isHot: false,
    image: localImage('dishes/canteen-seasonal-greens.jpg'),
  },
  {
    id: 'sichuan-dandan-noodles',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '川味担担面',
    description: '肉臊酥香，麻辣鲜香的经典川味拌面。',
    monthlySales: 856,
    price: 14,
    categoryKey: 'noodle',
    menuCategory: '招牌推荐',
    isHot: true,
    image: localImage('dishes/sichuan-dandan-noodles.jpg'),
  },
  {
    id: 'sichuan-beef-noodles',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '红烧牛肉面',
    description: '大块牛肉慢炖入味，汤浓面韧。',
    monthlySales: 728,
    price: 18,
    categoryKey: 'noodle',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/sichuan-beef-noodles.jpg'),
  },
  {
    id: 'sichuan-chongqing-noodles',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '重庆小面',
    description: '麻辣调料与花生碎拌匀，简单却够味。',
    monthlySales: 690,
    price: 12,
    categoryKey: 'noodle',
    menuCategory: '汤面拌面',
    isHot: false,
    image: localImage('dishes/sichuan-chongqing-noodles.jpg'),
  },
  {
    id: 'sichuan-hot-sour-noodles',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '酸辣粉',
    description: '红薯粉爽滑劲道，酸辣开胃。',
    monthlySales: 624,
    price: 13,
    categoryKey: 'noodle',
    menuCategory: '汤面拌面',
    isHot: false,
    image: localImage('dishes/sichuan-hot-sour-noodles.jpg'),
  },
  {
    id: 'sichuan-wontons',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '老麻抄手',
    description: '皮薄馅足，红油鲜香，麻而不苦。',
    monthlySales: 536,
    price: 15,
    categoryKey: 'noodle',
    menuCategory: '川味小吃',
    isHot: false,
    image: localImage('dishes/sichuan-wontons.jpg'),
  },
  {
    id: 'sichuan-brown-sugar-jelly',
    merchantId: 'sichuan-kitchen',
    merchantName: '川味小厨',
    name: '红糖冰粉',
    description: '冰凉爽滑，搭配红糖、花生碎与葡萄干。',
    monthlySales: 402,
    price: 8,
    categoryKey: 'noodle',
    menuCategory: '川味小吃',
    isHot: false,
    image: localImage('dishes/sichuan-brown-sugar-jelly.jpg'),
  },
  {
    id: 'burger-cheese-beef',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '芝士牛肉汉堡',
    description: '厚切牛肉饼搭配浓郁芝士，口感饱满。',
    monthlySales: 798,
    price: 18.5,
    categoryKey: 'western',
    menuCategory: '招牌推荐',
    isHot: true,
    image: localImage('dishes/burger-cheese-beef.jpg'),
  },
  {
    id: 'burger-spicy-chicken',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '香辣鸡腿堡',
    description: '现炸鸡腿排外酥里嫩，香辣过瘾。',
    monthlySales: 736,
    price: 16.8,
    categoryKey: 'western',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/burger-spicy-chicken.jpg'),
  },
  {
    id: 'burger-double-fish',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '双层鳕鱼堡',
    description: '双层鳕鱼肉搭配塔塔酱，鲜香细嫩。',
    monthlySales: 512,
    price: 19.9,
    categoryKey: 'western',
    menuCategory: '汉堡主食',
    isHot: false,
    image: localImage('dishes/burger-double-fish.jpg'),
  },
  {
    id: 'burger-french-fries',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '黄金薯条',
    description: '金黄酥脆，搭配番茄酱更美味。',
    monthlySales: 680,
    price: 8.8,
    categoryKey: 'western',
    menuCategory: '小食饮品',
    isHot: false,
    image: localImage('dishes/burger-french-fries.jpg'),
  },
  {
    id: 'burger-chicken-wings',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '香脆鸡翅',
    description: '外皮香脆，鸡肉多汁，趁热吃更香。',
    monthlySales: 596,
    price: 12.8,
    categoryKey: 'western',
    menuCategory: '小食饮品',
    isHot: false,
    image: localImage('dishes/burger-chicken-wings.jpg'),
  },
  {
    id: 'burger-lemon-cola',
    merchantId: 'happy-burger',
    merchantName: '快乐汉堡',
    name: '冰柠檬可乐',
    description: '冰爽可乐加入新鲜柠檬，清爽解腻。',
    monthlySales: 488,
    price: 6.5,
    categoryKey: 'western',
    menuCategory: '小食饮品',
    isHot: false,
    image: localImage('dishes/burger-lemon-cola.jpg'),
  },
  {
    id: 'tea-pearl-milk-tea',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '珍珠奶茶',
    description: '醇香奶茶搭配 Q 弹珍珠，经典口味。',
    monthlySales: 1086,
    price: 9.9,
    categoryKey: 'drink',
    menuCategory: '招牌推荐',
    isHot: true,
    image: localImage('dishes/tea-pearl-milk-tea.jpg'),
  },
  {
    id: 'tea-taro-boba',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '芋泥啵啵奶茶',
    description: '绵密芋泥与软糯啵啵，奶香浓郁。',
    monthlySales: 826,
    price: 13.8,
    categoryKey: 'drink',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/tea-taro-boba.jpg'),
  },
  {
    id: 'tea-jasmine-milk-green',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '茉莉奶绿',
    description: '茉莉茶香清新，奶味柔和不甜腻。',
    monthlySales: 752,
    price: 10.8,
    categoryKey: 'drink',
    menuCategory: '奶茶果茶',
    isHot: false,
    image: localImage('dishes/tea-jasmine-milk-green.jpg'),
  },
  {
    id: 'tea-passionfruit',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '满杯百香果',
    description: '百香果与柑橘果香交织，酸甜清爽。',
    monthlySales: 638,
    price: 12.8,
    categoryKey: 'drink',
    menuCategory: '奶茶果茶',
    isHot: false,
    image: localImage('dishes/tea-passionfruit.jpg'),
  },
  {
    id: 'tea-grape-cheese',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '芝士多肉葡萄',
    description: '葡萄果肉搭配咸香芝士奶盖，层次丰富。',
    monthlySales: 582,
    price: 16.8,
    categoryKey: 'drink',
    menuCategory: '清爽特调',
    isHot: false,
    image: localImage('dishes/tea-grape-cheese.jpg'),
  },
  {
    id: 'tea-iced-lemon',
    merchantId: 'tea-station',
    merchantName: '茶饮小站',
    name: '冻柠茶',
    description: '红茶搭配鲜柠檬，冰爽解腻。',
    monthlySales: 496,
    price: 8.8,
    categoryKey: 'drink',
    menuCategory: '清爽特调',
    isHot: false,
    image: localImage('dishes/tea-iced-lemon.jpg'),
  },
  {
    id: 'fruit-mixed-fruit-bowl',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '缤纷水果捞',
    description: '多种当季鲜果搭配酸奶，清爽又满足。',
    monthlySales: 586,
    price: 15.8,
    categoryKey: 'fruit',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/fruit-mixed-fruit-bowl.jpg'),
  },
  {
    id: 'fruit-mango-yogurt',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '芒果酸奶杯',
    description: '香甜芒果搭配浓醇酸奶与谷物脆。',
    monthlySales: 528,
    price: 13.8,
    categoryKey: 'fruit',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/fruit-mango-yogurt.jpg'),
  },
  {
    id: 'fruit-watermelon-box',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '西瓜果切盒',
    description: '当日现切西瓜，清甜多汁，开盒即食。',
    monthlySales: 486,
    price: 9.9,
    categoryKey: 'fruit',
    menuCategory: '鲜果切盒',
    isHot: false,
    image: localImage('dishes/fruit-watermelon-box.jpg'),
  },
  {
    id: 'fruit-hami-melon-box',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '哈密瓜果切盒',
    description: '香甜哈密瓜切成小块，新鲜方便。',
    monthlySales: 368,
    price: 12.8,
    categoryKey: 'fruit',
    menuCategory: '鲜果切盒',
    isHot: false,
    image: localImage('dishes/fruit-hami-melon-box.jpg'),
  },
  {
    id: 'fruit-oreo-yogurt',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '奥利奥酸奶杯',
    description: '酸奶搭配饼干碎与鲜果，香甜有层次。',
    monthlySales: 356,
    price: 14.8,
    categoryKey: 'fruit',
    menuCategory: '轻食甜品',
    isHot: false,
    image: localImage('dishes/fruit-oreo-yogurt.jpg'),
  },
  {
    id: 'fruit-low-sugar-cake',
    merchantId: 'sweet-fruit',
    merchantName: '甜心水果',
    name: '低糖水果蛋糕',
    description: '低糖奶油搭配草莓蓝莓，轻盈不甜腻。',
    monthlySales: 298,
    price: 18.8,
    categoryKey: 'dessert',
    menuCategory: '轻食甜品',
    isHot: false,
    image: localImage('dishes/fruit-low-sugar-cake.jpg'),
  },
  {
    id: 'snack-skewer-platter',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '招牌炸串拼盘',
    description: '多种荤素炸串一次满足，夜宵分享首选。',
    monthlySales: 698,
    price: 18.8,
    categoryKey: 'snack',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/snack-skewer-platter.jpg'),
  },
  {
    id: 'snack-fried-chicken-leg',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '脆皮炸鸡腿',
    description: '鸡腿外皮酥脆，内里鲜嫩多汁。',
    monthlySales: 632,
    price: 12.8,
    categoryKey: 'snack',
    menuCategory: '招牌推荐',
    isHot: false,
    image: localImage('dishes/snack-fried-chicken-leg.jpg'),
  },
  {
    id: 'snack-grilled-gluten',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '孜然烤面筋',
    description: '面筋劲道，孜然与辣椒香气十足。',
    monthlySales: 576,
    price: 8.8,
    categoryKey: 'snack',
    menuCategory: '炸物烤串',
    isHot: false,
    image: localImage('dishes/snack-grilled-gluten.jpg'),
  },
  {
    id: 'snack-chicken-strips',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '香酥鸡柳',
    description: '鸡柳金黄香酥，搭配孜然调味。',
    monthlySales: 552,
    price: 13.8,
    categoryKey: 'snack',
    menuCategory: '炸物烤串',
    isHot: false,
    image: localImage('dishes/snack-chicken-strips.jpg'),
  },
  {
    id: 'snack-wolf-tooth-potato',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '狼牙土豆',
    description: '土豆外香内糯，酸辣开胃。',
    monthlySales: 498,
    price: 9.9,
    categoryKey: 'snack',
    menuCategory: '炸物烤串',
    isHot: false,
    image: localImage('dishes/snack-wolf-tooth-potato.jpg'),
  },
  {
    id: 'snack-ham-rice-noodles',
    merchantId: 'late-night-snacks',
    merchantName: '深夜小吃',
    name: '火腿炒河粉',
    description: '河粉爽滑，搭配火腿、鸡蛋与豆芽快炒。',
    monthlySales: 436,
    price: 15.8,
    categoryKey: 'snack',
    menuCategory: '暖心主食',
    isHot: false,
    image: localImage('dishes/snack-ham-rice-noodles.jpg'),
  },
]

const STORAGE_KEY = 'chongwai_dishes'

function readDishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const list = Array.isArray(parsed) && parsed.length ? parsed : seedDishes
    return list.map((dish) => ({
      ...dish,
      isAvailable: dish.isAvailable !== false,
    }))
  } catch {
    return seedDishes.map((dish) => ({ ...dish, isAvailable: true }))
  }
}

export const dishes = reactive(readDishes())

watch(
  dishes,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

/** 首页热门推荐，仅包含已上架菜品。 */
export const hotDishes = computed(() =>
  dishes.filter((dish) => dish.isHot && dish.isAvailable !== false),
)

export function getDishesByMerchant(merchantId) {
  return dishes.filter((dish) => dish.merchantId === merchantId)
}

/** 学生端只展示已上架菜品。 */
export function getAvailableDishesByMerchant(merchantId) {
  return getDishesByMerchant(merchantId).filter(
    (dish) => dish.isAvailable !== false,
  )
}

export function addDish(payload) {
  const dish = {
    id: `dish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    merchantId: payload.merchantId,
    merchantName: payload.merchantName,
    name: payload.name.trim(),
    description: payload.description?.trim() || '',
    monthlySales: Number(payload.monthlySales) || 0,
    price: Math.round(Number(payload.price) * 100) / 100,
    categoryKey: payload.categoryKey || '',
    menuCategory: payload.menuCategory.trim(),
    isHot: Boolean(payload.isHot),
    isAvailable: payload.isAvailable !== false,
    image: payload.image || localImage('dishes/canteen-braised-pork-rice.jpg'),
  }
  dishes.unshift(dish)
  return dish
}

export function updateDish(id, patch) {
  const dish = dishes.find((item) => item.id === id)
  if (!dish) return null

  if (patch.name !== undefined) dish.name = patch.name.trim()
  if (patch.merchantId !== undefined) dish.merchantId = patch.merchantId
  if (patch.merchantName !== undefined) dish.merchantName = patch.merchantName
  if (patch.menuCategory !== undefined) {
    dish.menuCategory = patch.menuCategory.trim()
  }
  if (patch.description !== undefined) {
    dish.description = patch.description.trim()
  }
  if (patch.price !== undefined) {
    dish.price = Math.round(Number(patch.price) * 100) / 100
  }
  if (patch.image !== undefined) dish.image = patch.image.trim()
  if (patch.categoryKey !== undefined) dish.categoryKey = patch.categoryKey
  if (patch.isAvailable !== undefined) dish.isAvailable = patch.isAvailable
  if (patch.isHot !== undefined) dish.isHot = patch.isHot

  return dish
}

export function removeDish(id) {
  const index = dishes.findIndex((dish) => dish.id === id)
  if (index === -1) return false
  dishes.splice(index, 1)
  return true
}

/** 商家改名后同步菜品的冗余商家名称，避免学生端卡片显示旧名称。 */
export function syncDishMerchantName(merchantId, merchantName) {
  dishes.forEach((dish) => {
    if (dish.merchantId === merchantId) dish.merchantName = merchantName
  })
}
