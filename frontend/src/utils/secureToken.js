/**
 * Token 加密存储 — 防 localStorage 明文提取。
 * 使用 Web Crypto AES-GCM，密钥绑定当前应用实例（首次使用时随机生成）。
 * 提供 syncToken() 同步读取入口，供 EventSource / 路由守卫等无法 await 的场景。
 */

const KEY_STORE_KEY = '_lkt'
const TOKEN_STORE_KEY = '_ltt'

let cachedKey = null
/** 解密后的原始 token，登录成功后写入 */
let rawToken = null
/** 是否已尝试从 encrypted storage 恢复 */
let restored = false

function textToBytes(text) {
  return new TextEncoder().encode(text)
}

function bytesToText(bytes) {
  return new TextDecoder().decode(bytes)
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function getOrCreateKey() {
  if (cachedKey) return cachedKey

  const stored = localStorage.getItem(KEY_STORE_KEY)
  if (stored) {
    try {
      const raw = hexToBytes(stored)
      cachedKey = await crypto.subtle.importKey(
        'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
      )
      return cachedKey
    } catch {
      // key corrupted, regenerate
    }
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const raw = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(KEY_STORE_KEY, bytesToHex(new Uint8Array(raw)))
  cachedKey = key
  return key
}

async function decryptFromStorage() {
  const combinedHex = localStorage.getItem(TOKEN_STORE_KEY)
  if (!combinedHex) return null
  const key = await getOrCreateKey()
  const combined = hexToBytes(combinedHex)
  if (combined.length < 13) return null
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, encrypted
  )
  return bytesToText(new Uint8Array(decrypted))
}

/**
 * 登录后调用：加密 token 写入 localStorage + 同步缓存
 */
export async function storeToken(value) {
  if (!value) {
    localStorage.removeItem(TOKEN_STORE_KEY)
    localStorage.removeItem(KEY_STORE_KEY)
    cachedKey = null
    rawToken = null
    restored = true
    return
  }
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, textToBytes(value)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  localStorage.setItem(TOKEN_STORE_KEY, bytesToHex(combined))
  rawToken = value
  restored = true
}

/**
 * 异步解密读取 token（启动恢复时用）
 */
export async function readToken() {
  if (restored) return rawToken
  try {
    rawToken = await decryptFromStorage()
  } catch {
    rawToken = null
  }
  restored = true
  return rawToken
}

/**
 * 同步读取已缓存的 token（供 EventSource / 路由守卫 / STOMP 使用）
 * 注意：首次调用前必须先 await readToken() 初始化缓存
 */
export function syncToken() {
  return rawToken || null
}

/**
 * 清除所有加密存储（登出时调用）
 */
export function clearTokenStorage() {
  localStorage.removeItem(TOKEN_STORE_KEY)
  localStorage.removeItem(KEY_STORE_KEY)
  cachedKey = null
  rawToken = null
  restored = true
}
