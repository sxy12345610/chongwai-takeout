<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock,
  Headphones,
  Info,
  LayoutDashboard,
  MapPin,
  Pencil,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'
import { avatarPresets } from '@/data/avatars'
import { profile, updateProfile } from '@/utils/profile'
import { orders } from '@/utils/orders'
import { addresses } from '@/utils/addresses'
import { cartCount } from '@/utils/cart'

const orderEntries = [
  { key: 'pending', label: '待接单', icon: Clock },
  { key: 'preparing', label: '制作中', icon: UtensilsCrossed },
  { key: 'delivering', label: '配送中', icon: Truck },
  { key: 'completed', label: '已完成', icon: CheckCircle2 },
]

const statusCounts = computed(() => {
  const result = { pending: 0, preparing: 0, delivering: 0, completed: 0 }
  orders.forEach((order) => {
    if (order.status in result) result[order.status] += 1
  })
  return result
})

const showEdit = ref(false)
const showService = ref(false)
const showHelp = ref(false)

const editForm = reactive({
  nickname: '',
  avatar: 'canteen',
  phone: '',
})
const editError = ref('')

function openEdit() {
  editForm.nickname = profile.nickname
  editForm.avatar = profile.avatar
  editForm.phone = profile.phone
  editError.value = ''
  showEdit.value = true
}

function saveProfile() {
  const nickname = editForm.nickname.trim()
  const phone = editForm.phone.trim()

  if (!nickname) {
    editError.value = '昵称不能为空'
    return
  }
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    editError.value = '请输入 11 位有效手机号'
    return
  }

  updateProfile({ nickname, avatar: editForm.avatar, phone })
  showEdit.value = false
}
</script>

