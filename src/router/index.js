import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import ShopList from '@/views/ShopList.vue'
import ShopDetail from '@/views/ShopDetail.vue'
import CartView from '@/views/CartView.vue'
import Checkout from '@/views/Checkout.vue'
import OrdersView from '@/views/OrdersView.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import ProfileView from '@/views/ProfileView.vue'
import Address from '@/views/Address.vue'
import About from '@/views/About.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import Admin from '@/views/admin/Admin.vue'
import AdminLogin from '@/views/admin/AdminLogin.vue'
import AdminOrders from '@/views/admin/AdminOrders.vue'
import AdminProducts from '@/views/admin/AdminProducts.vue'
import AdminShops from '@/views/admin/AdminShops.vue'
import AdminStatistics from '@/views/admin/AdminStatistics.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminCategories from '@/views/admin/AdminCategories.vue'
import { isAdmin, isLoggedIn } from '@/api/auth'

const router = createRouter({
  // GitHub Pages 部署使用 Hash 路由，无需服务端配置
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { title: '首页' },
    },
    {
      path: '/shops',
      name: 'shop-list',
      component: ShopList,
      meta: { title: '校园美食商家' },
    },
    {
      path: '/shop/:id',
      name: 'shop-detail',
      component: ShopDetail,
      meta: { title: '商家详情' },
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartView,
      meta: { title: '购物车' },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: Checkout,
      meta: { title: '确认订单' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrdersView,
      meta: { title: '我的订单' },
    },
    {
      path: '/order/:id',
      name: 'order-detail',
      component: OrderDetail,
      meta: { title: '订单详情' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { title: '个人中心' },
    },
    {
      path: '/address',
      name: 'address',
      component: Address,
      meta: { title: '收货地址' },
    },
    {
      path: '/about',
      name: 'about',
      component: About,
      meta: { title: '平台介绍' },
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLogin,
      meta: { title: '管理员登录' },
    },
    {
      // 平台管理后台：全部页面要求已登录且具备 ADMIN 角色
      path: '/admin',
      component: AdminLayout,
      children: [
        {
          path: '',
          name: 'admin-home',
          component: Admin,
          meta: { title: '后台首页' },
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: AdminOrders,
          meta: { title: '订单管理' },
        },
        {
          path: 'products',
          name: 'admin-products',
          component: AdminProducts,
          meta: { title: '商品管理' },
        },
        {
          path: 'shops',
          name: 'admin-shops',
          component: AdminShops,
          meta: { title: '店铺管理' },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsers,
          meta: { title: '用户管理' },
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: AdminCategories,
          meta: { title: '分类管理' },
        },
        {
          path: 'statistics',
          name: 'admin-statistics',
          component: AdminStatistics,
          meta: { title: '数据统计' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const isAdminRoute = to.path.startsWith('/admin')
  const isLoginRoute = to.path === '/admin/login'
  if (!isAdminRoute) return true

  if (isLoginRoute) {
    // 已登录管理员访问登录页，直接进后台
    if (isLoggedIn() && isAdmin()) return { path: '/admin' }
    return true
  }

  // 其余管理后台页面：必须已登录且具备 ADMIN 角色
  if (!isLoggedIn() || !isAdmin()) {
    return { path: '/admin/login', query: { redirect: to.fullPath } }
  }
  return true
})

// 任意接口返回 401 时，统一清理并跳回登录页
window.addEventListener('api:unauthorized', () => {
  router.push({ path: '/admin/login' })
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} | 重外校园外卖平台`
    : '重外校园外卖平台 | CHONGWAI CAMPUS FOOD'
})

export default router
