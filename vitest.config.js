import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const testDbPath = path.join(rootDir, 'prisma', 'test.db')

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
    env: {
      DATABASE_URL: `file:${testDbPath}`,
    },
    globalSetup: ['./src/test/globalSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/test/**'],
    },
  },
})
