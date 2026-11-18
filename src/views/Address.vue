<script setup>
import { computed, reactive, ref } from 'vue'
import { MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import {
  addAddress,
  addresses,
  removeAddress,
  setDefaultAddress,
  updateAddress,
} from '@/utils/addresses'

const showForm = ref(false)
const editingId = ref('')
const deletingId = ref('')

const form = reactive({
  contactName: '',
  phone: '',
  campusArea: '',
  building: '',
  room: '',
  detail: '',
  isDefault: false,
})

const errors = reactive({
  contactName: '',
  phone: '',
  campusArea: '',
  building: '',
  room: '',
})

const sortedAddresses = computed(() =>
  [...addresses].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault),
  ),
)

const formTitle = computed(() => (editingId.value ? '编辑地址' : '新增地址'))

function resetErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    contactName: '',
    phone: '',
    campusArea: '',
    building: '',
    room: '',
    detail: '',
    isDefault: addresses.length === 0,
  })
  resetErrors()
  showForm.value = true
}

function openEdit(address) {
  editingId.value = address.id
  Object.assign(form, {
    contactName: address.contactName,
    phone: address.phone,
    campusArea: address.campusArea,
    building: address.building,
    room: address.room,
    detail: address.detail,
    isDefault: address.isDefault,
  })
  resetErrors()
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  resetErrors()
}

function validate() {
  const phone = form.phone.trim()
  errors.contactName = form.contactName.trim() ? '' : '请填写收货人姓名'
  errors.phone = !phone
    ? '请填写联系电话'
    : /^1[3-9]\d{9}$/.test(phone)
      ? ''
      : '请输入 11 位有效手机号'
  errors.campusArea = form.campusArea.trim() ? '' : '请填写校园区域'
  errors.building = form.building.trim() ? '' : '请填写宿舍楼栋'
  errors.room = form.room.trim() ? '' : '请填写房间号'

  return !Object.values(errors).some(Boolean)
}

function submitForm() {
  if (!validate()) return

  const payload = { ...form }
  if (editingId.value) updateAddress(editingId.value, payload)
  else addAddress(payload)

  closeForm()
}

function handleDelete(id) {
  removeAddress(id)
  deletingId.value = ''
}
</script>

