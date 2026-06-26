import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * @param {string} root
 * @param {{ src: string, out: string }[]} files
 */
export function compileBytecode(root, files) {
  const electronBin =
    process.platform === 'win32'
      ? path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
      : path.join(root, 'node_modules', 'electron', 'dist', 'electron')

  for (const { src, out } of files) {
    if (!fs.existsSync(src)) {
      throw new Error(`Bytecode source missing: ${src}`)
    }
    const srcAbs = path.resolve(src)
    const outAbs = path.resolve(out)
    const script = `
      require('bytenode');
      require('bytenode').compileFile({
        filename: ${JSON.stringify(srcAbs)},
        output: ${JSON.stringify(outAbs)},
      });
      console.log('compiled');
    `
    const result = spawnSync(electronBin, ['-e', script], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    })
    if (result.status !== 0) {
      throw new Error(
        `bytenode compile failed for ${path.basename(src)}:\n${result.stderr || result.stdout}`,
      )
    }
    console.log(`Bytecode compiled: ${path.basename(out)}`)
  }
}

/** @param {string} dest */
export function writeMainStub(dest) {
  fs.writeFileSync(
    dest,
    `import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('bytenode')
require('./main.jsc')
`,
    'utf8',
  )
  console.log(`Main stub written: ${path.basename(dest)}`)
}

/** @param {string} dest */
export function writePreloadStub(dest) {
  fs.writeFileSync(
    dest,
    `require('bytenode')
require('./preload.jsc')
`,
    'utf8',
  )
  console.log(`Preload stub written: ${path.basename(dest)}`)
}
