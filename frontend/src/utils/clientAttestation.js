import { getElectronAPI } from '@/utils/electron'

/** REST path as seen by backend servlet, e.g. /api/auth/login */
export function resolveApiPath(url = '') {
  if (!url) return '/api'
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname
    } catch {
      return '/api'
    }
  }
  const path = url.startsWith('/') ? url : `/${url}`
  return path.startsWith('/api/') ? path : `/api${path}`
}

export async function getElectronLoginExtras(existingDeviceId) {
  const api = getElectronAPI()
  if (!api?.getClientAttestMeta) {
    return { headers: {}, body: {} }
  }
  const meta = await api.getClientAttestMeta()
  return {
    headers: meta?.clientHeader ? { 'X-LianYu-Client': meta.clientHeader } : {},
    body: {
      deviceId: existingDeviceId || undefined,
      clientBuildId: meta?.buildId,
    },
  }
}

export async function applyAttestationHeaders(headers, { method, url, data }) {
  const api = getElectronAPI()
  if (!api?.signRequest) return headers

  let bodyText = ''
  if (data !== undefined && data !== null) {
    if (typeof data === 'string') {
      bodyText = data
    } else if (typeof FormData !== 'undefined' && data instanceof FormData) {
      bodyText = ''
    } else {
      bodyText = JSON.stringify(data)
    }
  }

  const signed = await api.signRequest({
    method: (method || 'GET').toUpperCase(),
    apiPath: resolveApiPath(url),
    bodyText,
  })
  if (!signed) return headers
  return { ...headers, ...signed }
}
