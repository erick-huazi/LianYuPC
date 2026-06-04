import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const AUTO_DISMISS_MS = 5000

function isInsideOnboardingTarget(target) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('[data-onboarding-hint]')
      || target.closest('[data-onboarding-anchor]')
  )
}

/** 首次登录/注册引导：按用户 ID 存 localStorage；5s 自动消失；点击其他区域关闭 */
export function useOnboardingHint(id, options = {}) {
  const { autoDismissMs = AUTO_DISMISS_MS } = options
  const userStore = useUserStore()
  const { userId } = storeToRefs(userStore)

  const dismissed = ref(true)

  function storageKey() {
    if (userId.value == null) return null
    return `lianyu-hint-${userId.value}-${id}`
  }

  function syncDismissed() {
    const key = storageKey()
    dismissed.value = key ? localStorage.getItem(key) === '1' : true
  }

  syncDismissed()
  watch(userId, syncDismissed)

  const visible = computed(() => userId.value != null && !dismissed.value)

  function dismiss() {
    const key = storageKey()
    if (!key || dismissed.value) return
    dismissed.value = true
    localStorage.setItem(key, '1')
  }

  let autoTimer = null
  let listenerAttached = false

  function onPointerDown(event) {
    if (!visible.value) return
    if (isInsideOnboardingTarget(event.target)) return
    dismiss()
  }

  function attachListener() {
    if (listenerAttached) return
    document.addEventListener('pointerdown', onPointerDown, true)
    listenerAttached = true
  }

  function detachListener() {
    if (!listenerAttached) return
    document.removeEventListener('pointerdown', onPointerDown, true)
    listenerAttached = false
  }

  watch(visible, (show) => {
    clearTimeout(autoTimer)
    if (!show) {
      detachListener()
      return
    }
    if (autoDismissMs > 0) {
      autoTimer = window.setTimeout(dismiss, autoDismissMs)
    }
    attachListener()
  }, { immediate: true })

  onBeforeUnmount(() => {
    clearTimeout(autoTimer)
    detachListener()
  })

  return { visible, dismiss }
}
