import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { electronBinaryPath } from '../../../scripts/ensure-electron.mjs'

describe('electronBinaryPath', () => {
  const root = path.resolve('frontend-root')

  it('resolves the Windows executable', () => {
    expect(electronBinaryPath(root, 'win32')).toBe(
      path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    )
  })

  it('resolves the executable inside the macOS application bundle', () => {
    expect(electronBinaryPath(root, 'darwin')).toBe(
      path.join(root, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron'),
    )
  })

  it('resolves the Linux executable', () => {
    expect(electronBinaryPath(root, 'linux')).toBe(
      path.join(root, 'node_modules', 'electron', 'dist', 'electron'),
    )
  })
})
