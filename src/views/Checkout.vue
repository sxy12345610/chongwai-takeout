<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  MapPin,
  NotebookPen,
  Phone,
  ShoppingBag,
  Store,
  Ticket,
  Truck,
  User,
} from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import {
  cartItems,
  removeCartItems,
  selectedCartItems,
  selectedCount,
  selectedTotal,
} from '@/utils/cart'
import {
  calculateDiscount,
  createOrdersFromItems,
  getMerchantDeliveryFee,
} from '@/utils/orders'
import { formatPrice } from '@/utils/format'
import {
  addresses,
  defaultAddress,
  formatAddress,
  getAddressById,
} from '@/utils/addresses'

const form = reactive({
  name: '',
  phone: '',
  address: '',
  note: '',
})

const errors = reactive({
  name: '',
  phone: '',
  address: '',
  items: '',
})

const submittedOrders = ref(null)

// 默认优先使用已保存的默认地址，没有地址时进入手动填写
const selectedAddressId = ref(defaultAddress.value?.id || '')
const usingManual = ref(!defaultAddress.value)
const selectedAddress = computed(() => getAddressById(selectedAddressId.value))

function chooseAddress(address) {
  selectedAddressId.value = address.id
  usingManual.value = false
  errors.name = ''
  errors.phone = ''
  errors.address = ''
}

function chooseManual() {
  usingManual.value = true
  selectedAddressId.value = ''
  errors.address = ''
}

/** 按商家分组，配送费与优惠均按单个商家独立计算。 */
const groups = computed(() => {
  const map = new Map()

  selectedCartItems.value.forEach((item) => {
    if (!map.has(item.merchantId)) {
      map.set(item.merchantId, {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        items: [],
        subtotal: 0,
      })
    }

    const group = map.get(item.merchantId)
    group.items.push(item)
    group.subtotal += item.price * item.quantity
  })

  return Array.from(map.values()).map((group) => {
    const subtotal = Math.round(group.subtotal * 100) / 100
    const deliveryFee = getMerchantDeliveryFee(group.merchantId)
    const discount = calculateDiscount(subtotal)
    return {
      ...group,
      subtotal,
      deliveryFee,
      discount,
      total: Math.round((subtotal + deliveryFee - discount) * 100) / 100,
    }
  })
})

const totals = computed(() => {
  const subtotal = groups.value.reduce((sum, group) => sum + group.subtotal, 0)
  const deliveryFee = groups.value.reduce(
    (sum, group) => sum + group.deliveryFee,
    0,
  )
  const discount = groups.value.reduce((sum, group) => sum + group.discount, 0)
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    payable: Math.round((subtotal + deliveryFee - discount) * 100) / 100,
  }
})

function clearError(field) {
  errors[field] = ''
}

function validate() {
  if (usingManual.value) {
    const name = form.name.trim()
    const phone = form.phone.trim()
    const address = form.address.trim()

    errors.name = name ? '' : '请填写收货人姓名'
    errors.phone = !phone
      ? '请填写联系电话'
      : /^1[3-9]\d{9}$/.test(phone)
        ? ''
        : '请输入 11 位有效手机号'
    errors.address = address ? '' : '请填写收货地址'
  } else {
    errors.name = ''
    errors.phone = ''
    errors.address = selectedAddress.value ? '' : '请选择收货地址'
  }

  errors.items =
    selectedCartItems.value.length &&
    selectedCartItems.value.every((item) => item.quantity > 0)
      ? ''
      : '购物车中没有可结算的商品'

  return !Object.values(errors).some(Boolean)
}

function handleSubmit() {
  if (!validate()) return

  const itemsToCheckout = selectedCartItems.value.map((item) => ({ ...item }))
  const customer = usingManual.value
    ? {
        contactName: form.name,
        phone: form.phone,
        address: form.address,
      }
    : {
        contactName: selectedAddress.value.contactName,
        phone: selectedAddress.value.phone,
        address: formatAddress(selectedAddress.value),
      }

  const created = createOrdersFromItems(itemsToCheckout, {
    ...customer,
    note: form.note,
  })
  removeCartItems(itemsToCheckout)

  submittedOrders.value = created
}
</script>

