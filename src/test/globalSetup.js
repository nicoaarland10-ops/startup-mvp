import { execSync } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const testDbPath = path.join(rootDir, 'prisma', 'test.db')

export async function setup() {
  if (existsSync(testDbPath)) unlinkSync(testDbPath)
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: 'inherit',
  })
}

export async function teardown() {
  if (existsSync(testDbPath)) unlinkSync(testDbPath)
}
