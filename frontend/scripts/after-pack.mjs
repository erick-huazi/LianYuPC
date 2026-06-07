import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import rcedit from 'rcedit'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 计算 app.asar SHA-256，写入 dist/asar-integrity.hex 供启动时校验 */
function computeAsarIntegrity(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar')
  if (!fs.existsSync(asarPath)) {
    console.log('app.asar not found, skipping integrity hash')
    return
  }
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(asarPath)
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => {
      const hex = hash.digest('hex')
      const outPath = path.join(context.appOutDir, 'resources', 'dist', 'asar-integrity.hex')
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, hex, 'utf8')
      console.log(`asar integrity SHA-256: ${hex}`)
      resolve()
    })
    stream.on('error', reject)
  })
}

/** 把 logo 写进 exe，桌面快捷方式才会显示正确图标 */
export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(context.appOutDir, exeName)
  const iconPath = path.join(root, 'build', 'icon.ico')

  await rcedit(exePath, { icon: iconPath })
  await computeAsarIntegrity(context)
}
