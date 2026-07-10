import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export function electronBinaryPath(root, platform = process.platform) {
  if (platform === 'win32') {
    return path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
  }
  if (platform === 'darwin') {
    return path.join(
      root,
      'node_modules',
      'electron',
      'dist',
      'Electron.app',
      'Contents',
      'MacOS',
      'Electron',
    )
  }
  return path.join(root, 'node_modules', 'electron', 'dist', 'electron')
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
