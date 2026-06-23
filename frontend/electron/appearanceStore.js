import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const FILE_NAME = 'appearance.json'

function filePath() {
  return path.join(app.getPath('userData'), FILE_NAME)
}

/** @returns {'dark' | 'light'} */
export function readAppearance() {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8')
    const data = JSON.parse(raw)
    return data?.mode === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** @param {'dark' | 'light' | string} mode */
export function writeAppearance(mode) {
  const normalized = mode === 'light' ? 'light' : 'dark'
  fs.mkdirSync(path.dirname(filePath()), { recursive: true })
  fs.writeFileSync(filePath(), JSON.stringify({ mode: normalized, savedAt: Date.now() }))
  return normalized
}

export function resolveWindowBackgroundColor(mode = readAppearance()) {
  return mode === 'light' ? '#ffffff' : '#0a0a10'
}
