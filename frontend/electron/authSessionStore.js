import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

const SESSION_FILE = 'auth-session.bin'
const PLAIN_SESSION_FILE = 'auth-session.plain.json'

/** safeStorage 不可用时降级到内存，避免登录后无法保存凭证 */
let memorySession = null

function sessionPath() {
  return path.join(app.getPath('userData'), SESSION_FILE)
}

function sanitizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const next = {}
  if (typeof raw.token === 'string' && raw.token.trim()) {
    next.token = raw.token.trim()
  }
  if (typeof raw.tokenName === 'string' && raw.tokenName.trim()) {
    next.tokenName = raw.tokenName.trim()
  }
  if (raw.userId != null && Number.isFinite(Number(raw.userId))) {
    next.userId = Number(raw.userId)
  }
  if (typeof raw.username === 'string' && raw.username.trim()) {
    next.username = raw.username.trim()
  }
  if (typeof raw.nickname === 'string') {
    next.nickname = raw.nickname.trim()
  }
  if (typeof raw.avatarUrl === 'string') {
    next.avatarUrl = raw.avatarUrl.trim()
  }
  if (raw.savedAt != null && Number.isFinite(Number(raw.savedAt))) {
    next.savedAt = Number(raw.savedAt)
  }
  return Object.keys(next).length ? next : null
}

function plainSessionPath() {
  return path.join(app.getPath('userData'), PLAIN_SESSION_FILE)
}

function readPlainSessionFile() {
  try {
    const raw = fs.readFileSync(plainSessionPath(), 'utf8')
    return sanitizeSession(JSON.parse(raw))
  } catch {
    return null
  }
}

function writePlainSessionFile(session) {
  try {
    fs.mkdirSync(path.dirname(plainSessionPath()), { recursive: true })
    fs.writeFileSync(plainSessionPath(), JSON.stringify(session))
  } catch {
    // ignore
  }
}

function removePlainSessionFile() {
  try {
    if (fs.existsSync(plainSessionPath())) {
      fs.unlinkSync(plainSessionPath())
    }
  } catch {
    // ignore
  }
}

export function readAuthSession() {
  if (memorySession) return { ...memorySession }

  const file = sessionPath()
  if (fs.existsSync(file)) {
    try {
      const encrypted = fs.readFileSync(file)
      if (!encrypted?.length) return readPlainSessionFile()
      if (!safeStorage.isEncryptionAvailable()) return readPlainSessionFile()
      const json = safeStorage.decryptString(encrypted)
      return sanitizeSession(JSON.parse(json))
    } catch {
      try {
        fs.unlinkSync(file)
      } catch {
        // ignore corrupt session file
      }
      return readPlainSessionFile()
    }
  }

  return readPlainSessionFile()
}

export function writeAuthSession(session) {
  const next = sanitizeSession(session)
  if (!next) {
    clearAuthSession()
    return null
  }

  if (!safeStorage.isEncryptionAvailable()) {
    memorySession = next
    writePlainSessionFile(next)
    return { ...next }
  }

  try {
    const encrypted = safeStorage.encryptString(JSON.stringify(next))
    fs.mkdirSync(path.dirname(sessionPath()), { recursive: true })
    fs.writeFileSync(sessionPath(), encrypted)
    memorySession = next
    removePlainSessionFile()
    return { ...next }
  } catch {
    memorySession = next
    writePlainSessionFile(next)
    return { ...next }
  }
}

export function clearAuthSession() {
  memorySession = null
  removePlainSessionFile()
  try {
    if (fs.existsSync(sessionPath())) {
      fs.unlinkSync(sessionPath())
    }
  } catch {
    // ignore
  }
}
