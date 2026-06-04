import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const bump = ['patch', 'minor', 'major'].includes(process.argv[2]) ? process.argv[2] : 'patch'

process.chdir(root)
execSync(`npm version ${bump} --no-git-tag-version`, { stdio: 'inherit' })
execSync('node scripts/electron-pack.mjs', { stdio: 'inherit' })
