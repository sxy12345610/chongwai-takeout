/**
 * 本地图片路径统一处理，兼容 Vite 开发和 GitHub Pages 部署。
 */
export function localImage(path) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}images/${path}`
}
