import { execFileSync, execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSync } from 'esbuild'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { compileBytecode, writeMainStub, writePreloadStub } from './compile-bytecode.mjs'
import { ensureElectronRuntime } from './ensure-electron.mjs'
import { packRuntimeSecrets } from './pack-runtime-secrets.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
process.env.ELECTRON_BUILD = '1'

const RENDERER_OBFUSCATOR = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.1,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayEncoding: ['rc4'],
  rotateStringArray: true,
  identifierNamesGenerator: 'mangled-shuffled',
  selfDefending: true,
  numbersToExpressions: true,
  transformObjectKeys: false,
  reservedNames: ['electronAPI', 'toJSON'],
  reservedStrings: ['electronAPI', 'isElectron', 'toJSON', 'AxiosHeaders'],
  unicodeEscapeSequence: false,
  disableConsoleOutput: false,
  simplify: false,
}

function obfuscateRendererBundles() {
  const assetsDir = path.join(root, 'dist', 'assets')
  if (!fs.existsSync(assetsDir)) return
  for (const name of fs.readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue
    const filePath = path.join(assetsDir, name)
    const source = fs.readFileSync(filePath, 'utf8')
    const obfuscated = JavaScriptObfuscator.obfuscate(source, RENDERER_OBFUSCATOR).getObfuscatedCode()
    fs.writeFileSync(filePath, obfuscated, 'utf8')
    console.log(`Obfuscated (renderer): ${path.relative(root, filePath)}`)
  }
}

/** Remove artifacts from prior packs before a fresh vite build. */
const PRE_VITE_STALE = ['main.cjs', 'main.cjs.map', 'main.jsc', 'preload.jsc', 'main-src.cjs', 'preload-src.cjs']

function removePreViteStaleEntries() {
  const electronDir = path.join(root, 'dist-electron')
  if (!fs.existsSync(electronDir)) return
  for (const name of PRE_VITE_STALE) {
    const filePath = path.join(electronDir, name)
    if (!fs.existsSync(filePath)) continue
    fs.unlinkSync(filePath)
    console.log(`Removed stale electron bundle: dist-electron/${name}`)
  }
}

function cleanDistElectronShipSet() {
  const electronDir = path.join(root, 'dist-electron')
  if (!fs.existsSync(electronDir)) return
  const keep = new Set([
    'main.js',
    'main-src.cjs',
    'preload.cjs',
    'main.jsc',
    'preload.jsc',
    'client-build.json',
    'runtime-secrets.bin',
  ])
  for (const name of fs.readdirSync(electronDir)) {
    if (keep.has(name)) continue
    fs.unlinkSync(path.join(electronDir, name))
    console.log(`Removed non-ship electron artifact: dist-electron/${name}`)
  }
}

function writeClientBuildMeta(version) {
  const buildId = crypto
    .createHash('sha256')
    .update(`${version}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`)
    .digest('hex')
    .slice(0, 16)
  fs.writeFileSync(
    path.join(root, 'dist-electron', 'client-build.json'),
    JSON.stringify({ version, buildId }, null, 2),
    'utf8',
  )
  console.log(`Client build meta: electron/${version}/${buildId}`)
  return buildId
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    out[key] = value
  }
  return out
}

