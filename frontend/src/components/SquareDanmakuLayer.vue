<template>
  <div ref="layerRef" class="danmaku-layer" aria-hidden="true" />
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useSquareDanmaku } from '@/composables/useSquareDanmaku'

const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
})

const layerRef = ref(null)
const commentsRef = toRef(props, 'comments')

useSquareDanmaku(layerRef, commentsRef)
</script>

<style lang="scss" scoped>
.danmaku-layer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42px;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}

:deep(.danmaku-item) {
  position: absolute;
  top: 0;
  left: 0;
  max-width: 70%;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(232, 237, 242, 0.95);
  background: rgba(10, 10, 16, 0.72);
  backdrop-filter: blur(4px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  will-change: transform;
}

:deep(.danmaku-item--mine) {
  color: #1a1a24;
  font-weight: $font-weight-bold;
  background: linear-gradient(135deg, #ffd866 0%, #f5b042 100%);
  box-shadow: 0 0 12px rgba(245, 176, 66, 0.45), 0 1px 4px rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>
