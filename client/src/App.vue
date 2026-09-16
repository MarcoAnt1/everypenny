<template>
  <AppLayout v-if="isAuthenticated">
    <template #default>
      <RouterView />
    </template>
  </AppLayout>

  <RouterView v-else />

  <ToastContainer />
</template>

<script setup lang="ts">

import { computed } from 'vue';
import { useAuthStore } from './stores/auth';
import AppLayout from './layouts/AppLayout.vue';
import ToastContainer from './components/ToastContainer.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

</script>
