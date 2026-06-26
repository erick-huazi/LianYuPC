import { useUserStore } from '@/stores/user'
import { getElectronAPI } from '@/utils/electron'

/** 桌宠 / 角色选择器窗口：恢复登录态（不写回主进程，避免竞态覆盖 token） */
export async function bootstrapLauncherSession(pinia) {
  const userStore = useUserStore(pinia)
  if (!userStore.isLoggedIn) {
    const restored = await userStore.restoreSession()
    if (!restored) return false
  }
  getElectronAPI()?.setLoginState?.(true)
  getElectronAPI()?.requestChromeSync?.()
  return userStore.isLoggedIn
}
