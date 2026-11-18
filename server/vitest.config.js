import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    // 串行执行，避免多个测试文件并发修改同一行库存导致用例不稳定
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
    globalSetup: ['./tests/global-setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
