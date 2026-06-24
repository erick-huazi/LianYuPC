import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JavaScriptObfuscator from 'javascript-obfuscator'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
process.env.ELECTRON_BUILD = '1'

const OBFUSCATOR_PROFILES = {
  renderer: {
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
    stringArrayEncoding: ['base64'],
    rotateStringArray: true,
    identifierNamesGenerator: 'mangled-shuffled',
    selfDefending: true,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    disableConsoleOutput: false,
  },
  electron: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayThreshold: 0.6,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayEncoding: ['base64'],
    rotateStringArray: true,
    identifierNamesGenerator: 'mangled-shuffled',
    selfDefending: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    disableConsoleOutput: false,
  },
}

function obfuscateFile(filePath, profileName) {
  if (!fs.existsSync(filePath)) return
  const options = OBFUSCATOR_PROFILES[profileName]
  const source = fs.readFileSync(filePath, 'utf8')
  const obfuscated = JavaScriptObfuscator.obfuscate(source, options).getObfuscatedCode()
  fs.writeFileSync(filePath, obfuscated, 'utf8')
  console.log(`Obfuscated (${profileName}): ${path.relative(root, filePath)}`)
}

function obfuscateRendererBundles() {
  const assetsDir = path.join(root, 'dist', 'assets')
  if (!fs.existsSync(assetsDir)) return
  for (const name of fs.readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue
    obfuscateFile(path.join(assetsDir, name), 'renderer')
  }
}

function obfuscateElectronBundles() {
  const electronDir = path.join(root, 'dist-electron')
  for (const name of ['preload.cjs', 'main.js']) {
    obfuscateFile(path.join(electronDir, name), 'electron')
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
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.join(root, '.env.production.cloud'))
process.env.LIANYU_API_ORIGIN = process.env.VITE_LIANYU_API_ORIGIN || 'http://localhost:8080'
process.env.LIANYU_CERT_FINGERPRINT = process.env.VITE_LIANYU_CERT_FINGERPRINT || ''

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const outDir = path.join('release', `v${pkg.version}`)
fs.mkdirSync(path.join(root, outDir), { recursive: true })

execSync('python scripts/regenerate-icon.py', { stdio: 'inherit' })
execSync('npx vite build', { stdio: 'inherit', env: process.env })
writeClientBuildMeta(pkg.version)
obfuscateRendererBundles()
obfuscateElectronBundles()

const outputArg = `--config.directories.output=${outDir.replace(/\\/g, '/')}`
execSync(`npx electron-builder --win ${outputArg}`, {
  stdio: 'inherit',
  env: process.env,
})

console.log(`\n安装包已生成: ${outDir}/LianYu Setup ${pkg.version}.exe`)
console.log(`API Origin: ${process.env.LIANYU_API_ORIGIN}`)
