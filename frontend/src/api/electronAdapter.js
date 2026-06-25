import axios from 'axios'

import { apiBasePath, ensureApiOriginReady } from '@/utils/runtime'

import { getElectronAPI } from '@/utils/electron'



/**

 * Electron 生产包：axios 走主进程 net.request（与桌宠 observe 同路径）。

 * 开发模式仍用 Chromium fetch，便于 DevTools 调试用。

 */

export async function electronMainProcessAdapter(config) {

  const api = getElectronAPI()

  if (!api?.apiRequest) {

    const adapter = axios.getAdapter(config.adapter || axios.defaults.adapter)

    return adapter(config)

  }



  await ensureApiOriginReady()

  const baseURL = config.baseURL || apiBasePath()

  const url = axios.getUri({ ...config, baseURL })



  const headers = {}

  if (config.headers) {

    const h = axios.AxiosHeaders.from(config.headers)

    h.forEach((value, key) => {

      if (value !== undefined && value !== null) {

        headers[key] = value

      }

    })

  }



  let body = config.data

  if (body !== undefined && body !== null && typeof body !== 'string' && !(body instanceof Buffer)) {

    if (typeof FormData !== 'undefined' && body instanceof FormData) {

      throw new Error('FormData must use default adapter')

    }

    body = JSON.stringify(body)

    if (!headers['Content-Type'] && !headers['content-type']) {

      headers['Content-Type'] = 'application/json'

    }

  }



  const bodyText = body === undefined || body === null ? '' : String(body)



  const res = await api.apiRequest({

    method: (config.method || 'get').toUpperCase(),

    url,

    headers,

    body: bodyText || undefined,

    timeout: config.timeout || 60000,

  })



  if (!res?.ok) {

    const err = new Error('Network Error')

    err.code = 'ERR_NETWORK'

    throw err

  }



  let data = res.data

  const contentType = String(res.headers?.['content-type'] || res.headers?.['Content-Type'] || '')

  if (typeof data === 'string' && data && /json/i.test(contentType)) {

    try {

      data = JSON.parse(data)

    } catch {

      /* keep raw */

    }

  }



  return {

    data,

    status: res.status,

    statusText: res.statusText || '',

    headers: res.headers || {},

    config,

    request: {},

  }

}



export function shouldUseMainProcessAdapter(config) {

  if (!import.meta.env.PROD) return false

  const data = config?.data

  if (typeof FormData !== 'undefined' && data instanceof FormData) return false

  return !!getElectronAPI()?.apiRequest

}

