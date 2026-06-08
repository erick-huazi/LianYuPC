import { onBeforeUnmount, onMounted, ref } from 'vue'

const SCROLL_UP_THRESHOLD = 80
const SCROLL_BOTTOM_THRESHOLD = 20

/**
 * 聊天消息区滚动：用户上翻时不自动拉底，提供「回到底部」按钮。
 */
export function useChatScroll(containerRef, anchorRef) {
  const isUserScrolledUp = ref(false)
  let detachScrollListener = null

  function distanceFromBottom(el) {
    if (!el) return 0
    return el.scrollHeight - el.scrollTop - el.clientHeight
  }

  function updateScrollState() {
    const el = containerRef.value
    if (!el) return
    const dist = distanceFromBottom(el)
    isUserScrolledUp.value = dist > SCROLL_UP_THRESHOLD
    if (dist <= SCROLL_BOTTOM_THRESHOLD) {
      isUserScrolledUp.value = false
    }
  }

  function scrollToBottom({ force = false, behavior = 'smooth' } = {}) {
    if (!force && isUserScrolledUp.value) return
    anchorRef.value?.scrollIntoView({ behavior })
    if (force) {
      isUserScrolledUp.value = false
    }
  }

  function jumpToBottom() {
    scrollToBottom({ force: true })
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return
    const onScroll = () => updateScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })
    detachScrollListener = () => el.removeEventListener('scroll', onScroll)
    updateScrollState()
  })

  onBeforeUnmount(() => {
    detachScrollListener?.()
    detachScrollListener = null
  })

  return {
    isUserScrolledUp,
    scrollToBottom,
    jumpToBottom,
    updateScrollState
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const MIN_REPLY_DISPLAY_MS = 1500
