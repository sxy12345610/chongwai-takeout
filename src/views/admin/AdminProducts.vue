<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import Pagination from '@/components/admin/Pagination.vue'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { useToast } from '@/composables/useToast'
import { formatPrice } from '@/utils/format'

const { success, error: toastError } = useToast()

const page = ref(1)
const pageSize = 10
const filters = reactive({ keyword: '', merchantId: '', isAvailable: '' })

const { data, loading, error, run: load } = useAsync(async () =>
  adminApi.listProducts({
    page: page.value,
    pageSize,
    keyword: filters.keyword || undefined,
    merchantId: filters.merchantId || undefined,
    isAvailable: filters.isAvailable || undefined,
  }),
)

const { data: merchantPage } = useAsync(() => adminApi.listMerchants({ page: 1, pageSize: 100 }), { immediate: true })
const merchantOptions = computed(() => merchantPage.value?.list || [])

function applyFilters() {
  page.value = 1
  load()
}
function resetFilters() {
  filters.keyword = ''
  filters.merchantId = ''
  filters.isAvailable = ''
  applyFilters()
}
function onPageChange(p) {
  page.value = p
  load()
}

const showModal = ref(false)
const editingId = ref(null)
const form = reactive({
  merchantId: '',
  name: '',
  price: 0,
  stock: 0,
  menuCategory: '',
  description: '',
  image: '',
  isAvailable: true,
  isHot: false,
})
const formError = ref('')
const submitting = ref(false)

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    merchantId: merchantOptions.value[0]?.id || '',
    name: '',
    price: 0,
    stock: 0,
    menuCategory: '',
    description: '',
    image: '',
    isAvailable: true,
    isHot: false,
  })
  formError.value = ''
  showModal.value = true
}
function openEdit(product) {
  editingId.value = product.id
  Object.assign(form, {
    merchantId: product.merchantId,
    name: product.name,
    price: product.price,
    stock: product.stock,
    menuCategory: product.menuCategory || '',
    description: product.description || '',
    image: product.image || '',
    isAvailable: product.isAvailable,
    isHot: product.isHot,
  })
  formError.value = ''
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}

