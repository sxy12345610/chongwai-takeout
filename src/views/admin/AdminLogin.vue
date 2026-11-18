<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, LogIn, User } from 'lucide-vue-next'
import { login, logout } from '@/api/auth'

const route = useRoute()
const router = useRouter()

const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  if (!phone.value.trim() || !password.value) {
    error.value = '请输入手机号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const user = await login(phone.value.trim(), password.value)
    if (!user.roles?.includes('ADMIN')) {
      logout()
      error.value = '该账号没有平台管理员权限'
      return
    }
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' && redirect.startsWith('/admin') ? redirect : '/admin')
  } catch (e) {
    error.value = e?.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="login-brand__logo">CW</span>
        <div>
          <strong>重外校园外卖平台</strong>
          <small>管理后台 · CHONGWAI ADMIN</small>
        </div>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="login-field">
          <User :size="15" />
          <input
            v-model="phone"
            type="text"
            autocomplete="username"
            placeholder="管理员手机号"
          />
        </label>
        <label class="login-field">
          <Lock :size="15" />
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="登录密码"
          />
        </label>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="login-submit" :disabled="loading">
          <LogIn :size="14" />
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>

      <p class="login-tip">
        开发环境默认管理员账号配置于 <code>server/.env</code> 的 SEED_ADMIN_PHONE / SEED_ADMIN_PASSWORD。
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  background: linear-gradient(135deg, #0f3c63 0%, #1769aa 60%, #4e9fdf 100%);
}
.login-card {
  width: 100%;
  max-width: 360px;
  padding: 28px 26px;
  border-radius: 18px;
  background-color: #ffffff;
  box-shadow: 0 20px 50px rgba(8, 36, 66, 0.35);
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 22px;
}
.login-brand__logo {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1769aa, #4e9fdf);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}
.login-brand strong {
  display: block;
  font-size: 15px;
}
.login-brand small {
  color: var(--text-secondary);
  font-size: 9.5px;
  letter-spacing: 0.08em;
}
.login-form {
  display: grid;
  gap: 12px;
}
.login-field {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--border-soft);
  border-radius: 11px;
  color: var(--text-secondary);
  transition: border-color 0.2s ease;
}
.login-field:focus-within {
  border-color: var(--brand-primary);
}
.login-field input {
  flex: 1;
  min-width: 0;
  padding: 11px 0;
  border: 0;
  outline: 0;
  font-size: 13px;
}
.login-error {
  padding: 8px 10px;
  border-radius: 9px;
  background-color: #fff1f0;
  color: #c0392b;
  font-size: 11.5px;
}
.login-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 4px;
  padding: 11px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(135deg, #1769aa, #4e9fdf);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-tip {
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6;
}
.login-tip code {
  padding: 1px 5px;
  border-radius: 5px;
  background-color: #f1f6fb;
  font-size: 10px;
}
</style>
