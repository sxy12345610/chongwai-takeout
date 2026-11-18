<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Eye } from 'lucide-vue-next'
import Pagination from '@/components/admin/Pagination.vue'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { useToast } from '@/composables/useToast'
import { formatDateTime, formatPrice } from '@/utils/format'

const { success, error: toastError } = useToast()

const page = ref(1)
const pageSize = 10
const filters = reactive({ status: '', merchantId: '', keyword: '' })

const { data, loading, error, run: load } = useAsync(async () =>
  adminApi.listOrders({
    page: page.value,
    pageSize,
    status: filters.status || undefined,
    merchantId: filters.merchantId || undefined,
    keyword: filters.keyword || undefined,
  }),
)
const { data: merchantPage } = useAsync(() => adminApi.listMerchants({ page: 1, pageSize: 100 }), { immediate: true })
const merchantOptions = computed(() => merchantPage.value?.list || [])

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待接单' },
  { value: 'preparing', label: '备餐中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

function applyFilters() {
  page.value = 1
  load()
}
function onPageChange(p) {
  page.value = p
  load()
}

const detail = ref(null)
const detailLoading = ref(false)
async function viewDetail(order) {
  detailLoading.value = true
  try {
    detail.value = await adminApi.getOrder(order.id)
  } catch (e) {
    toastError(e?.message || '加载详情失败')
  } finally {
    detailLoading.value = false
  }
}
function closeDetail() {
  detail.value = null
}

const acting = ref(false)
async function accept(order) {
  if (!window.confirm(`确认接单：${order.orderNo}？`)) return
  acting.value = true
  try {
    await adminApi.acceptOrder(order.id)
    success('已接单')
    load()
    if (detail.value?.id === order.id) detail.value = await adminApi.getOrder(order.id)
  } catch (e) {
    toastError(e?.message || '接单失败')
  } finally {
    acting.value = false
  }
}

const rejectTarget = ref(null)
const rejectReason = ref('')
function openReject(order) {
  rejectTarget.value = order
  rejectReason.value = ''
}
async function confirmReject() {
  if (!rejectReason.value.trim()) return
  acting.value = true
  try {
    await adminApi.rejectOrder(rejectTarget.value.id, rejectReason.value.trim())
    success('已拒单，库存已恢复')
    rejectTarget.value = null
    load()
  } catch (e) {
    toastError(e?.message || '拒单失败')
  } finally {
    acting.value = false
  }
}

async function complete(order) {
  if (!window.confirm(`确认完成订单：${order.orderNo}？`)) return
  acting.value = true
  try {
    await adminApi.completeOrder(order.id)
    success('订单已完成')
    load()
    if (detail.value?.id === order.id) detail.value = await adminApi.getOrder(order.id)
  } catch (e) {
    toastError(e?.message || '操作失败')
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <header class="admin-panel">
      <div class="admin-toolbar">
        <h2 class="admin-toolbar__title">订单管理</h2>
        <div class="admin-toolbar__actions">
          <select v-model="filters.status" class="admin-select" @change="applyFilters">
            <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <select v-model="filters.merchantId" class="admin-select" @change="applyFilters">
            <option value="">全部商家</option>
            <option v-for="m in merchantOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <div class="admin-search">
            <input v-model="filters.keyword" placeholder="订单号" @keyup.enter="applyFilters" />
          </div>
          <button class="admin-btn admin-btn--soft" type="button" @click="applyFilters">查询</button>
        </div>
      </div>
    </header>

    <section v-if="loading || !data" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载订单…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>订单加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <section v-else class="admin-panel">
      <div v-if="data.list.length === 0" class="admin-empty">
        <strong>暂无订单</strong>
        <p>没有符合条件的订单。</p>
      </div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>商家</th>
            <th>用户</th>
            <th>金额</th>
            <th>状态</th>
            <th>下单时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in data.list" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ order.merchantName || '—' }}</td>
            <td>{{ order.userName || '匿名' }}</td>
            <td>{{ formatPrice(order.total) }}</td>
            <td><span class="admin-tag" :class="`is-${order.status}`">{{ STATUS_OPTIONS.find((s) => s.value === order.status)?.label || order.status }}</span></td>
            <td>{{ formatDateTime(order.createdAt) }}</td>
            <td>
              <div class="admin-actions">
                <button class="admin-btn admin-btn--soft" type="button" @click="viewDetail(order)">
                  <Eye :size="11" /> 详情
                </button>
                <button v-if="order.status === 'pending'" class="admin-btn" type="button" :disabled="acting" @click="accept(order)">接单</button>
                <button v-if="order.status === 'pending'" class="admin-btn admin-btn--danger" type="button" @click="openReject(order)">拒单</button>
                <button v-if="order.status === 'preparing'" class="admin-btn" type="button" :disabled="acting" @click="complete(order)">完成</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination
        :page="page"
        :page-size="pageSize"
        :total="data.total || 0"
        @update:page="onPageChange"
      />
    </section>

    <div v-if="detail" class="admin-modal" @click.self="closeDetail">
      <div class="admin-modal__backdrop"></div>
      <div class="admin-modal__panel admin-modal__panel--wide">
        <div class="admin-modal__head">
          <h2>订单详情 · {{ detail.orderNo }}</h2>
          <button class="admin-modal__close" type="button" @click="closeDetail">×</button>
        </div>
        <div v-if="detailLoading" class="admin-loading"><span class="admin-spinner"></span></div>
        <template v-else>
          <div class="admin-order-detail">
            <div class="admin-order-detail__row">
              <span>商家</span><strong>{{ detail.merchantName }}</strong>
              <span>用户</span><strong>{{ detail.userName }}（{{ detail.userPhone }}）</strong>
              <span>状态</span><strong>{{ detail.status }}</strong>
            </div>
            <div class="admin-order-detail__row">
              <span>收货地址</span><strong>{{ detail.address }}</strong>
              <span>联系人</span><strong>{{ detail.contactName }} {{ detail.contactPhone }}</strong>
            </div>
            <table class="admin-table">
              <thead>
                <tr><th>商品</th><th>单价</th><th>数量</th><th>小计</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in detail.items" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td>{{ formatPrice(item.price) }}</td>
                  <td>×{{ item.quantity }}</td>
                  <td>{{ formatPrice(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="admin-order-totals">
              <p>商品小计：{{ formatPrice(detail.subtotal) }}</p>
              <p>配送费：{{ formatPrice(detail.deliveryFee) }}</p>
              <p v-if="detail.discount > 0">优惠：-{{ formatPrice(detail.discount) }}</p>
              <p class="is-total">实付：{{ formatPrice(detail.total) }}</p>
            </div>
            <p v-if="detail.note">备注：{{ detail.note }}</p>
            <p v-if="detail.cancelReason" class="is-cancel">取消原因：{{ detail.cancelReason }}</p>
          </div>
          <div class="admin-modal__actions">
            <button v-if="detail.status === 'pending'" type="button" class="admin-btn" :disabled="acting" @click="accept(detail)">接单</button>
            <button v-if="detail.status === 'pending'" type="button" class="admin-btn admin-btn--danger" @click="openReject(detail)">拒单</button>
            <button v-if="detail.status === 'preparing'" type="button" class="admin-btn" :disabled="acting" @click="complete(detail)">完成订单</button>
            <button type="button" class="admin-btn admin-btn--soft" @click="closeDetail">关闭</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="rejectTarget" class="admin-modal" @click.self="rejectTarget = null">
      <div class="admin-modal__backdrop"></div>
      <div class="admin-modal__panel">
        <div class="admin-modal__head">
          <h2>拒单：{{ rejectTarget.orderNo }}</h2>
          <button class="admin-modal__close" type="button" @click="rejectTarget = null">×</button>
        </div>
        <label class="admin-field">
          <span>拒单原因（必填，将通知用户并恢复库存）</span>
          <textarea v-model="rejectReason" rows="3" placeholder="如：食材不足 / 已打烊"></textarea>
        </label>
        <div class="admin-modal__actions">
          <button type="button" class="admin-btn admin-btn--soft" @click="rejectTarget = null">取消</button>
          <button type="button" class="admin-btn admin-btn--danger" :disabled="acting" @click="confirmReject">
            {{ acting ? '提交中…' : '确认拒单' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-select {
  padding: 0 10px;
  border: 1px solid #dce8f4;
  border-radius: 9px;
  background-color: #fbfdff;
  font-size: 11.5px;
  height: 34px;
}
.admin-modal__panel--wide {
  max-width: 640px;
}
.admin-order-detail {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}
.admin-order-detail__row {
  display: grid;
  grid-template-columns: 70px 1fr 70px 1fr 70px 1fr;
  gap: 6px;
  align-items: center;
  font-size: 11.5px;
}
.admin-order-detail__row span {
  color: var(--text-secondary);
}
.admin-order-totals {
  display: grid;
  justify-items: end;
  gap: 3px;
  margin-top: 8px;
  font-size: 11.5px;
}
.admin-order-totals .is-total {
  color: var(--brand-primary);
  font-size: 14px;
  font-weight: 800;
}
.is-cancel {
  color: #c0392b;
  font-size: 11px;
}
</style>
