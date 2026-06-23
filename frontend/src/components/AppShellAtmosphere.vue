<template>
  <div class="app-atmosphere" aria-hidden="true">
    <div class="app-atmosphere__mesh" />
    <div class="app-atmosphere__orb app-atmosphere__orb--a" />
    <div class="app-atmosphere__orb app-atmosphere__orb--b" />
    <div class="app-atmosphere__grain" />
  </div>
</template>

<style lang="scss" scoped>
.app-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

:global(html:not(.dark)) .app-atmosphere {
  display: none;
}

.app-atmosphere__mesh {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 55% at 12% 8%, rgba($color-pink-rgb, 0.11) 0%, transparent 58%),
    radial-gradient(ellipse 55% 45% at 88% 18%, rgba(var(--ly-bg-surface-rgb), 0.45) 0%, transparent 52%),
    radial-gradient(ellipse 80% 60% at 50% 100%, rgba($color-pink-rgb, 0.06) 0%, transparent 55%);
}

.app-atmosphere__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
  animation: appOrbDrift 18s ease-in-out infinite;

  &--a {
    width: 280px;
    height: 280px;
    top: 12%;
    right: -4%;
    background: rgba($color-pink-rgb, 0.14);
  }

  &--b {
    width: 220px;
    height: 220px;
    bottom: 18%;
    left: -6%;
    background: rgba(var(--ly-bg-surface-rgb), 0.35);
    animation-delay: -9s;
  }
}

.app-atmosphere__grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@keyframes appOrbDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-12px, 16px) scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
  .app-atmosphere__orb {
    animation: none;
  }
}
</style>
