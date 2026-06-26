<template>
  <LauncherPickPanel />
</template>

<script setup>
import LauncherPickPanel from '@/components/LauncherPickPanel.vue'
</script>

<style lang="scss">
html:has(.launcher-pick),
body:has(.launcher-pick),
#app:has(.launcher-pick) {
  background: transparent !important;
}
</style>
