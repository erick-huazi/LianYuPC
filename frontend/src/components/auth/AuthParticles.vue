<template>
  <canvas
    ref="canvasRef"
    class="auth-particles"
    aria-hidden="true"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)

const ROSE = { r: 244, g: 166, b: 181 }
const LILAC = { r: 168, g: 148, b: 220 }
const PEARL = { r: 255, g: 240, b: 245 }
const MIST = { r: 140, g: 180, b: 220 }

let rafId = 0
let particles = []
let width = 0
let height = 0
let dpr = 1
let mouseX = 0.5
let mouseY = 0.5
let reducedMotion = false

function pickPalette() {
  const roll = Math.random()
  if (roll < 0.5) return ROSE
  if (roll < 0.75) return LILAC
  if (roll < 0.9) return PEARL
  return MIST
}

function particleCount() {
  const area = width * height
  if (area < 400_000) return 40
  if (area < 800_000) return 58
  return 78
}

function spawnParticle(randomY = false) {
  const palette = pickPalette()
  const depth = 0.3 + Math.random() * 0.7
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + Math.random() * 48,
    vx: (Math.random() - 0.5) * 0.28 * depth,
    vy: -(0.1 + Math.random() * 0.42) * depth,
    size: (1 + Math.random() * 3.2) * depth,
    glow: 0.4 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.0035 + Math.random() * 0.012,
    palette,
    depth,
  }
}

function initParticles() {
  particles = []
  const n = particleCount()
  for (let i = 0; i < n; i++) {
    particles.push(spawnParticle(true))
  }
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return

  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  initParticles()
}

function drawParticle(ctx, p, time) {
  const twinkle = 0.4 + 0.6 * Math.sin(time * p.twinkle + p.phase)
  const parallaxX = (mouseX - 0.5) * 22 * p.depth
  const parallaxY = (mouseY - 0.5) * 14 * p.depth
  const x = p.x + parallaxX
  const y = p.y + parallaxY
  const { r, g, b } = p.palette
  const alpha = p.glow * twinkle

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5)
  gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.9})`)
  gradient.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.3})`)
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, p.size * 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`
  ctx.beginPath()
  ctx.arc(x, y, p.size * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function tick(time) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  if (!reducedMotion) {
    for (const p of particles) {
      p.x += p.vx + Math.sin(time * 0.00035 + p.phase) * 0.08 * p.depth
      p.y += p.vy

      if (p.y < -40) {
        Object.assign(p, spawnParticle(false))
        p.y = height + 12
      }
      if (p.x < -24) p.x = width + 24
      if (p.x > width + 24) p.x = -24

      drawParticle(ctx, p, time)
    }
  } else {
    for (const p of particles) {
      drawParticle(ctx, p, time * 0.15)
    }
  }

  rafId = requestAnimationFrame(tick)
}

function onMouseMove(e) {
  mouseX = e.clientX / Math.max(width, 1)
  mouseY = e.clientY / Math.max(height, 1)
}

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(rafId)
  } else {
    rafId = requestAnimationFrame(tick)
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.auth-particles {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  opacity: 0.9;
  mix-blend-mode: screen;
}

@media (prefers-reduced-motion: reduce) {
  .auth-particles {
    opacity: 0.4;
  }
}
</style>
