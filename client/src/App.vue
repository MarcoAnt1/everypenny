<template>
  <AppLayout v-if="isAuthenticated">
    <template #default>
      <RouterView />
    </template>
  </AppLayout>

  <RouterView v-else />
</template>

<script setup lang="ts">

import { computed } from 'vue';
import { useAuthStore } from './stores/auth.ts';
import AppLayout from './components/AppLayout.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

</script>
