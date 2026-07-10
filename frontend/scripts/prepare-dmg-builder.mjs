import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RELEASE = 'dmg-builder%401.2.0'
const BASE_URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${RELEASE}`

const ARTIFACTS = {
  arm64: {
    filename: 'dmgbuild-bundle-arm64-75c8a6c.tar.gz',
    sha256: 'a785f2a385c8c31996a089ef8e26361904b40c772d5ea65a36001212f1fc25e0',
  },
  x64: {
    filename: 'dmgbuild-bundle-x86_64-75c8a6c.tar.gz',
    sha256: '87b3bb72148b11451ee90ede79cc8d59305c9173b68b0f2b50a3bea51fc4a4e2',
  },
}

export function dmgBuilderArtifact(arch) {
  const artifact = ARTIFACTS[arch]
  if (!artifact) throw new Error(`Unsupported macOS runner architecture: ${arch}`)
  return { ...artifact, url: `${BASE_URL}/${artifact.filename}` }
}

async function downloadWithRetry(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  throw lastError
}

async function main() {
  if (process.platform !== 'darwin') {
    throw new Error('The DMG builder bundle can only be prepared on macOS')
  }

  const artifact = dmgBuilderArtifact(process.arch)
  console.error(`Downloading ${artifact.filename} from the official release`)
  const archive = await downloadWithRetry(artifact.url)
  const digest = crypto.createHash('sha256').update(archive).digest('hex')
  if (digest !== artifact.sha256) {
    throw new Error(`DMG builder checksum mismatch: expected ${artifact.sha256}, received ${digest}`)
  }

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amiweave-dmgbuild-'))
  const archivePath = path.join(outputDir, artifact.filename)
  fs.writeFileSync(archivePath, archive)
  execFileSync('tar', ['-xzf', archivePath, '-C', outputDir], { stdio: 'inherit' })

  const executable = path.join(outputDir, 'dmgbuild')
  if (!fs.existsSync(executable)) throw new Error('The DMG builder archive did not contain dmgbuild')
  fs.chmodSync(executable, 0o755)
  console.log(executable)
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) await main()