<template>
  <div class="page container profile-page">
    <section class="profile-hero">
      <UserAvatar :avatar="profile.avatar" :size="66" />

      <div class="profile-hero__info">
        <h1>{{ profile.nickname }}</h1>
        <span class="profile-hero__identity">重外校园用户</span>
        <p>{{ profile.phone || '暂未绑定手机号' }}</p>
      </div>

      <button type="button" class="profile-hero__edit" @click="openEdit">
        <Pencil :size="14" />
        编辑资料
      </button>
    </section>

    <section class="profile-stats card">
      <RouterLink to="/orders">
        <strong>{{ orders.length }}</strong>
        <span>我的订单</span>
      </RouterLink>
      <RouterLink to="/cart">
        <strong>{{ cartCount }}</strong>
        <span>购物车</span>
      </RouterLink>
      <RouterLink to="/address">
        <strong>{{ addresses.length }}</strong>
        <span>收货地址</span>
      </RouterLink>
    </section>

    <section class="card profile-section">
      <header class="profile-section__head">
        <h2>我的订单</h2>
        <RouterLink to="/orders" class="profile-section__more">
          全部订单
          <ChevronRight :size="14" />
        </RouterLink>
      </header>

      <div class="order-shortcuts">
        <RouterLink
          v-for="entry in orderEntries"
          :key="entry.key"
          :to="`/orders?status=${entry.key}`"
          class="order-shortcut"
        >
          <span class="order-shortcut__icon">
            <component :is="entry.icon" :size="20" :stroke-width="1.8" />
            <em v-if="statusCounts[entry.key]">
              {{ statusCounts[entry.key] }}
            </em>
          </span>
          <span>{{ entry.label }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="card profile-section">
      <header class="profile-section__head">
        <h2>我的服务</h2>
      </header>

      <ul class="service-list">
        <li>
          <RouterLink to="/address" class="service-item">
            <span class="service-item__icon"><MapPin :size="17" /></span>
            <span class="service-item__label">收货地址</span>
            <small>{{ addresses.length }} 个地址</small>
            <ChevronRight :size="15" />
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/admin" class="service-item">
            <span class="service-item__icon"><LayoutDashboard :size="17" /></span>
            <span class="service-item__label">商家管理后台</span>
            <small>前端演示入口</small>
            <ChevronRight :size="15" />
          </RouterLink>
        </li>
        <li>
          <button type="button" class="service-item" @click="showService = true">
            <span class="service-item__icon"><Headphones :size="17" /></span>
            <span class="service-item__label">联系客服</span>
            <small>校内餐饮服务</small>
            <ChevronRight :size="15" />
          </button>
        </li>
        <li>
          <RouterLink to="/about" class="service-item">
            <span class="service-item__icon"><Info :size="17" /></span>
            <span class="service-item__label">平台介绍</span>
            <small>V1.0.0</small>
            <ChevronRight :size="15" />
          </RouterLink>
        </li>
        <li>
          <button type="button" class="service-item" @click="showHelp = true">
            <span class="service-item__icon"><CircleHelp :size="17" /></span>
            <span class="service-item__label">使用帮助</span>
            <small>点餐与配送说明</small>
            <ChevronRight :size="15" />
          </button>
        </li>
      </ul>
    </section>

    <p class="profile-footer">
      <ShoppingBag :size="13" />
      重外校园外卖平台 · 让校园生活更便捷
    </p>

    <!-- 编辑资料 -->
    <div v-if="showEdit" class="modal">
      <div class="modal__backdrop" @click="showEdit = false"></div>
      <form class="modal__panel card" @submit.prevent="saveProfile">
        <header class="modal__head">
          <h2>编辑个人资料</h2>
          <button
            type="button"
            class="modal__close"
            aria-label="关闭"
            @click="showEdit = false"
          >
            <X :size="17" />
          </button>
        </header>

        <label class="modal-field">
          <span>昵称</span>
          <input
            v-model="editForm.nickname"
            type="text"
            maxlength="12"
            placeholder="请输入昵称"
          />
        </label>

        <label class="modal-field">
          <span>联系电话</span>
          <input
            v-model="editForm.phone"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="选填，11 位手机号"
          />
        </label>

        <div class="avatar-picker">
          <span class="avatar-picker__label">选择头像</span>
          <div class="avatar-picker__grid">
            <button
              v-for="preset in avatarPresets"
              :key="preset.key"
              type="button"
              class="avatar-option"
              :class="{ 'is-active': editForm.avatar === preset.key }"
              :aria-pressed="editForm.avatar === preset.key"
              :aria-label="`头像 ${preset.key}`"
              @click="editForm.avatar = preset.key"
            >
              <UserAvatar :avatar="preset.key" :size="42" />
              <span class="avatar-option__check"><Check :size="11" :stroke-width="3" /></span>
            </button>
          </div>
        </div>

        <p v-if="editError" class="modal-error">{{ editError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn btn--soft" @click="showEdit = false">
            取消
          </button>
          <button type="submit" class="btn btn--primary">保存资料</button>
        </div>
      </form>
    </div>

    <!-- 联系客服 -->
    <div v-if="showService" class="modal">
      <div class="modal__backdrop" @click="showService = false"></div>
      <div class="modal__panel card">
        <header class="modal__head">
          <h2>联系客服</h2>
          <button
            type="button"
            class="modal__close"
            aria-label="关闭"
            @click="showService = false"
          >
            <X :size="17" />
          </button>
        </header>
        <p class="modal-text">
          校园餐饮服务热线：<strong>023-6288 6688</strong><br />
          服务时间：每日 09:00 - 21:00<br />
          如遇配送问题，请提供订单编号以便快速处理。
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn--primary" @click="showService = false">
            我知道了
          </button>
        </div>
      </div>
    </div>

    <!-- 使用帮助 -->
    <div v-if="showHelp" class="modal">
      <div class="modal__backdrop" @click="showHelp = false"></div>
      <div class="modal__panel card">
        <header class="modal__head">
          <h2>使用帮助</h2>
          <button
            type="button"
            class="modal__close"
            aria-label="关闭"
            @click="showHelp = false"
          >
            <X :size="17" />
          </button>
        </header>
        <ol class="help-list">
          <li>在首页或商家列表挑选商家与菜品，加入购物车。</li>
          <li>进入购物车勾选商品，点击结算并填写收货信息。</li>
          <li>提交订单后可在“我的订单”查看状态与详情。</li>
        </ol>
        <p class="modal-text modal-text--hint">
          平台目前为前端演示版本，订单与支付均为模拟流程。
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn--primary" @click="showHelp = false">
            明白了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding-bottom: 20px;
}

/* 用户信息 */
.profile-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  padding: 22px 18px;
  border-radius: 24px;
  background: linear-gradient(125deg, #1769aa 0%, #2878c8 62%, #4e9fdf 100%);
  color: #ffffff;
  box-shadow: 0 16px 34px rgba(23, 105, 170, 0.22);
}

.profile-hero::after {
  content: "";
  position: absolute;
  top: -70px;
  right: -50px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.profile-hero__info {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
}

.profile-hero__info h1 {
  overflow: hidden;
  font-size: 19px;
  font-weight: 800;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.profile-hero__identity {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.18);
  font-size: 10px;
  font-weight: 600;
}

.profile-hero__info p {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
}

.profile-hero__edit {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 8px 11px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.92);
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 700;
  transition: background-color 0.2s ease;
}

.profile-hero__edit:hover {
  background-color: #ffffff;
}

/* 概览 */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
  padding: 14px 4px;
}

.profile-stats a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-right: 1px solid var(--border-soft);
}