function buildMainCjsBundle() {
  const outfile = path.join(root, 'dist-electron', 'main-src.cjs')
  buildSync({
    entryPoints: [path.join(root, 'electron', 'main.js')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron', 'get-windows', 'bytenode'],
    packages: 'external',
    minify: true,
    sourcemap: false,
    banner: {
      js: 'const __import_meta_url=require("url").pathToFileURL(__filename).href;',
    },
    define: {
      'import.meta.url': '__import_meta_url',
    },
    logLevel: 'info',
  })
  console.log(`Bundled main (CJS for bytecode): ${path.relative(root, outfile)}`)
}

function applyBytecodePackaging() {
  const electronDir = path.join(root, 'dist-electron')
  const mainSrc = path.join(electronDir, 'main-src.cjs')
  const preloadSrc = path.join(electronDir, 'preload-src.cjs')
  const mainJsc = path.join(electronDir, 'main.jsc')
  const preloadJsc = path.join(electronDir, 'preload.jsc')

  compileBytecode(root, [
    { src: mainSrc, out: mainJsc },
    { src: preloadSrc, out: preloadJsc },
  ])

  fs.unlinkSync(mainSrc)
  fs.unlinkSync(preloadSrc)

  writeMainStub(path.join(electronDir, 'main.js'))
  writePreloadStub(path.join(electronDir, 'preload.cjs'))
  cleanDistElectronShipSet()
}

function applySourcePackaging() {
  const electronDir = path.join(root, 'dist-electron')
  const preloadSrc = path.join(electronDir, 'preload-src.cjs')
  const preloadDest = path.join(electronDir, 'preload.cjs')

  if (!fs.existsSync(path.join(electronDir, 'main-src.cjs')) || !fs.existsSync(preloadSrc)) {
    throw new Error('Source fallback entries are missing')
  }

  for (const filePath of [
    path.join(electronDir, 'main.jsc'),
    path.join(electronDir, 'preload.jsc'),
    preloadDest,
  ]) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  fs.renameSync(preloadSrc, preloadDest)
  fs.writeFileSync(
    path.join(electronDir, 'main.js'),
    `import { createRequire } from 'module'\nconst require = createRequire(import.meta.url)\nrequire('./main-src.cjs')\n`,
    'utf8',
  )
  cleanDistElectronShipSet()
  console.warn('Bytecode unavailable; packaging auditable source bundles')
}

const cloudEnv = loadEnvFile(path.join(root, '.env.production.cloud'))
const packApiOrigin = cloudEnv.VITE_LIANYU_API_ORIGIN || 'http://localhost:8080'
const packCertFingerprint = cloudEnv.VITE_LIANYU_CERT_FINGERPRINT || ''
const packPinnedSpki = cloudEnv.VITE_LIANYU_PINNED_SPKI || ''

const viteEnv = {
  ...process.env,
  ELECTRON_BUILD: '1',
  VITE_LIANYU_API_ORIGIN: '',
  VITE_LIANYU_CERT_FINGERPRINT: '',
  VITE_LIANYU_PACKED_API_ORIGIN: packApiOrigin,
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const platformByHost = { win32: 'win', darwin: 'mac' }
const targetPlatform = process.argv[2] || platformByHost[process.platform]

if (!['win', 'mac'].includes(targetPlatform)) {
  throw new Error(`Unsupported desktop target: ${targetPlatform || process.platform}`)
}
if (platformByHost[process.platform] !== targetPlatform) {
  throw new Error(`${targetPlatform} packages must be built on a matching host`)
}

const productName = pkg.build?.productName || 'Amiweave'
const distributableExtensions = new Set(['.exe', '.dmg', '.zip'])

function hasDistributable(dirPath) {
  if (!fs.existsSync(dirPath)) return false
  return fs.readdirSync(dirPath).some((name) => distributableExtensions.has(path.extname(name)))
}

function resolveReleaseOutDir(version) {
  const primary = path.join('release', `v${version}`)
  const primaryFull = path.join(root, primary)
  if (hasDistributable(primaryFull)) return primary

  const partialPrefixes = targetPlatform === 'win'
    ? ['win-unpacked']
    : ['mac', 'mac-arm64', 'mac-universal']
  const hasPartial = fs.existsSync(primaryFull)
    && fs.readdirSync(primaryFull).some((name) => partialPrefixes.some((prefix) => name.startsWith(prefix)))
  if (hasPartial) {
    const fallback = `${primary}-rebuild`
    console.warn(`Partial release folder exists without installer (${primary}), using ${fallback}`)
    return fallback
  }
  return primary
}

const outDir = resolveReleaseOutDir(pkg.version)
const outDirFull = path.join(root, outDir)
fs.mkdirSync(outDirFull, { recursive: true })

function killDesktopProcesses() {
  if (process.platform !== 'win32') return
  for (const executable of ['Amiweave.exe', 'LianYu.exe']) {
    try {
      execSync(`taskkill /F /IM ${executable} /T`, { stdio: 'ignore' })
      console.log(`Stopped running ${executable} before packaging`)
    } catch {
      /* not running */
    }
  }
}

function removePartialReleaseArtifacts() {
  if (hasDistributable(outDirFull) || !fs.existsSync(outDirFull)) return
  const partialPrefixes = targetPlatform === 'win'
    ? ['win-unpacked']
    : ['mac', 'mac-arm64', 'mac-universal']
  for (const name of fs.readdirSync(outDirFull)) {
    if (!partialPrefixes.some((prefix) => name.startsWith(prefix))) continue
    const partialPath = path.join(outDirFull, name)
    try {
      fs.rmSync(partialPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      console.log(`Removed partial release folder: ${path.relative(root, partialPath)}`)
    } catch (err) {
      console.warn(`Could not remove partial release folder (continuing): ${err.message}`)
    }
  }
}

ensureElectronRuntime(root)
execFileSync(process.env.PYTHON || 'python', ['scripts/regenerate-icon.py'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
removePreViteStaleEntries()
execSync('npx vite build', { stdio: 'inherit', env: viteEnv })

buildMainCjsBundle()

const buildId = writeClientBuildMeta(pkg.version)
packRuntimeSecrets({
  version: pkg.version,
  buildId,
  apiOrigin: packApiOrigin,
  certFingerprint: packCertFingerprint,
  pinnedSpki: packPinnedSpki,
  outPath: path.join(root, 'dist-electron', 'runtime-secrets.bin'),
})

obfuscateRendererBundles()
if (process.env.LIANYU_PACKAGE_AUDITABLE_SOURCE === 'true') {
  applySourcePackaging()
} else {
  applyBytecodePackaging()
}

console.log('\n--- Launcher smoke test (pre-pack) ---')
execSync('node scripts/smoke-launcher.mjs', { stdio: 'inherit', cwd: root })

killDesktopProcesses()
removePartialReleaseArtifacts()

const outputArg = `--config.directories.output=${outDir.replace(/\\/g, '/')}`
const builderPlatformArg = targetPlatform === 'win' ? '--win' : '--mac'
const nativeRebuildArg = process.env.LIANYU_SKIP_NATIVE_REBUILD === 'true'
  ? '--config.npmRebuild=false'
  : ''
const builderEnv = { ...process.env }
if (targetPlatform === 'mac') {
  builderEnv.NPM_CONFIG_ELECTRON_BUILDER_BINARIES_MIRROR =
    process.env.LIANYU_ELECTRON_BUILDER_BINARIES_MIRROR
    || 'https://github.com/electron-userland/electron-builder-binaries/releases/download/'
  console.log('Using the official electron-builder binary releases for macOS packaging')
}
execSync(`npx electron-builder ${builderPlatformArg} ${outputArg} ${nativeRebuildArg}`.trim(), {
  stdio: 'inherit',
  env: builderEnv,
})

const artifacts = fs.readdirSync(outDirFull)
  .filter((name) => distributableExtensions.has(path.extname(name)))
  .sort()
console.log(`\n${productName} ${targetPlatform} artifacts:`)
for (const artifact of artifacts) console.log(`- ${path.join(outDir, artifact)}`)
console.log(`API Origin (packed in runtime-secrets.bin): ${packApiOrigin}`)
