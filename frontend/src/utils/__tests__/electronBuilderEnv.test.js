import { describe, expect, it } from 'vitest'
import {
  createElectronBuilderEnv,
  OFFICIAL_BUILDER_BINARIES_MIRROR,
} from '../../../scripts/electron-builder-env.mjs'

describe('createElectronBuilderEnv', () => {
  it('preserves the existing environment for Windows builds', () => {
    const source = { npm_config_electron_builder_binaries_mirror: 'https://mirror.invalid/' }
    expect(createElectronBuilderEnv(source, 'win')).toEqual(source)
  })

  it('removes npm mirror overrides for macOS builds', () => {
    const env = createElectronBuilderEnv({
      NPM_CONFIG_ELECTRON_BUILDER_BINARIES_MIRROR: 'https://uppercase.invalid/',
      npm_config_electron_builder_binaries_mirror: 'https://lowercase.invalid/',
      npm_package_config_electron_builder_binaries_mirror: 'https://package.invalid/',
      ELECTRON_BUILDER_BINARIES_MIRROR: 'https://builder.invalid/',
    }, 'mac')

    expect(env.NPM_CONFIG_ELECTRON_BUILDER_BINARIES_MIRROR).toBeUndefined()
    expect(env.npm_config_electron_builder_binaries_mirror).toBeUndefined()
    expect(env.npm_package_config_electron_builder_binaries_mirror).toBeUndefined()
    expect(env.ELECTRON_BUILDER_BINARIES_MIRROR).toBe(OFFICIAL_BUILDER_BINARIES_MIRROR)
  })

  it('allows an explicit macOS builder mirror', () => {
    const env = createElectronBuilderEnv({
      LIANYU_ELECTRON_BUILDER_BINARIES_MIRROR: 'https://packages.example/',
    }, 'mac')

    expect(env.ELECTRON_BUILDER_BINARIES_MIRROR).toBe('https://packages.example/')
  })
})
