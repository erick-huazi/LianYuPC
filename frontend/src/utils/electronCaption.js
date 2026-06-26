import { getElectronAPI } from '@/utils/electron'

/**
 * Sync Windows titleBarOverlay (min/max/close strip) with app chrome.
 * @param {{ routeName?: string, routePath?: string, theme?: string }} options
 */
export async function syncElectronTitleBar({ routeName = '', routePath = '', theme = 'dark' } = {}) {
  const api = getElectronAPI()
  if (!api?.setTitleBarAppearance) return

  let surface = 'app'
  if (routeName === 'Landing' || routePath === '/') {
    surface = 'landing'
  } else if (routeName === 'Login' || routeName === 'Register') {
    surface = 'auth'
  }

  const mode = theme === 'light' ? 'light' : 'dark'
  const appearance = await api.setTitleBarAppearance({
    surface,
    theme: mode,
  })
  if (appearance?.ok === false) {
    console.warn('[electronCaption] setTitleBarAppearance failed:', appearance.reason)
  }

  if (api.saveAppearance) {
    const saved = await api.saveAppearance(mode)
    if (saved?.ok === false) {
      console.warn('[electronCaption] saveAppearance failed:', saved.reason)
    }
  }

  api.requestChromeSync?.()
}
