import path from 'node:path'
import { fileURLToPath } from 'node:url'
import rcedit from 'rcedit'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 把 logo 写进 exe，桌面快捷方式才会显示正确图标 */
export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(context.appOutDir, exeName)
  const iconPath = path.join(root, 'build', 'icon.ico')

  await rcedit(exePath, { icon: iconPath })
}
