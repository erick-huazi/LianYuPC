import { describe, expect, it } from 'vitest'
import { dmgBuilderArtifact } from '../../../scripts/prepare-dmg-builder.mjs'

describe('dmgBuilderArtifact', () => {
  it('pins the arm64 helper and checksum', () => {
    const artifact = dmgBuilderArtifact('arm64')
    expect(artifact.filename).toBe('dmgbuild-bundle-arm64-75c8a6c.tar.gz')
    expect(artifact.sha256).toHaveLength(64)
    expect(artifact.url).toContain('electron-userland/electron-builder-binaries/releases/download/')
  })

  it('pins the x64 helper and checksum', () => {
    const artifact = dmgBuilderArtifact('x64')
    expect(artifact.filename).toBe('dmgbuild-bundle-x86_64-75c8a6c.tar.gz')
    expect(artifact.sha256).toHaveLength(64)
  })

  it('rejects unsupported runner architectures', () => {
    expect(() => dmgBuilderArtifact('ia32')).toThrow('Unsupported macOS runner architecture')
  })
})
