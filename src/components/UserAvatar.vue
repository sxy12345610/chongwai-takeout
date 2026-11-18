<script setup>
import { computed } from 'vue'
import { getAvatarPreset } from '@/data/avatars'

const props = defineProps({
  avatar: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 56,
  },
})

const preset = computed(() => getAvatarPreset(props.avatar))
</script>

<template>
  <span
    class="user-avatar"
    :style="{
      width: `${props.size}px`,
      height: `${props.size}px`,
      fontSize: `${Math.round(props.size * 0.4)}px`,
      backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
    }"
    aria-hidden="true"
  >
    {{ preset.emoji }}
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  border-radius: 50%;
  line-height: 1;
  box-shadow: 0 10px 22px rgba(23, 105, 170, 0.24);
  user-select: none;
}
</style>
