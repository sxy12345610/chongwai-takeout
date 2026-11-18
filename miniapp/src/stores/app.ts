import { defineStore } from 'pinia'

/**
 * 全局应用状态骨架。
 * 仅保留最小状态，不写入任何伪造业务数据。
 */
export const useAppStore = defineStore('app', {
  state: () => ({
    /** 是否已登录（后续接入微信登录后由真实接口结果驱动） */
    loggedIn: false,
    /** 当前登录用户 ID（登录后由后端返回） */
    userId: '' as string,
  }),
  actions: {
    setSession(userId: string) {
      this.userId = userId
      this.loggedIn = Boolean(userId)
    },
    clearSession() {
      this.userId = ''
      this.loggedIn = false
    },
  },
})
