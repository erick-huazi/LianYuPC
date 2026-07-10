export const OFFICIAL_BUILDER_BINARIES_MIRROR =
  'https://github.com/electron-userland/electron-builder-binaries/releases/download/'

const MIRROR_ENV_KEYS = [
  'NPM_CONFIG_ELECTRON_BUILDER_BINARIES_MIRROR',
  'npm_config_electron_builder_binaries_mirror',
  'npm_package_config_electron_builder_binaries_mirror',
  'ELECTRON_BUILDER_BINARIES_MIRROR',
]

export function createElectronBuilderEnv(baseEnv, targetPlatform) {
  const env = { ...baseEnv }
  if (targetPlatform !== 'mac') return env

  for (const key of MIRROR_ENV_KEYS) delete env[key]
  env.ELECTRON_BUILDER_BINARIES_MIRROR =
    baseEnv.LIANYU_ELECTRON_BUILDER_BINARIES_MIRROR
    || OFFICIAL_BUILDER_BINARIES_MIRROR
  return env
}
