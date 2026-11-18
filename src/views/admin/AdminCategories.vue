<script setup>
import { onMounted, reactive, ref } from 'vue'
import { Pencil, Plus } from 'lucide-vue-next'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { useToast } from '@/composables/useToast'

const { success, error: toastError } = useToast()

const { data: categories, loading, error, run: load } = useAsync(() => adminApi.listCategories())

const showModal = ref(false)
const editingId = ref(null)
const form = reactive({ key: '', name: '', sortOrder: 0, isActive: true })
const formError = ref('')
const submitting = ref(false)

function openCreate() {
  editingId.value = null
  Object.assign(form, { key: '', name: '', sortOrder: 0, isActive: true })
  formError.value = ''
  showModal.value = true
}
function openEdit(cat) {
  editingId.value = cat.id
  Object.assign(form, { key: cat.key, name: cat.name, sortOrder: cat.sortOrder, isActive: cat.isActive })
  formError.value = ''
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}

async function submitForm() {
  if (!editingId.value && !form.key.trim()) return (formError.value = '分类 key 不能为空')
  if (!form.name.trim()) return (formError.value = '分类名称不能为空')
  submitting.value = true
  try {
    if (editingId.value) {
      await adminApi.updateCategory(editingId.value, {
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      })
      success('分类已更新')
    } else {
      await adminApi.createCategory({
        key: form.key.trim(),
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      })
      success('分类已创建')
    }
    closeModal()
    load()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <header class="admin-panel">
      <div class="admin-toolbar">
        <h2 class="admin-toolbar__title">分类管理</h2>
        <div class="admin-toolbar__actions">
          <button class="admin-btn" type="button" @click="openCreate">
            <Plus :size="12" /> 新增分类
          </button>
        </div>
      </div>
    </header>

    <section v-if="loading" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载分类…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>分类加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <section v-else class="admin-panel">
      <div v-if="!categories || categories.length === 0" class="admin-empty">
        <strong>暂无分类</strong>
        <p>点击右上角新增分类。</p>
      </div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>分类 Key</th>
            <th>分类名称</th>
            <th>排序</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat.id">
            <td><code>{{ cat.key }}</code></td>
            <td>{{ cat.name }}</td>
            <td>{{ cat.sortOrder }}</td>
            <td>
              <span class="admin-tag" :class="cat.isActive ? 'is-active' : 'is-off'">
                {{ cat.isActive ? '启用' : '停用' }}
              </span>
            </td>
            <td>
              <div class="admin-actions">
                <button class="admin-btn admin-btn--soft" type="button" @click="openEdit(cat)">
                  <Pencil :size="11" /> 编辑
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="showModal" class="admin-modal" @click.self="closeModal">
      <div class="admin-modal__backdrop"></div>
      <div class="admin-modal__panel">
        <div class="admin-modal__head">
          <h2>{{ editingId ? '编辑分类' : '新增分类' }}</h2>
          <button class="admin-modal__close" type="button" @click="closeModal">×</button>
        </div>
        <div class="admin-form-grid">
          <label class="admin-field">
            <span>分类 Key（唯一，创建后不可改）</span>
            <input v-model="form.key" :disabled="!!editingId" placeholder="如：rice" />
          </label>
          <label class="admin-field">
            <span>分类名称</span>
            <input v-model="form.name" />
          </label>
          <label class="admin-field">
            <span>排序值（小在前）</span>
            <input v-model.number="form.sortOrder" type="number" step="1" />
          </label>
        </div>
        <label class="admin-checkbox">
          <input v-model="form.isActive" type="checkbox" /> 启用该分类
        </label>
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
