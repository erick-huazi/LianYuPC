/**
 * 渲染进程反调试 — 只在 Electron 生产环境下激活。
 * - debugger 语句检测循环：每 100ms 检查，发现则强制退出
 * - Console 清洗：生产环境抹掉 console.log/warn/error 痕迹
 * - 属性覆盖检测：防止 `console.clear` 等原生方法被 Hook
 */

let timer = null

/** 反调试主入口（仅 Electron 生产环境执行） */
export function initAntiDebug() {
  if (import.meta.env.DEV) return
  if (!window.electronAPI?.isElectron) return

  initDebuggerLoop()
  initConsoleHardening()
}

function initDebuggerLoop() {
  // 使用 debugger 语句检测调试器是否附加
  // 如果浏览器 DevTools 打开，遇到 debugger 语句会暂停；否则直接跳过
  let last = performance.now()
  function check() {
    const now = performance.now()
    // 若两次检查间隔超过 500ms，说明 debugger 语句触发了暂停（调试器已附加）
    if (now - last > 500) {
      // 检测到调试器！清理关键信息并通知主进程退出
      localStorage.clear()
      sessionStorage.clear()
      window.electronAPI?.quitApp?.()
      return
    }
    last = now
    // eslint-disable-next-line no-debugger
    debugger
    timer = setTimeout(check, 100)
  }
  timer = setTimeout(check, 100)
}

function initConsoleHardening() {
  // 生产环境拆除 console（防止通过 console 注入或泄露信息）
  const noop = () => {}
  const methods = ['log', 'info', 'debug', 'warn', 'error', 'trace', 'dir', 'table', 'group', 'groupEnd', 'time', 'timeEnd', 'count', 'clear']
  for (const m of methods) {
    try {
      Object.defineProperty(window.console, m, {
        get() { return noop },
        set() {},
        configurable: false,
        enumerable: true,
      })
    } catch {
      // 可能已被冻结，忽略
    }
  }
}
