import { useUserStore } from '@/stores/user'
import router from '@/router/index.js'
import { readToken, syncToken, syncSetTokenCache } from '@/utils/secureToken'
import { PROFILE_CACHE_KEY } from '@/constants/authSession'

const AUTO_ENTRY_PATHS = new Set(['/', '/login', '/register'])

function hydrateProfileFromCache(userStore) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (raw) userStore.applyProfile(JSON.parse(raw))
  } catch {
    // ignore corrupt cache
  }
}

/** mount 前：已解密 token 则进主界面，避免仅凭 profile 残留误判已登录 */
export async function prepareAuthRoute(pinia) {
  await readToken()
  const hashPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
  if (!AUTO_ENTRY_PATHS.has(hashPath)) return

  const cachedToken = syncToken()
  if (!cachedToken) return

  const userStore = useUserStore(pinia)
  userStore.token = cachedToken
  syncSetTokenCache(cachedToken)
  hydrateProfileFromCache(userStore)
  await router.replace('/app')
}

/** mount 后恢复完整会话（profile + 主进程同步） */
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
