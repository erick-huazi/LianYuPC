import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export function electronBinaryPath(root) {
  return process.platform === 'win32'
    ? path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(root, 'node_modules', 'electron', 'dist', 'electron')
}

export function ensureElectronRuntime(root) {
  const binary = electronBinaryPath(root)
  if (fs.existsSync(binary)) return binary

  const installer = path.join(root, 'node_modules', 'electron', 'install.js')
  if (!fs.existsSync(installer)) {
    throw new Error('Electron package is missing; run npm ci first')
  }

  console.log('Electron runtime is missing; downloading it now...')
  execFileSync(process.execPath, [installer], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (!fs.existsSync(binary)) {
    throw new Error(`Electron installer completed without creating ${binary}`)
  }
  return binary
}
