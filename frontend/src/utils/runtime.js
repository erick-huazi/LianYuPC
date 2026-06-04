/** 是否在 Electron 桌面端运行 */
export function isElectronRuntime() {
  return typeof window !== 'undefined' && (
    window.electronAPI?.isElectron === true
    || /Electron/i.test(window.navigator.userAgent)
  )
}

const DEFAULT_API_ORIGIN = 'http://localhost:8080'

/** Electron 下 API 根地址（VITE_LIANYU_API_ORIGIN 或默认 localhost） */
export function resolveApiOrigin() {
  const configured = import.meta.env.VITE_LIANYU_API_ORIGIN
  const trimmed = configured && String(configured).trim()
  return trimmed || DEFAULT_API_ORIGIN
}

/** HTTP API 根（Electron 直连后端；浏览器走同源 nginx） */
export function apiOrigin() {
  return isElectronRuntime() ? resolveApiOrigin() : ''
}

/** REST API 前缀，与 axios baseURL 一致 */
export function apiBasePath() {
  return `${apiOrigin()}/api`
}

/** Service Worker 脚本地址（Electron file:// 下须相对路径） */
export function resolveServiceWorkerUrl() {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}sw.js`
}

/** 浏览器端是否可走标准 Web Push（Electron file:// 不支持） */
export function canUseWebPush() {
  return !isElectronRuntime()
    && typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
}

/** WebSocket STOMP 地址 */
export function buildWsUrl() {
  if (isElectronRuntime()) {
    const origin = resolveApiOrigin()
    try {
      const url = new URL(origin)
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProtocol}//${url.host}/ws`
    } catch {
      return 'ws://localhost:8080/ws'
    }
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}