<template>
  <div v-if="submittedOrders" class="page container">
    <section class="success card">
      <span class="success__icon">
        <CheckCircle2 :size="34" :stroke-width="1.8" />
      </span>
      <h1>订单提交成功</h1>
      <p>
        已按商家生成 {{ submittedOrders.length }} 笔独立订单，当前为模拟支付，未接入真实支付。
      </p>

      <ul class="success__orders">
        <li
          v-for="order in submittedOrders"
          :key="order.id"
          class="success__order"
        >
          <div>
            <strong>{{ order.merchantName }}</strong>
            <span>{{ order.orderNo }}</span>
          </div>
          <div class="success__order-right">
            <span>{{ formatPrice(order.total) }}</span>
            <RouterLink :to="`/order/${order.id}`">查看详情</RouterLink>
          </div>
        </li>
      </ul>

      <p v-if="cartItems.length" class="success__remain">
        购物车中还有 {{ cartItems.length }} 种未结算商品，已为你保留。
      </p>

      <div class="success__actions">
        <RouterLink to="/orders" class="btn btn--primary">查看我的订单</RouterLink>
        <RouterLink to="/shops" class="btn btn--soft">继续点餐</RouterLink>
      </div>
    </section>
  </div>

  <div v-else-if="!selectedCartItems.length" class="page container">
    <EmptyState
      :icon="ShoppingBag"
      title="没有待结算的商品"
      description="请先在购物车中勾选商品，再进入确认订单页面。"
    >
      <RouterLink to="/cart" class="btn btn--primary">返回购物车</RouterLink>
    </EmptyState>
  </div>

  <div v-else class="page container checkout-page">
    <header class="page-head">
      <div>
        <RouterLink to="/cart" class="checkout-back">
          <ArrowLeft :size="15" />
          返回购物车
        </RouterLink>
        <h1 class="page-head__title">确认订单</h1>
        <p class="page-head__desc">
          共 {{ selectedCount }} 件商品，商品金额 {{ formatPrice(selectedTotal) }}。
        </p>
      </div>
    </header>

    <div class="checkout-layout">
      <div class="checkout-main">
        <section class="card checkout-section">
          <div class="section-title">
            <MapPin :size="17" />
            <h2>收货地址</h2>
            <RouterLink to="/address">管理地址</RouterLink>
          </div>

          <div v-if="addresses.length" class="saved-addresses">
            <label
              v-for="address in addresses"
              :key="address.id"
              class="saved-address"
              :class="{
                'is-active': !usingManual && selectedAddressId === address.id,
              }"
            >
              <input
                type="radio"
                name="checkout-address"
                :checked="!usingManual && selectedAddressId === address.id"
                @change="chooseAddress(address)"
              />
              <span class="saved-address__body">
                <span class="saved-address__person">
                  <strong>{{ address.contactName }}</strong>
                  <span>{{ address.phone }}</span>
                  <em v-if="address.isDefault" class="default-tag">默认</em>
                </span>
                <span class="saved-address__text">
                  {{ formatAddress(address) }}
                </span>
              </span>
              <span class="saved-address__check">
                <Check :size="11" :stroke-width="3" />
              </span>
            </label>

            <label
              class="saved-address saved-address--manual"
              :class="{ 'is-active': usingManual }"
            >
              <input
                type="radio"
                name="checkout-address"
                :checked="usingManual"
                @change="chooseManual"
              />
              <span class="saved-address__body">
                <span class="saved-address__person">
                  <strong>手动填写新地址</strong>
                </span>
                <span class="saved-address__text">
                  本次订单使用临时地址，不会保存到地址簿
                </span>
              </span>
              <span class="saved-address__check">
                <Check :size="11" :stroke-width="3" />
              </span>
            </label>
          </div>

          <p v-else class="no-address">
            还没有保存的地址，可以直接填写，或先
            <RouterLink to="/address">添加地址</RouterLink>。
          </p>

          <p v-if="errors.address" class="field__error saved-address__error">
            {{ errors.address }}
          </p>

          <div v-if="usingManual" class="manual-fields">
            <div class="field-grid">
              <label class="field">
                <span class="field__label">
                  <User :size="14" />
                  收货人姓名
                </span>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="请输入收货人姓名"
                  :class="{ 'has-error': errors.name }"
                  @input="clearError('name')"
                />
                <span v-if="errors.name" class="field__error">
                  {{ errors.name }}
                </span>
              </label>

              <label class="field">
                <span class="field__label">
                  <Phone :size="14" />
                  联系电话
                </span>
                <input
                  v-model="form.phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="11"
                  placeholder="请输入 11 位手机号"
                  :class="{ 'has-error': errors.phone }"
                  @input="clearError('phone')"
                />
                <span v-if="errors.phone" class="field__error">
                  {{ errors.phone }}
                </span>
              </label>
            </div>

            <label class="field">
              <span class="field__label">
                <MapPin :size="14" />
                收货地址
              </span>
              <input
                v-model="form.address"
                type="text"
                placeholder="如：重庆外语外事学院 3 号宿舍楼 502"
                :class="{ 'has-error': errors.address }"
                @input="clearError('address')"
              />
            </label>
          </div>

          <label class="field">
            <span class="field__label">
              <NotebookPen :size="14" />
              订单备注
            </span>
            <textarea
              v-model="form.note"
              rows="2"
              placeholder="选填，如：少辣、放门口、送达后电话联系"
            ></textarea>
          </label>
        </section>

        <section
          v-for="group in groups"
          :key="group.merchantId"
          class="card checkout-section"
        >
          <div class="section-title section-title--merchant">
            <Store :size="17" />
            <h2>{{ group.merchantName }}</h2>
            <RouterLink :to="`/shop/${group.merchantId}`">进店看看</RouterLink>
          </div>

          <ul class="checkout-items">
            <li v-for="item in group.items" :key="item.id" class="checkout-item">
              <div class="checkout-item__media">
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="`${item.name}图片`"
                  loading="lazy"
                />
              </div>
              <div class="checkout-item__info">
                <h3>{{ item.name }}</h3>
                <p>{{ formatPrice(item.price) }} × {{ item.quantity }}</p>
              </div>
              <strong>{{ formatPrice(item.price * item.quantity) }}</strong>
            </li>
          </ul>

          <div class="checkout-fees">
            <p>
              <Truck :size="13" />
              配送费
              <span>{{ formatPrice(group.deliveryFee) }}</span>
            </p>
            <p>
              <Ticket :size="13" />
              优惠
              <span :class="{ 'is-discount': group.discount > 0 }">
                {{ group.discount > 0 ? `-${formatPrice(group.discount)}` : '无优惠' }}
              </span>
            </p>
            <p class="checkout-fees__total">
              本店应付
              <strong>{{ formatPrice(group.total) }}</strong>
            </p>
          </div>
        </section>
      </div>

      <aside class="checkout-aside">
        <section class="card checkout-summary">
          <div class="section-title">
            <CreditCard :size="17" />
            <h2>金额明细</h2>
          </div>

          <dl class="summary-list">
            <div>
              <dt>商品总金额</dt>
              <dd>{{ formatPrice(totals.subtotal) }}</dd>
            </div>
            <div>
              <dt>配送费</dt>
              <dd>{{ formatPrice(totals.deliveryFee) }}</dd>
            </div>
            <div>
              <dt>优惠金额</dt>
              <dd :class="{ 'is-discount': totals.discount > 0 }">
                {{ totals.discount > 0 ? `-${formatPrice(totals.discount)}` : '¥0' }}
              </dd>
            </div>
            <div class="summary-list__payable">
              <dt>实际支付</dt>
              <dd>{{ formatPrice(totals.payable) }}</dd>
            </div>
          </dl>

          <p class="summary-hint">
            单个商家商品满 30 元减 3 元；本单将拆分为 {{ groups.length }} 笔商家订单。
          </p>

          <p v-if="errors.items" class="summary-error">{{ errors.items }}</p>

          <button
            type="button"
            class="btn btn--primary summary-submit"
            @click="handleSubmit"
          >
            提交订单（模拟支付）
          </button>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.checkout-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: var(--brand-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.checkout-layout {
  display: grid;
  gap: 16px;
}

.checkout-main {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.checkout-section {
  padding: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 13px;
  color: var(--brand-primary);
}

.section-title h2 {
  color: var(--text-primary);
  font-size: 14.5px;
  font-weight: 750;
}

.section-title a {
  margin-left: auto;
  color: var(--brand-secondary);
  font-size: 11px;
  font-weight: 600;
}

/* 表单 */
.field-grid {
  display: grid;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.field-grid .field {
  margin-bottom: 0;
}

.field__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.field input,
.field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dfeaf6;
  border-radius: 11px;
  background-color: #f9fcff;
  font-size: 13px;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--brand-secondary);
  box-shadow: 0 0 0 3px rgba(40, 120, 200, 0.09);
}

.field input.has-error {
  border-color: #d98b8b;
  background-color: #fffafa;
}

.field__error {
  color: #c25b5b;
  font-size: 10.5px;
}

/* 已保存地址选择 */
.saved-addresses {
  display: grid;
  gap: 8px;
}

.saved-address {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid #e2edf7;
  border-radius: 13px;
  background-color: #fbfdff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.saved-address:hover {
  border-color: #cfe3f5;
}

.saved-address.is-active {
  border-color: var(--brand-secondary);
  background-color: #f4faff;
  box-shadow: 0 6px 16px rgba(23, 105, 170, 0.08);
}

.saved-address input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.saved-address__body {
  flex: 1;
  min-width: 0;
}

.saved-address__person {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.saved-address__person strong {
  font-size: 12.5px;
  font-weight: 700;
}

.saved-address__person span {
  color: var(--text-secondary);
  font-size: 10.5px;
}

.default-tag {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
}

.saved-address__text {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 10.5px;
  line-height: 1.6;
}

.saved-address__check {
  display: grid;
  flex: none;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 1.5px solid #cfdde9;
  border-radius: 50%;
  background-color: #ffffff;
  color: transparent;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.saved-address.is-active .saved-address__check {
  border-color: var(--brand-primary);
  background-color: var(--brand-primary);
  color: #ffffff;
}

.saved-address--manual .saved-address__person strong {
  color: var(--brand-secondary);
}

.no-address {
  padding: 11px 12px;
  border-radius: 12px;
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 11px;
  line-height: 1.7;
}

.no-address a {
  font-weight: 700;
  text-decoration: underline;
}

.manual-fields {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-soft);
}

.saved-address__error {
  margin-top: 6px;
}

/* 商品清单 */
.checkout-items {
  display: grid;
  gap: 10px;
}

.checkout-item {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.checkout-item__media {
  position: relative;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.checkout-item__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.checkout-item__info h3 {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.checkout-item__info p {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.checkout-item > strong {
  color: var(--brand-primary);
  font-size: 12.5px;
  font-weight: 750;
  white-space: nowrap;
}

.checkout-fees {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px dashed var(--border-soft);
  color: var(--text-secondary);
  font-size: 10.5px;
}

.checkout-fees p {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.checkout-fees p span {
  color: var(--text-primary);
  font-weight: 600;
}

.checkout-fees p span.is-discount {
  color: #d9743f;
}

.checkout-fees__total {
  margin-left: auto;
  color: var(--text-secondary);
}

.checkout-fees__total strong {
  color: var(--brand-primary);
  font-size: 14px;
  font-weight: 800;
}

/* 金额明细 */
.checkout-summary {
  padding: 16px;
}

.summary-list {
  display: grid;
  gap: 9px;
  margin: 0;
}

.summary-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.summary-list dt {
  color: var(--text-secondary);
  font-size: 11.5px;
}

.summary-list dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 650;
}

.summary-list dd.is-discount {
  color: #d9743f;
}

.summary-list__payable {
  margin-top: 3px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.summary-list__payable dt {
  color: var(--text-primary);
  font-weight: 700;
}

.summary-list__payable dd {
  color: var(--brand-primary);
  font-size: 21px;
  font-weight: 800;
}

.summary-hint {
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 10px;
  line-height: 1.6;
}

.summary-error {
  margin-top: 9px;
  color: #c25b5b;
  font-size: 11px;
}

.summary-submit {
  width: 100%;
  margin-top: 12px;
}

.summary-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 提交成功 */
.success {
  max-width: 640px;
  margin: 18px auto 0;
  padding: 28px 22px;
  text-align: center;
}

.success__icon {
  display: inline-grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  border-radius: 20px;
  background-color: #e8f7f1;
  color: #218365;
}

.success h1 {
  font-size: 21px;
  font-weight: 800;
}

.success > p {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.success__orders {
  display: grid;
  gap: 9px;
  margin-top: 18px;
  text-align: left;
}

.success__order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px;
  border: 1px solid var(--border-soft);
  border-radius: 13px;
  background-color: #fbfdff;
}

.success__order strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.success__order span {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 10px;
}

.success__order-right {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.success__order-right span {
  color: var(--brand-primary);
  font-size: 14px;
  font-weight: 800;
}

.success__order-right a {
  color: var(--brand-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.success__remain {
  margin-top: 12px;
  font-size: 11px;
}

.success__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

@media (min-width: 700px) {
  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .checkout-section {
    padding: 20px;
  }

  .checkout-summary {
    padding: 20px;
  }
}

@media (min-width: 960px) {
  .checkout-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
  }

  .checkout-aside {
    position: sticky;
    top: calc(var(--header-height) + 16px);
  }
}
</style>
