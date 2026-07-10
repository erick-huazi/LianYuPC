import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveAsarResourcesDir } from '../../../scripts/after-pack.mjs'

function context(platform) {
  return {
    appOutDir: path.resolve('release-output'),
    electronPlatformName: platform,
    packager: { appInfo: { productFilename: 'Amiweave' } },
  }
}

describe('resolveAsarResourcesDir', () => {
  it('resolves Windows and Linux resources beside the executable', () => {
    expect(resolveAsarResourcesDir(context('win32'))).toBe(
      path.join(path.resolve('release-output'), 'resources'),
    )
    expect(resolveAsarResourcesDir(context('linux'))).toBe(
      path.join(path.resolve('release-output'), 'resources'),
    )
  })

  it('resolves resources inside the macOS application bundle', () => {
    expect(resolveAsarResourcesDir(context('darwin'))).toBe(
      path.join(path.resolve('release-output'), 'Amiweave.app', 'Contents', 'Resources'),
    )
  })
})
