import { reactive, watch } from 'vue'

const STORAGE_KEY = 'chongwai_profile'

const defaultProfile = {
  nickname: '重外同学',
  avatar: 'canteen',
  phone: '',
}

function readProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      nickname:
        typeof parsed.nickname === 'string' && parsed.nickname.trim()
          ? parsed.nickname
          : defaultProfile.nickname,
      avatar:
        typeof parsed.avatar === 'string' && parsed.avatar
          ? parsed.avatar
          : defaultProfile.avatar,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    }
  } catch {
    return { ...defaultProfile }
  }
}

export const profile = reactive(readProfile())

watch(
  profile,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

export function updateProfile(next) {
  const nickname = next.nickname?.trim()
  if (nickname) profile.nickname = nickname
  if (next.avatar) profile.avatar = next.avatar
  if (typeof next.phone === 'string') profile.phone = next.phone.trim()
}
