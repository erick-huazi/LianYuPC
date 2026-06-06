import { onMounted, onUnmounted } from 'vue'
import { PET_ANIMATIONS, PET_FRAME_H, PET_FRAME_W } from '@/constants/petSprite'

/** 待机时随机小动作（权重越高越常见） */
const IDLE_VARIETY = [
  { name: 'waiting', weight: 3, loop: true },
  { name: 'running', weight: 2, loop: true },
  { name: 'review', weight: 2, loop: false },
  { name: 'wave', weight: 1, loop: false },
  { name: 'jump', weight: 1, loop: false },
  { name: 'failed', weight: 1, loop: false },
]

function pickIdleVariety() {
  const total = IDLE_VARIETY.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of IDLE_VARIETY) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return IDLE_VARIETY[0]
}

/**
 * Canvas 逐帧绘制 spritesheet，使用 requestAnimationFrame 与屏幕刷新同步。
 */
export function usePetSpriteAnimator(canvasRef) {
  let rafId = null
  let frame = 0
  let currentName = 'idle'
  let animDef = PET_ANIMATIONS.idle
  let spriteImage = null
  let onCompleteCb = null
  let idleVarietyTimer = null
  let ctx = null
  /** rAF 调用计数，用于按 FPS 控制帧步进 */
  let tickCount = 0

  function ensureCtx() {
    const canvas = canvasRef.value
    if (!canvas) return null
    if (!ctx) {
      ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    }
    return ctx
  }

  function stopRaf() {
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function setupCanvasSize() {
    const canvas = canvasRef.value
    const context = ensureCtx()
    if (!canvas || !context) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(PET_FRAME_W * dpr)
    canvas.height = Math.round(PET_FRAME_H * dpr)
    canvas.style.width = `${PET_FRAME_W}px`
    canvas.style.height = `${PET_FRAME_H}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.imageSmoothingEnabled = false
  }

  function renderFrame() {
    const canvas = canvasRef.value
    const context = ensureCtx()
    if (!canvas || !context || !animDef || !spriteImage) return
    context.clearRect(0, 0, PET_FRAME_W, PET_FRAME_H)
    context.drawImage(
      spriteImage,
      frame * PET_FRAME_W,
      animDef.row * PET_FRAME_H,
      PET_FRAME_W,
      PET_FRAME_H,
      0,
      0,
      PET_FRAME_W,
      PET_FRAME_H,
    )
  }

  function setSpriteImage(img) {
    spriteImage = img
    setupCanvasSize()
    renderFrame()
  }

  function playAnim(name, { loop, onComplete } = {}) {
    const def = PET_ANIMATIONS[name]
    if (!def) return
    stopRaf()
    currentName = name
    animDef = def
    frame = 0
    tickCount = 0
    onCompleteCb = onComplete || null
    const shouldLoop = loop ?? def.loop
    renderFrame()

    /** 每 monitor 刷新帧调用一次，根据目标 fps 决定是否步进动画帧 */
    function tick() {
      tickCount += 1
      const stepsPerSecond = 60 // 以 60fps 基准计算；desynchronized canvas 会让 rAF 机会更宽松
      const stepInterval = Math.max(1, Math.round(stepsPerSecond / def.fps))
      if (tickCount % stepInterval === 0) {
        frame += 1
        if (frame >= def.frames) {
          if (shouldLoop) {
            frame = 0
          } else {
            rafId = null
            const cb = onCompleteCb
            onCompleteCb = null
            cb?.()
            if (currentName === name) {
              playAnim('idle')
            }
            return
          }
        }
        renderFrame()
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function playAnimOnce(name, onComplete) {
    playAnim(name, { loop: false, onComplete: onComplete || (() => playAnim('idle')) })
  }

  function returnToIdle() {
    playAnim('idle')
  }

  function scheduleIdleVariety() {
    clearTimeout(idleVarietyTimer)
    const delay = 6000 + Math.random() * 10000
    idleVarietyTimer = setTimeout(() => {
      if (currentName !== 'idle') {
        scheduleIdleVariety()
        return
      }
      const pick = pickIdleVariety()
      playAnim(pick.name, { loop: pick.loop })
      scheduleIdleVariety()
    }, delay)
  }

  onMounted(() => {
    setupCanvasSize()
    playAnim('idle')
    scheduleIdleVariety()
  })

  onUnmounted(() => {
    stopRaf()
    clearTimeout(idleVarietyTimer)
    ctx = null
  })

  return { playAnim, playAnimOnce, returnToIdle, setSpriteImage }
}
