import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** 对话框宽度：小屏全宽留白，大屏不超过 defaultPx */
export function useResponsiveDialogWidth(defaultPx = 560) {
  const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

  function syncViewport() {
    viewportWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', syncViewport, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncViewport)
  })

  return computed(() => (
    viewportWidth.value < 600
      ? 'calc(100vw - 24px)'
      : `min(${defaultPx}px, calc(100vw - 32px))`
  ))
}
