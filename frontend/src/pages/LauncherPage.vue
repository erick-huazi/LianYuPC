<template>
  <div class="launcher-page" @contextmenu.prevent="onContextMenu">
    <transition name="launcher-toast-fade">
      <div v-if="toastText" class="launcher-page__toast" role="status">
        {{ toastText }}
      </div>
    </transition>
    <button
      type="button"
      class="launcher-page__logo"
      :class="{ 'is-shaking': shaking }"
      title="点击快速聊天，按住拖动"
      @pointerdown.prevent="onPointerDown"
    >
      <img :src="APP_LOGO" alt="LianYu" draggable="false" />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { APP_LOGO } from '@/constants/brand.js'
import { getElectronAPI } from '@/utils/electron'

const { t } = useI18n()
const pointerState = ref(null)
const shaking = ref(false)
const toastText = ref('')
let shakeTimer = null
let toastTimer = null
let unsubscribeLauncherMessage = null

function onPointerDown(e) {
  if (e.button !== 0) return
  pointerState.value = {
    startX: e.screenX,
    startY: e.screenY,
    lastX: e.screenX,
    lastY: e.screenY,
    moved: false,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e) {
  const state = pointerState.value
  if (!state) return

  const totalDx = e.screenX - state.startX
  const totalDy = e.screenY - state.startY
  if (!state.moved && (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5)) {
    state.moved = true
  }

  if (state.moved) {
    const dx = e.screenX - state.lastX
    const dy = e.screenY - state.lastY
    state.lastX = e.screenX
    state.lastY = e.screenY
    getElectronAPI()?.moveLauncherByDelta?.(dx, dy)
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  const state = pointerState.value
  if (state && !state.moved) {
    getElectronAPI()?.toggleCharacterPicker?.()
  }
  pointerState.value = null
}

function onContextMenu() {
  getElectronAPI()?.openMainWindow?.('#/app')
}

function showNewMessageHint(payload = {}) {
  const name = payload.characterName || t('launcher.defaultCharacterName')
  toastText.value = t('launcher.newMessageHint', { name })
  shaking.value = true
  clearTimeout(shakeTimer)
  clearTimeout(toastTimer)
  shakeTimer = setTimeout(() => {
    shaking.value = false
  }, 900)
  toastTimer = setTimeout(() => {
    toastText.value = ''
  }, 4200)
}

onMounted(() => {
  unsubscribeLauncherMessage = getElectronAPI()?.onLauncherNewMessage?.(showNewMessageHint)
})

onUnmounted(() => {
  clearTimeout(shakeTimer)
  clearTimeout(toastTimer)
  unsubscribeLauncherMessage?.()
})
</script>

<style lang="scss">
html:has(.launcher-page),
body:has(.launcher-page),
#app:has(.launcher-page) {
  background: transparent !important;
  overflow: hidden;
}
</style>

<style lang="scss" scoped>
.launcher-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 6px;
  box-sizing: border-box;
}

.launcher-page__toast {
  align-self: stretch;
  margin-bottom: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(14, 14, 22, 0.94);
  border: 1px solid rgba(236, 72, 153, 0.28);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  color: #f5f5f7;
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}

.launcher-page__logo {
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 16px;
  background: rgba(10, 10, 16, 0.82);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  touch-action: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 10px 28px rgba(236, 72, 153, 0.25);
  }

  &.is-shaking {
    animation: launcher-shake 0.55s ease-in-out 2;
  }
}

@keyframes launcher-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20% { transform: translateX(-3px) rotate(-4deg); }
  40% { transform: translateX(3px) rotate(4deg); }
  60% { transform: translateX(-2px) rotate(-3deg); }
  80% { transform: translateX(2px) rotate(3deg); }
}

.launcher-toast-fade-enter-active,
.launcher-toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.launcher-toast-fade-enter-from,
.launcher-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
