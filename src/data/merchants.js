import { reactive, watch } from 'vue'
import { localImage } from '@/utils/image'

/**
 * 六家校园演示商家（非学校官方合作商家）。
 * categoryKeys 支持一个商家归入多个分类，isOpen 用于营业状态展示。
 * 学生端与管理后台共用这份响应式数据，修改后写入 LocalStorage。
 */
const seedMerchants = [
  {
    id: 'chongwai-canteen',
    name: '重外美食食堂',
    categoryKeys: ['chinese'],
    categoryLabel: '中式快餐',
    rating: 4.8,
    monthlySales: 2380,
    minOrder: 10,
    deliveryTime: 20,
    deliveryFee: 1,
    isOpen: true,
    tags: ['现炒现做', '分量十足'],
    description: '家常小炒与暖心盖饭，荤素搭配，是忙碌课间也能吃好的一餐。',
    announcement: '今日推荐招牌卤肉饭，午市出餐较快，用餐高峰请提前下单。',
    image: localImage('shops/chongwai-canteen.jpg'),
    cover: { from: '#1769AA', to: '#4E9FDF' },
  },
  {
    id: 'sichuan-kitchen',
    name: '川味小厨',
    categoryKeys: ['noodle', 'snack'],
    categoryLabel: '特色面食',
    rating: 4.7,
    monthlySales: 1860,
    minOrder: 12,
    deliveryTime: 25,
    deliveryFee: 2,
    isOpen: true,
    tags: ['川味地道', '麻辣鲜香'],
    description: '一碗热辣鲜香的川味面食，重庆同学的家乡味道。',
    announcement: '辣度可在下单备注中说明，本店面食均为现点现做。',
    image: localImage('shops/sichuan-kitchen.jpg'),
    cover: { from: '#1D5F94', to: '#2E8BC8' },
  },
  {
    id: 'happy-burger',
    name: '快乐汉堡',
    categoryKeys: ['western'],
    categoryLabel: '西式美食',
    rating: 4.6,
    monthlySales: 1640,
    minOrder: 15,
    deliveryTime: 30,
    deliveryFee: 3,
    isOpen: true,
    tags: ['现炸酥脆', '人气套餐'],
    description: '现炸鸡排与厚切牛肉堡，搭配薯条和气泡饮，快乐加倍。',
    announcement: '汉堡现点现做，薯条建议尽快食用，口感更佳。',
    image: localImage('shops/happy-burger.jpg'),
    cover: { from: '#0F4C81', to: '#2878C8' },
  },
  {
    id: 'tea-station',
    name: '茶饮小站',
    categoryKeys: ['drink'],
    categoryLabel: '奶茶饮品',
    rating: 4.9,
    monthlySales: 2560,
    minOrder: 8,
    deliveryTime: 15,
    deliveryFee: 0,
    isOpen: true,
    tags: ['鲜果现做', '第二杯半价'],
    description: '当季鲜果与醇香茶底，清爽不腻，下午课的元气补给。',
    announcement: '甜度、冰度可在下单时备注，鲜果茶建议尽快饮用。',
    image: localImage('shops/tea-station.jpg'),
    cover: { from: '#2E73B8', to: '#78B7E8' },
  },
  {
    id: 'sweet-fruit',
    name: '甜心水果',
    categoryKeys: ['fruit', 'dessert'],
    categoryLabel: '水果轻食',
    rating: 4.8,
    monthlySales: 980,
    minOrder: 10,
    deliveryTime: 20,
    deliveryFee: 2,
    isOpen: true,
    tags: ['当日鲜果', '低卡轻食'],
    description: '现切水果与低糖甜品，清爽轻负担，适合想要轻盈一餐的你。',
    announcement: '水果每日现切，酸奶类商品请尽快食用。',
    image: localImage('shops/sweet-fruit.jpg'),
    cover: { from: '#1B6FA8', to: '#5EA8D8' },
  },
  {
    id: 'late-night-snacks',
    name: '深夜小吃',
    categoryKeys: ['snack'],
    categoryLabel: '特色小吃',
    rating: 4.7,
    monthlySales: 1420,
    minOrder: 10,
    deliveryTime: 28,
    deliveryFee: 2,
    isOpen: true,
    tags: ['夜宵必点', '现点现做'],
    description: '晚自习后的快乐补给站，炸物、烤串与暖心小吃都安排上。',
    announcement: '夜间供应至 22:30，高峰期配送时间可能略有延长。',
    image: localImage('shops/late-night-snacks.jpg'),
    cover: { from: '#235F8C', to: '#4A9BC9' },
  },
]

const STORAGE_KEY = 'chongwai_merchants'

function readMerchants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedMerchants.map((merchant) => ({ ...merchant }))
    }

    // 与种子数据合并，保证旧数据缺少的新字段仍有默认值
    return parsed.map((item) => {
      const seed =
        seedMerchants.find((merchant) => merchant.id === item.id) || {}
      return {
        ...seed,
        ...item,
        categoryKeys:
          Array.isArray(item.categoryKeys) && item.categoryKeys.length
            ? item.categoryKeys
            : seed.categoryKeys || [],
        cover: item.cover || seed.cover || { from: '#1769AA', to: '#4E9FDF' },
      }
    })
  } catch {
    return seedMerchants.map((merchant) => ({ ...merchant }))
  }
}

export const merchants = reactive(readMerchants())

watch(
  merchants,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

export function getMerchantById(id) {
  return merchants.find((merchant) => merchant.id === id) || null
}

/** 管理后台修改商家信息，学生端商家列表与详情会实时同步。 */
export function updateMerchant(id, patch) {
  const merchant = getMerchantById(id)
  if (!merchant) return null

  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined) merchant[key] = value
  })
  return merchant
}
