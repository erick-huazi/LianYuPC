import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
process.env.ELECTRON_DEV = '1'
execSync('npx vite', { stdio: 'inherit', env: process.env })
