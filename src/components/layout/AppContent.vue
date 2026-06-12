<script setup lang="ts">
import { NLayoutContent } from 'naive-ui'
</script>

<template>
  <NLayoutContent class="app-content">
    <div class="content-wrapper">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </NLayoutContent>
</template>

<style scoped>
.app-content {
  flex: 1;
  overflow-y: auto;
}

.content-wrapper {
  max-width: 95%;
  margin: 0 auto;
  padding: 24px 16px;
}
</style>
