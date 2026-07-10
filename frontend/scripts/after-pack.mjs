import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import rcedit from 'rcedit'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function sleepSync(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) { /* spin */ }
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function replaceFileWithRetry(src, dest, { retries = 12, delayMs = 250 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      removeIfExists(dest)
      fs.renameSync(src, dest)
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`replace ${path.basename(dest)} attempt ${attempt}/${retries}: ${err.message}`)
      sleepSync(delayMs * attempt)
    }
  }
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

/** asarmor header patch — write to side file first to avoid app.asar rename lock on Windows */
async function patchAsarArchive(asarPath) {
  if (!fs.existsSync(asarPath)) {
    console.log('app.asar not found, skipping asarmor patch')
    return false
  }
  if (process.env.LIANYU_SKIP_ASARMOR === 'true') {
    console.warn('Skipping asarmor patch for this local verification build')
    return false
  }

  const { default: asarmor } = await import('asarmor')

  const patchedPath = `${asarPath}.patched`
  for (const stale of [`${asarPath}.tmp`, patchedPath, `${patchedPath}.tmp`]) {
    removeIfExists(stale)
  }

  console.log(`asarmor patching ${asarPath}`)
  const archive = await asarmor.open(asarPath)
  archive.patch()
  await archive.write(patchedPath)
  replaceFileWithRetry(patchedPath, asarPath)
  console.log('asarmor patch applied')
  return true
}

/** 写入 resources/asar-integrity.hex（须在 asarmor patch 之后，对最终 asar 算哈希） */
function writeAsarIntegrityHex(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar')
  if (!fs.existsSync(asarPath)) {
    console.log('app.asar not found, skipping integrity hash')
    return
  }

  const hexPath = path.join(context.appOutDir, 'resources', 'asar-integrity.hex')
  const hex = sha256File(asarPath)
  fs.writeFileSync(hexPath, hex, 'utf8')
  console.log(`asar integrity SHA-256: ${hex}`)
}

/** 把 logo 写进 exe，桌面快捷方式才会显示正确图标 */
export default async function afterPack(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar')
  await patchAsarArchive(asarPath)

  if (context.electronPlatformName === 'win32') {
    const appInfo = context.packager.appInfo
    const exeName = `${context.packager.appInfo.productFilename}.exe`
    const exePath = path.join(context.appOutDir, exeName)
    const iconPath = path.join(root, 'build', 'icon.ico')

    await rcedit(exePath, {
      'version-string': {
        CompanyName: appInfo.companyName || 'Amiweave contributors',
        FileDescription: appInfo.productName,
        InternalName: appInfo.productFilename,
        LegalCopyright: appInfo.copyright,
        OriginalFilename: exeName,
        ProductName: appInfo.productName,
      },
      'file-version': appInfo.shortVersion || appInfo.buildVersion,
      'product-version': appInfo.shortVersionWindows || appInfo.getVersionInWeirdWindowsForm(),
      icon: iconPath,
    })
  }
  writeAsarIntegrityHex(context)
}
