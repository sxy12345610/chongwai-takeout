<script setup>
import { onMounted, reactive, ref } from 'vue'
import { AlertCircle, Clock, Pencil, Plus, Star, Store } from 'lucide-vue-next'
import Pagination from '@/components/admin/Pagination.vue'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { useToast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'

const { success, error: toastError } = useToast()

const page = ref(1)
const pageSize = 8
const keyword = ref('')

const { data, loading, error, run: load } = useAsync(async () =>
  adminApi.listMerchants({ page: page.value, pageSize, keyword: keyword.value || undefined }),
)

function onSearch() {
  page.value = 1
  load()
}
function onPageChange(p) {
  page.value = p
  load()
}

const editing = ref(null)
const form = reactive({ name: '', announcement: '', minOrder: 0, deliveryTime: 30 })
const formError = ref('')
const submitting = ref(false)

function openEdit(merchant) {
  editing.value = merchant
  form.name = merchant.name
  form.announcement = merchant.announcement || ''
  form.minOrder = merchant.minOrder
  form.deliveryTime = merchant.deliveryTime
  formError.value = ''
}
function closeEdit() {
  editing.value = null
}

async function saveEdit() {
  if (!form.name.trim()) {
    formError.value = '店铺名称不能为空'
    return
  }
  if (form.minOrder < 0) {
    formError.value = '起送价不能小于 0'
    return
  }
  submitting.value = true
  try {
    await adminApi.updateMerchant(editing.value.id, {
      name: form.name.trim(),
      announcement: form.announcement.trim() || null,
      minOrder: Number(form.minOrder),
      deliveryTime: Number(form.deliveryTime),
    })
    success('店铺信息已更新')
    closeEdit()
    load()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

async function toggleOpen(merchant) {
  try {
    await adminApi.updateMerchant(merchant.id, { isOpen: !merchant.isOpen })
    success(merchant.isOpen ? '已打烊' : '已营业')
    load()
  } catch (e) {
    toastError(e?.message || '操作失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <header class="admin-panel">
      <div class="admin-toolbar">
        <h2 class="admin-toolbar__title">店铺管理</h2>
        <div class="admin-search">
          <input v-model="keyword" placeholder="搜索店铺名称" @keyup.enter="onSearch" />
          <button type="button" class="admin-btn admin-btn--soft" @click="onSearch">搜索</button>
        </div>
      </div>
    </header>

    <section v-if="loading || !data" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载店铺…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>店铺加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <template v-else>
      <div v-if="data.list.length === 0" class="admin-empty">
        <strong>暂无店铺</strong>
        <p>没有符合条件的商家数据。</p>
      </div>
      <div v-else class="admin-card-grid">
        <article v-for="merchant in data.list" :key="merchant.id" class="admin-card-merchant">
          <div class="admin-merchant-cover" :style="{ background: `linear-gradient(135deg, ${merchant.cover?.from || '#1769aa'}, ${merchant.cover?.to || '#4e9fdf'})` }">
            <img v-if="merchant.image" :src="merchant.image" :alt="merchant.name" />
            <button
              type="button"
              class="admin-merchant-toggle"
              :class="{ 'is-open': merchant.isOpen }"
              @click="toggleOpen(merchant)"
            >
              {{ merchant.isOpen ? '营业中' : '已打烊' }}
            </button>
          </div>
          <div class="admin-merchant-body">
            <div class="admin-merchant-title">
              <div>
                <h3>{{ merchant.name }}</h3>
                <p>{{ merchant.categoryLabel || '综合商家' }} · {{ merchant.status }}</p>
              </div>
              <button type="button" class="admin-btn admin-btn--soft" @click="openEdit(merchant)">
                <Pencil :size="12" /> 编辑
              </button>
            </div>
            <p v-if="merchant.announcement" class="admin-merchant-announcement">
              {{ merchant.announcement }}
            </p>
            <div class="admin-merchant-meta">
              <span><Star :size="11" /> {{ merchant.rating?.toFixed(1) }}</span>
              <span>月售 {{ merchant.monthlySales }}</span>
              <span>起送 {{ formatPrice(merchant.minOrder) }}</span>
              <span><Clock :size="11" /> {{ merchant.deliveryTime }} 分钟</span>
            </div>
          </div>
        </article>
      </div>

      <Pagination
        :page="page"
        :page-size="pageSize"
        :total="data.total || 0"
        @update:page="onPageChange"
      />
    </template>

    <div v-if="editing" class="admin-modal" @click.self="closeEdit">
      <div class="admin-modal__backdrop"></div>
      <div class="admin-modal__panel">
        <div class="admin-modal__head">
          <h2>编辑店铺：{{ editing.name }}</h2>
          <button class="admin-modal__close" type="button" @click="closeEdit">×</button>
        </div>
        <div class="admin-form-grid">
          <label class="admin-field">
            <span>店铺名称</span>
            <input v-model="form.name" />
          </label>
          <label class="admin-field">
            <span>平均配送时间（分钟）</span>
            <input v-model.number="form.deliveryTime" type="number" min="1" />
          </label>
        </div>
        <label class="admin-field">
          <span>店铺公告</span>
          <textarea v-model="form.announcement" rows="2"></textarea>
        </label>
        <label class="admin-field">
          <span>起送价（元）</span>
          <input v-model.number="form.minOrder" type="number" min="0" step="0.01" />
        </label>
        <p v-if="formError" class="admin-modal__error">{{ formError }}</p>
        <div class="admin-modal__actions">
          <button type="button" class="admin-btn admin-btn--soft" @click="closeEdit">取消</button>
          <button type="button" class="admin-btn" :disabled="submitting" @click="saveEdit">
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
