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
import { userAuthStore } from './stores/auth.ts';
import AppLayout from './components/AppLayout.vue';

const authStore = userAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

</script>
