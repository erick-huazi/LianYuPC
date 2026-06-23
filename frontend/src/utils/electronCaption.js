import { getElectronAPI } from '@/utils/electron'

/**
 * Sync Windows titleBarOverlay (min/max/close strip) with app chrome.
 * @param {{ routeName?: string, routePath?: string, theme?: string }} options
 */
export function syncElectronTitleBar({ routeName = '', routePath = '', theme = 'dark' } = {}) {
  const api = getElectronAPI()
  if (!api?.setTitleBarAppearance) return

  let surface = 'app'
  if (routeName === 'Landing' || routePath === '/') {
    surface = 'landing'
  } else if (routeName === 'Login' || routeName === 'Register') {
    surface = 'auth'
  }

  void api.setTitleBarAppearance({
    surface,
    theme: theme === 'light' ? 'light' : 'dark',
  })
}