.profile-stats a:last-child {
  border-right: 0;
}

.profile-stats strong {
  color: var(--brand-primary);
  font-size: 19px;
  font-weight: 800;
}

.profile-stats span {
  color: var(--text-secondary);
  font-size: 10.5px;
}

/* 通用区块 */
.profile-section {
  margin-top: 14px;
  padding: 16px;
}

.profile-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-section__head h2 {
  font-size: 14.5px;
  font-weight: 750;
}

.profile-section__more {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.profile-section__more:hover {
  color: var(--brand-primary);
}

/* 订单入口 */
.order-shortcuts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: 14px;
}

.order-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 2px;
  border-radius: 13px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.order-shortcut:hover {
  background-color: var(--brand-soft);
}

.order-shortcut__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.order-shortcut__icon em {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  padding: 1px 4px;
  border-radius: var(--radius-pill);
  background-color: #d9743f;
  color: #ffffff;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  text-align: center;
}

/* 服务列表 */
.service-list {
  display: grid;
  margin-top: 6px;
}

.service-list li + li {
  border-top: 1px solid var(--border-soft);
}

.service-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 0;
  color: var(--text-primary);
  text-align: left;
}

.service-item__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.service-item__label {
  font-size: 12.5px;
  font-weight: 650;
}

.service-item small {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 10px;
}

.service-item > svg {
  flex: none;
  color: #b6c3d0;
}

.profile-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 18px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(16, 36, 56, 0.42);
  backdrop-filter: blur(2px);
}

.modal__panel {
  position: relative;
  width: 100%;
  max-width: 380px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 18px;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 42, 68, 0.28);
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.modal__head h2 {
  font-size: 15px;
  font-weight: 750;
}

.modal__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #f2f7fc;
  color: var(--text-secondary);
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.modal-field span {
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.modal-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dfeaf6;
  border-radius: 11px;
  background-color: #f9fcff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-field input:focus {
  border-color: var(--brand-secondary);
  box-shadow: 0 0 0 3px rgba(40, 120, 200, 0.09);
}

.avatar-picker__label {
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.avatar-picker__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.avatar-option {
  position: relative;
  display: grid;
  place-items: center;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 14px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.avatar-option.is-active {
  border-color: var(--brand-primary);
  background-color: var(--brand-soft);
}

.avatar-option__check {
  position: absolute;
  right: 1px;
  bottom: 1px;
  display: none;
  place-items: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: var(--brand-primary);
  color: #ffffff;
}

.avatar-option.is-active .avatar-option__check {
  display: grid;
}

.modal-error {
  margin-top: 4px;
  color: #c25b5b;
  font-size: 11px;
}

.modal-text {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.9;
}

.modal-text strong {
  color: var(--brand-primary);
  font-size: 14px;
}

.modal-text--hint {
  margin-top: 10px;
  padding: 9px 11px;
  border-radius: 10px;
  background-color: var(--brand-soft);
  font-size: 10.5px;
}

.help-list {
  display: grid;
  gap: 8px;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.7;
  list-style: decimal;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 16px;
}

.modal-actions .btn {
  padding: 9px 16px;
  font-size: 12px;
}

@media (min-width: 480px) {
  .avatar-picker__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 360px) {
  .profile-hero {
    flex-wrap: wrap;
  }
}
</style>
