<script setup>
import { onMounted, reactive, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import Pagination from '@/components/admin/Pagination.vue'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { formatDateTime } from '@/utils/format'

const page = ref(1)
const pageSize = 10
const filters = reactive({ keyword: '', status: '' })

const { data, loading, error, run: load } = useAsync(async () =>
  adminApi.listUsers({
    page: page.value,
    pageSize,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
  }),
)

function applyFilters() {
  page.value = 1
  load()
}
function onPageChange(p) {
  page.value = p
  load()
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <header class="admin-panel">
      <div class="admin-toolbar">
        <h2 class="admin-toolbar__title">用户管理</h2>
        <div class="admin-toolbar__actions">
          <select v-model="filters.status" class="admin-select" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="ACTIVE">正常</option>
            <option value="DISABLED">已停用</option>
          </select>
          <div class="admin-search">
            <Search :size="12" />
            <input v-model="filters.keyword" placeholder="手机号 / 昵称" @keyup.enter="applyFilters" />
          </div>
          <button class="admin-btn admin-btn--soft" type="button" @click="applyFilters">查询</button>
        </div>
      </div>
    </header>

    <section v-if="loading || !data" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载用户…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>用户加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <section v-else class="admin-panel">
      <div v-if="data.list.length === 0" class="admin-empty">
        <strong>暂无用户</strong>
        <p>没有符合条件的用户。</p>
      </div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>手机号</th>
            <th>状态</th>
            <th>注册时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data.list" :key="user.id">
            <td>
              <div class="admin-user-cell">
                <span class="admin-thumb" style="border-radius:50%">
                  <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.nickname" />
                </span>
                <strong>{{ user.nickname || '未设置昵称' }}</strong>
              </div>
            </td>
            <td>{{ user.phone }}</td>
            <td>
              <span class="admin-tag" :class="user.status === 'ACTIVE' ? 'is-active' : 'is-off'">
                {{ user.status === 'ACTIVE' ? '正常' : '已停用' }}
              </span>
            </td>
            <td>{{ formatDateTime(user.createdAt) }}</td>
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
.admin-user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
