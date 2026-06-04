/** 将 fetch/axios 等底层英文错误转为用户可读中文 */
const TECHNICAL_RULES = [
  { test: /failed to fetch|fetch failed|network error|networkrequestfailed/i, message: '无法连接服务器，请确认网络正常且后端已启动' },
  { test: /ECONNABORTED|timeout|timed out/i, message: '请求超时，请稍后再试' },
  { test: /abort(ed)?/i, message: '请求已取消' },
  { test: /unexpected token|<!doctype/i, message: '服务响应异常，请稍后再试' },
  { test: /^TypeError:|^ReferenceError:|^SyntaxError:/i, message: '操作失败，请刷新页面后重试' },
  { test: /ECONNREFUSED|connection refused/i, message: '无法连接服务器，请确认后端已启动' },
  { test: /401|unauthorized|未登录|token/i, message: '登录已过期，请重新登录' },
]

/**
 * @param {unknown} error - Error、axios error 或字符串
 * @param {string} [fallback='操作失败，请稍后再试']
 */
export function humanizeError(error, fallback = '操作失败，请稍后再试') {
  const raw = extractRawMessage(error)
  if (!raw) return fallback

  for (const rule of TECHNICAL_RULES) {
    if (rule.test.test(raw)) return rule.message
  }

  // 纯英文短句且含技术词，不直接展示
  if (/^[A-Za-z0-9\s:._\-/]+$/.test(raw) && /error|exception|failed|null|undefined|socket|stream/i.test(raw)) {
    return fallback
  }

  return raw
}

function extractRawMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return error.trim()
  if (typeof error.message === 'string' && error.message.trim()) return error.message.trim()
  const bodyMsg = error.response?.data?.message
  if (typeof bodyMsg === 'string' && bodyMsg.trim()) return bodyMsg.trim()
  return ''
}
