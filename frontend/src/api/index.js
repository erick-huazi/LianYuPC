import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiBasePath } from '@/utils/runtime'
import { humanizeError } from '@/utils/errorMessage'

const http = axios.create({
  baseURL: apiBasePath(),
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor — inject Sa-Token
http.interceptors.request.use(config => {
  const token = localStorage.getItem('lianyu-token')
  if (token) {
    config.headers['lianyu-token'] = token
  }
  const traceId = generateTraceId()
  config.headers['X-Trace-Id'] = traceId
  return config
})

// Response interceptor — unwrap Result<T>, handle errors
http.interceptors.response.use(
  response => {
    const body = response.data
    // If response follows Result<T> format
    if (body && typeof body.code === 'number') {
      if (body.code === 200) {
        return body.data
      }
      // Token expired
      if (body.code === 401) {
        clearSessionAndGoLanding()
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }
      const msg = humanizeError(body.message, '请求失败，请稍后再试')
      ElMessage.error(msg)
      return Promise.reject(new Error(msg))
    }
    // Non-Result response
    return body
  },
  error => {
    if (error.response?.status === 401) {
      clearSessionAndGoLanding()
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    const fallback = error.response?.status >= 500
      ? '服务暂时不可用，请稍后再试'
      : '网络异常，请检查连接后重试'
    const msg = humanizeError(error, fallback)
    const skipToast = error.config?.skipGlobalError === true
    if (!skipToast && error.response?.status !== 401) {
      ElMessage.error(msg)
    }
    return Promise.reject(new Error(msg))
  }
)

function generateTraceId() {
  return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36)
}

/** 未登录/登录过期：回营销首页，而非强制打开登录页 */
function clearSessionAndGoLanding() {
  localStorage.removeItem('lianyu-token')
  localStorage.removeItem('lianyu-token-name')
  const hash = window.location.hash || ''
  if (!hash.includes('#/login') && !hash.includes('#/register')) {
    window.location.hash = '#/'
  }
}

export default http
