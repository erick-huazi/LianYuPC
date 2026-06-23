import { useUserStore } from '@/stores/user'
import router from '@/router/index.js'
import { readToken, syncToken } from '@/utils/secureToken'
import { PROFILE_CACHE_KEY } from '@/constants/authSession'

const AUTO_ENTRY_PATHS = new Set(['/', '/login', '/register'])

function hasCachedToken() {
  try {
    if (syncToken()) return true
    const profileRaw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (profileRaw) return true
    return !!localStorage.getItem('_ltt')
  } catch {
    return false
  }
}

/** mount 前：有本地凭证则先跳主界面，避免落地页一闪 */
export async function prepareAuthRoute(pinia) {
  await readToken()
  const hashPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
  if (!AUTO_ENTRY_PATHS.has(hashPath)) return

  const userStore = useUserStore(pinia)
  if (userStore.isLoggedIn || hasCachedToken()) {
    await router.replace('/app')
  }
}

/** mount 后后台恢复会话，不阻塞首屏 */
export function bootstrapAuth(pinia) {
  const userStore = useUserStore(pinia)
  return userStore.restoreSession().then((restored) => {
    if (restored) {
      const hashPath = (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
      if (AUTO_ENTRY_PATHS.has(hashPath)) {
        return router.replace('/app')
      }
    }
    return restored
  })
}
