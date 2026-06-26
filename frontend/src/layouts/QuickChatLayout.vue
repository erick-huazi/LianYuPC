<template>
  <div class="quick-shell">
    <router-view />
  </div>
</template>

<script setup>
import { watch, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { syncElectronTitleBar } from '@/utils/electronCaption'
import { isElectronRuntime } from '@/utils/runtime'
import { getElectronAPI } from '@/utils/electron'

const settingsStore = useSettingsStore()

function syncTheme() {
  settingsStore.initAppearance()
  if (isElectronRuntime()) {
    syncElectronTitleBar({ routeName: 'QuickChat', routePath: '/quick', theme: settingsStore.theme })
    getElectronAPI()?.requestChromeSync?.()
  }
}

function onStorageTheme(e) {
  if (e.key === 'lianyu-theme' || e.key === 'lianyu-accent-color') {
    syncTheme()
  }
}

onMounted(() => {
  syncTheme()
  window.addEventListener('storage', onStorageTheme)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorageTheme)
})

watch(
  () => [settingsStore.theme, settingsStore.accentColor],
  syncTheme,
)
</script>

<style lang="scss">
html:has(.quick-shell),
body:has(.quick-shell),
#app:has(.quick-shell) {
  background: var(--ly-bg-primary, #121820) !important;
  min-height: 100% !important;
  height: 100%;
}

#app:has(.quick-shell)::before {
  display: none !important;
}
</style>

<style lang="scss" scoped>
.quick-shell {
  width: 100%;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background: var(--ly-bg-primary, #121820);
}
</style>
