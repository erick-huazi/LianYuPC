import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'

const SESSION_FILE = 'auth-session.bin'

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

export function readAuthSession() {
  const file = sessionPath()
  if (!fs.existsSync(file)) return null
  try {
    const encrypted = fs.readFileSync(file)
    if (!encrypted?.length) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    const json = safeStorage.decryptString(encrypted)
    return sanitizeSession(JSON.parse(json))
  } catch {
    try {
      fs.unlinkSync(file)
    } catch {
      // ignore corrupt session file
    }
    return null
  }
}

export function writeAuthSession(session) {
  const next = sanitizeSession(session)
  if (!next) {
    clearAuthSession()
    return null
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return null
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(next))
  fs.mkdirSync(path.dirname(sessionPath()), { recursive: true })
  fs.writeFileSync(sessionPath(), encrypted)
  return next
}

export function clearAuthSession() {
  try {
    if (fs.existsSync(sessionPath())) {
      fs.unlinkSync(sessionPath())
    }
  } catch {
    // ignore
  }
}