<template>
  <div class="page container address-page">
    <header class="page-head">
      <div>
        <h1 class="page-head__title">收货地址</h1>
        <p class="page-head__desc">
          共 {{ addresses.length }} 个地址，默认地址会优先用于确认订单。
        </p>
      </div>

      <button type="button" class="add-button" @click="openCreate">
        <Plus :size="15" />
        新增地址
      </button>
    </header>

    <template v-if="addresses.length">
      <section class="address-list">
        <article
          v-for="address in sortedAddresses"
          :key="address.id"
          class="address-card card"
          :class="{ 'is-default': address.isDefault }"
        >
          <header class="address-card__head">
            <div class="address-card__person">
              <strong>{{ address.contactName }}</strong>
              <span>{{ address.phone }}</span>
              <em v-if="address.isDefault" class="default-tag">默认</em>
            </div>
            <span class="address-card__area">
              <MapPin :size="12" />
              {{ address.campusArea }}
            </span>
          </header>

          <p class="address-card__text">
            {{ address.building }} {{ address.room }}
            <template v-if="address.detail"> · {{ address.detail }}</template>
          </p>

          <footer class="address-card__foot">
            <button
              type="button"
              class="address-card__default"
              :disabled="address.isDefault"
              @click="setDefaultAddress(address.id)"
            >
              <Star :size="13" />
              {{ address.isDefault ? '默认地址' : '设为默认' }}
            </button>

            <div class="address-card__actions">
              <button type="button" @click="openEdit(address)">
                <Pencil :size="13" />
                编辑
              </button>
              <button
                v-if="deletingId !== address.id"
                type="button"
                class="is-danger"
                @click="deletingId = address.id"
              >
                <Trash2 :size="13" />
                删除
              </button>
            </div>
          </footer>

          <div v-if="deletingId === address.id" class="delete-confirm">
            <span>确认删除该地址？</span>
            <button type="button" @click="deletingId = ''">取消</button>
            <button type="button" class="is-danger" @click="handleDelete(address.id)">
              确认删除
            </button>
          </div>
        </article>
      </section>
    </template>

    <EmptyState
      v-else
      :icon="MapPin"
      title="还没有收货地址"
      description="添加一个常用地址，下单时可以直接选择。"
    >
      <button type="button" class="btn btn--primary" @click="openCreate">
        新增地址
      </button>
    </EmptyState>

    <div v-if="showForm" class="modal">
      <div class="modal__backdrop" @click="closeForm"></div>
      <form class="modal__panel card" @submit.prevent="submitForm">
        <header class="modal__head">
          <h2>{{ formTitle }}</h2>
          <button
            type="button"
            class="modal__close"
            aria-label="关闭"
            @click="closeForm"
          >
            <X :size="17" />
          </button>
        </header>

        <div class="form-grid">
          <label class="modal-field">
            <span>收货人姓名</span>
            <input
              v-model="form.contactName"
              type="text"
              maxlength="12"
              placeholder="请输入姓名"
              :class="{ 'has-error': errors.contactName }"
            />
            <em v-if="errors.contactName">{{ errors.contactName }}</em>
          </label>

          <label class="modal-field">
            <span>联系电话</span>
            <input
              v-model="form.phone"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder="11 位手机号"
              :class="{ 'has-error': errors.phone }"
            />
            <em v-if="errors.phone">{{ errors.phone }}</em>
          </label>
        </div>

        <label class="modal-field">
          <span>校园区域</span>
          <input
            v-model="form.campusArea"
            type="text"
            placeholder="如：重庆外语外事学院 东区"
            :class="{ 'has-error': errors.campusArea }"
          />
          <em v-if="errors.campusArea">{{ errors.campusArea }}</em>
        </label>

        <div class="form-grid">
          <label class="modal-field">
            <span>宿舍楼栋</span>
            <input
              v-model="form.building"
              type="text"
              placeholder="如：3 号宿舍楼"
              :class="{ 'has-error': errors.building }"
            />
            <em v-if="errors.building">{{ errors.building }}</em>
          </label>

          <label class="modal-field">
            <span>房间号</span>
            <input
              v-model="form.room"
              type="text"
              placeholder="如：502"
              :class="{ 'has-error': errors.room }"
            />
            <em v-if="errors.room">{{ errors.room }}</em>
          </label>
        </div>

        <label class="modal-field">
          <span>详细地址</span>
          <textarea
            v-model="form.detail"
            rows="2"
            placeholder="选填，如：靠近楼梯口，方便取餐"
          ></textarea>
        </label>

        <label class="default-toggle">
          <input v-model="form.isDefault" type="checkbox" />
          <span>设为默认地址</span>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn btn--soft" @click="closeForm">
            取消
          </button>
          <button type="submit" class="btn btn--primary">
            {{ editingId ? '保存修改' : '保存地址' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.address-page {
  padding-bottom: 20px;
}

.add-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 9px 13px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 650;
  box-shadow: 0 7px 16px rgba(23, 105, 170, 0.2);
  transition: background-color 0.2s ease;
}

.add-button:hover {
  background-color: #125a93;
}

.address-list {
  display: grid;
  gap: 12px;
}

.address-card {
  position: relative;
  overflow: hidden;
  padding: 15px 16px;
}

.address-card.is-default {
  border-color: rgba(23, 105, 170, 0.32);
  box-shadow: 0 10px 26px rgba(23, 105, 170, 0.1);
}

.address-card.is-default::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #1769aa, #4e9fdf);
}

.address-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.address-card__person {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.address-card__person strong {
  font-size: 13.5px;
  font-weight: 750;
}

.address-card__person span {
  color: var(--text-secondary);
  font-size: 11px;
}

.default-tag {
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
}

.address-card__area {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 3px;
  color: var(--brand-secondary);
  font-size: 10px;
  font-weight: 600;
}

.address-card__text {
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.6;
}

.address-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-soft);
}

.address-card__default {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.address-card__default:disabled {
  color: var(--brand-primary);
  cursor: default;
}

.address-card__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.address-card__actions button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.address-card__actions button:hover {
  color: var(--brand-primary);
}

.address-card__actions button.is-danger:hover {
  color: #c25b5b;
}

.delete-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  background-color: #fdf5f5;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.delete-confirm span {
  margin-right: auto;
}

.delete-confirm button {
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background-color: #ffffff;
  border: 1px solid var(--border-soft);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.delete-confirm button.is-danger {
  border-color: #efcaca;
  color: #c25b5b;
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
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
  max-width: 420px;
  max-height: calc(100vh - 40px);
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
  margin-bottom: 13px;
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

.form-grid {
  display: grid;
  gap: 10px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.modal-field span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.modal-field input,
.modal-field textarea {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid #dfeaf6;
  border-radius: 10px;
  background-color: #f9fcff;
  font-size: 12.5px;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-field input:focus,
.modal-field textarea:focus {
  border-color: var(--brand-secondary);
  box-shadow: 0 0 0 3px rgba(40, 120, 200, 0.09);
}

.modal-field input.has-error {
  border-color: #d98b8b;
  background-color: #fffafa;
}

.modal-field em {
  color: #c25b5b;
  font-size: 10px;
  font-style: normal;
}

.default-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 10px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 11.5px;
  font-weight: 600;
}

.default-toggle input {
  width: 15px;
  height: 15px;
  accent-color: var(--brand-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 15px;
}

.modal-actions .btn {
  padding: 9px 16px;
  font-size: 12px;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
