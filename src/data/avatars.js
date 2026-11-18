/** 本地预设头像：使用渐变底色 + 表情符号，不依赖外部图片。 */
export const avatarPresets = [
  { key: 'canteen', emoji: '🍚', from: '#1769AA', to: '#4E9FDF' },
  { key: 'noodle', emoji: '🍜', from: '#D9803C', to: '#F0B070' },
  { key: 'burger', emoji: '🍔', from: '#B25D48', to: '#E39070' },
  { key: 'tea', emoji: '🧋', from: '#7C6BC4', to: '#A99AE8' },
  { key: 'fruit', emoji: '🍓', from: '#D9536F', to: '#F08CA2' },
  { key: 'night', emoji: '🌙', from: '#2F4A6B', to: '#5A7FA8' },
]

export function getAvatarPreset(key) {
  return avatarPresets.find((preset) => preset.key === key) || avatarPresets[0]
}
