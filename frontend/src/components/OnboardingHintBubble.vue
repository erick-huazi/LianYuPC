<template>
  <div
    class="onboarding-hint"
    :class="[
      `onboarding-hint--${placement}`,
      `onboarding-hint--arrow-${arrow}`,
      { 'onboarding-hint--stacked': stackIndex > 0, 'onboarding-hint--compact': compact }
    ]"
    :style="stackStyle"
    data-onboarding-hint
    role="status"
  >
    <span class="onboarding-hint__text"><slot /></span>
    <button
      type="button"
      class="onboarding-hint__close"
      :aria-label="closeLabel"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  placement: {
    type: String,
    default: 'bottom-right'
  },
  arrow: {
    type: String,
    default: 'center'
  },
  closeLabel: {
    type: String,
    default: '关闭'
  },
  stackIndex: {
    type: Number,
    default: 0
  },
  compact: {
    type: Boolean,
    default: false
  }
})

defineEmits(['dismiss'])

const STACK_ROW_HEIGHT = 52

const stackStyle = computed(() => {
  if (props.placement !== 'bottom-right' || props.stackIndex <= 0) return undefined
  return { '--hint-stack-offset': `${props.stackIndex * STACK_ROW_HEIGHT}px` }
})
</script>

<style lang="scss" scoped>
.onboarding-hint {
  position: absolute;
  z-index: $z-header + 4;
  width: max-content;
  max-width: 240px;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  background: rgba($color-bg-secondary, 0.96);
  border: 1px solid rgba($color-pink-rgb, 0.22);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  font-size: $font-size-xs;
  line-height: 1.5;
  color: $color-text-secondary;
  display: flex;
  align-items: flex-start;
  gap: $space-2;
  pointer-events: auto;

  &--compact {
    max-width: 168px;
    text-align: center;
  }

  &--header-item {
    position: relative;
    width: 100%;
    max-width: none;
    text-align: left;
  }

  &--inline-stack {
    position: relative;
    max-width: 260px;
  }

  &--bottom-center {
    left: 50%;
    top: calc(100% + #{$space-2});
    transform: translateX(-50%);
    max-width: 200px;
    text-align: center;
  }

  &--bottom-right {
    right: 0;
    top: calc(100% + #{$space-2} + var(--hint-stack-offset, 0px));
  }

  &--top {
    left: 50%;
    bottom: calc(100% + #{$space-2});
    transform: translateX(-50%);
    max-width: 200px;
    text-align: center;
  }

  &--dock-top {
    left: 50%;
    bottom: calc(100% + #{$space-3});
    transform: translateX(-50%);
    max-width: 220px;
    text-align: center;
    z-index: $z-header + 6;
  }

  &--bottom-center,
  &--header-item,
  &--bottom-right {
    &::before {
      content: '';
      position: absolute;
      top: -6px;
      width: 10px;
      height: 10px;
      background: rgba($color-bg-secondary, 0.96);
      border-left: 1px solid rgba($color-pink-rgb, 0.22);
      border-top: 1px solid rgba($color-pink-rgb, 0.22);
      transform: rotate(45deg);
    }
  }

  &--arrow-center::before {
    left: 50%;
    margin-left: -5px;
  }

  &--arrow-left::before {
    left: 18px;
  }

  &--arrow-right::before {
    right: 18px;
    left: auto;
  }

  &--top::before {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    margin-left: -5px;
    width: 10px;
    height: 10px;
    background: rgba($color-bg-secondary, 0.96);
    border-right: 1px solid rgba($color-pink-rgb, 0.22);
    border-bottom: 1px solid rgba($color-pink-rgb, 0.22);
    transform: rotate(45deg);
  }

  &--dock-top::before {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    margin-left: -5px;
    width: 10px;
    height: 10px;
    background: rgba($color-bg-secondary, 0.96);
    border-right: 1px solid rgba($color-pink-rgb, 0.22);
    border-bottom: 1px solid rgba($color-pink-rgb, 0.22);
    transform: rotate(45deg);
  }
}

.onboarding-hint__text {
  flex: 1;
  min-width: 0;
}

.onboarding-hint__close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: $color-text-muted;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;

  &:hover {
    color: $color-text-primary;
  }
}
</style>
