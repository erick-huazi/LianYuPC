import { useUserStore } from '@/stores/user'

/** 应用挂载前恢复并校验登录态，避免路由守卫在 token 解密完成前误判未登录 */
export async function bootstrapAuth(pinia) {
  const userStore = useUserStore(pinia)
  return userStore.restoreSession()
}
