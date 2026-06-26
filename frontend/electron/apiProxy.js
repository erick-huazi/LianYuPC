/**
 * 主进程 HTTP 代理 — 与桌宠 observe 相同走 net.request + defaultSession 证书 pin。
 * 渲染进程 axios 在打包版经 IPC 调用，避免 partition/CORS/axios-fetch 差异导致请求发不出去。
 */
import { net } from 'electron'

const MAX_BODY_BYTES = 20 * 1024 * 1024

function normalizeHeaders(raw = {}) {
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue
    out[String(key)] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  return out
}

function collectBody(body) {
  if (body === undefined || body === null || body === '') return null
  if (typeof body === 'string') return body
  if (Buffer.isBuffer(body)) return body
  return JSON.stringify(body)
}

export function performApiRequest({ method = 'GET', url, headers = {}, body, timeoutMs = 60000 }) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string') {
      reject(new Error('api:request missing url'))
      return
    }

    const payload = collectBody(body)
    if (payload && Buffer.byteLength(payload) > MAX_BODY_BYTES) {
      reject(new Error('api:request body too large'))
      return
    }

    const req = net.request({
      method: (method || 'GET').toUpperCase(),
      url,
      headers: normalizeHeaders(headers),
    })

    let settled = false
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }

    const timer = setTimeout(() => {
      try {
        req.abort()
      } catch {
        /* ignore */
      }
      finish(reject, new Error('api:request timeout'))
    }, Math.max(1000, timeoutMs || 60000))

    req.on('response', (res) => {
      const chunks = []
      res.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8')
        finish(resolve, {
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: res.headers || {},
          data,
        })
      })
      res.on('error', (err) => finish(reject, err))
    })

    req.on('error', (err) => finish(reject, err))

    if (payload) {
      req.end(payload)
    } else {
      req.end()
    }
  })
}