async function submitForm() {
  if (!form.merchantId) return (formError.value = '请选择所属商家')
  if (!form.name.trim()) return (formError.value = '商品名称不能为空')
  if (!(form.price > 0)) return (formError.value = '售价必须大于 0')
  if (form.stock < 0) return (formError.value = '库存不能为负')
  submitting.value = true
  try {
    if (editingId.value) {
      await adminApi.updateProduct(editingId.value, { ...form })
      success('商品已更新')
    } else {
      await adminApi.createProduct({ ...form })
      success('商品已创建')
    }
    closeModal()
    load()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

async function toggleAvailable(product) {
  try {
    await adminApi.updateProduct(product.id, { isAvailable: !product.isAvailable })
    success(product.isAvailable ? '已下架' : '已上架')
    load()
  } catch (e) {
    toastError(e?.message || '操作失败')
  }
}

async function removeProduct(product) {
  if (!window.confirm(`确定删除商品「${product.name}」？删除后历史订单仍保留快照。`)) return
  try {
    await adminApi.deleteProduct(product.id)
    success('商品已删除')
    load()
  } catch (e) {
    toastError(e?.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <header class="admin-panel">
      <div class="admin-toolbar">
        <h2 class="admin-toolbar__title">商品管理</h2>
        <div class="admin-toolbar__actions">
          <div class="admin-search">
            <Search :size="12" />
            <input v-model="filters.keyword" placeholder="搜索商品名称" @keyup.enter="applyFilters" />
          </div>
          <select v-model="filters.merchantId" class="admin-select" @change="applyFilters">
            <option value="">全部商家</option>
            <option v-for="m in merchantOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <select v-model="filters.isAvailable" class="admin-select" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="true">已上架</option>
            <option value="false">已下架</option>
          </select>
          <button class="admin-btn admin-btn--soft" type="button" @click="resetFilters">重置</button>
          <button class="admin-btn" type="button" @click="openCreate">
            <Plus :size="12" /> 新增商品
          </button>
        </div>
      </div>
    </header>

    <section v-if="loading || !data" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载商品…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>商品加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <section v-else class="admin-panel">
      <div v-if="data.list.length === 0" class="admin-empty">
        <strong>暂无商品</strong>
        <p>没有符合条件的商品。</p>
      </div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>商品</th>
            <th>所属商家</th>
            <th>分类</th>
            <th>售价</th>
            <th>库存</th>
            <th>月售</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in data.list" :key="product.id">
            <td>
              <div class="admin-product-cell">
                <span class="admin-thumb"><img v-if="product.image" :src="product.image" :alt="product.name" /></span>
                <div>
                  <strong>{{ product.name }}</strong>
                  <small>{{ product.menuCategory || '未分组' }}</small>
                </div>
              </div>
            </td>
            <td>{{ product.merchantName }}</td>
            <td>{{ product.categoryName || '—' }}</td>
            <td>{{ formatPrice(product.price) }}</td>
            <td :class="{ 'is-low': product.stock <= 5 }">{{ product.stock }}</td>
            <td>{{ product.monthlySales }}</td>
            <td>
              <span class="admin-tag" :class="product.isAvailable ? 'is-active' : 'is-off'">
                {{ product.isAvailable ? '已上架' : '已下架' }}
              </span>
            </td>
            <td>
              <div class="admin-actions">
                <button class="admin-btn admin-btn--soft" type="button" @click="toggleAvailable(product)">
                  {{ product.isAvailable ? '下架' : '上架' }}
                </button>
                <button class="admin-btn admin-btn--soft" type="button" @click="openEdit(product)">
                  <Pencil :size="11" /> 编辑
                </button>
                <button class="admin-btn admin-btn--danger" type="button" @click="removeProduct(product)">
                  <Trash2 :size="11" />
                </button>
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

    <div v-if="showModal" class="admin-modal" @click.self="closeModal">
      <div class="admin-modal__backdrop"></div>
      <div class="admin-modal__panel">
        <div class="admin-modal__head">
          <h2>{{ editingId ? '编辑商品' : '新增商品' }}</h2>
          <button class="admin-modal__close" type="button" @click="closeModal">×</button>
        </div>
        <div class="admin-form-grid">
          <label class="admin-field">
            <span>所属商家</span>
            <select v-model="form.merchantId">
              <option value="" disabled>请选择商家</option>
              <option v-for="m in merchantOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <label class="admin-field">
            <span>商品名称</span>
            <input v-model="form.name" />
          </label>
          <label class="admin-field">
            <span>售价（元）</span>
            <input v-model.number="form.price" type="number" min="0" step="0.01" />
          </label>
          <label class="admin-field">
            <span>库存</span>
            <input v-model.number="form.stock" type="number" min="0" step="1" />
          </label>
          <label class="admin-field">
            <span>菜单分组</span>
            <input v-model="form.menuCategory" placeholder="如：招牌、主食" />
          </label>
          <label class="admin-field">
            <span>图片 URL（可选）</span>
            <input v-model="form.image" />
          </label>
        </div>
        <label class="admin-field">
          <span>商品描述</span>
          <textarea v-model="form.description" rows="2"></textarea>
        </label>
        <div class="admin-form-grid">
          <label class="admin-checkbox">
            <input v-model="form.isAvailable" type="checkbox" /> 上架销售
          </label>
          <label class="admin-checkbox">
            <input v-model="form.isHot" type="checkbox" /> 标记为热销
          </label>
        </div>
        <p v-if="formError" class="admin-modal__error">{{ formError }}</p>
        <div class="admin-modal__actions">
          <button type="button" class="admin-btn admin-btn--soft" @click="closeModal">取消</button>
          <button type="button" class="admin-btn" :disabled="submitting" @click="submitForm">
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-product-cell strong {
  display: block;
  font-size: 11.5px;
}
.admin-product-cell small {
  color: var(--text-secondary);
  font-size: 9.5px;
}
td.is-low {
  color: #c0392b;
  font-weight: 700;
}
.admin-select {
  padding: 0 10px;
  border: 1px solid #dce8f4;
  border-radius: 9px;
  background-color: #fbfdff;
  font-size: 11.5px;
  height: 34px;
}
</style>
