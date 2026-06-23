import { useUserStore } from '@/stores/user'
import router from '@/router/index.js'

const AUTO_ENTRY_PATHS = new Set(['/', '/login', '/register'])

/** 应用挂载前恢复并校验登录态，有效凭证则跳过落地页直接进入主界面 */
export async function bootstrapAuth(pinia) {
  const userStore = useUserStore(pinia)
  const restored = await userStore.restoreSession()
  if (restored) {
    const hashPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
    if (AUTO_ENTRY_PATHS.has(hashPath)) {
      await router.replace('/app')
    }
  }
  return restored
}
