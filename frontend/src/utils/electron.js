/** @returns {import('electron').ElectronAPI | null} */
export function getElectronAPI() {
  return typeof window !== 'undefined' ? window.electronAPI || null : null
}

export function isElectronApp() {
  return getElectronAPI()?.isElectron === true
}
