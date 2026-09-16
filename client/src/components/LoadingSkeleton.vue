<template>
  <!-- Card grid skeleton -->
  <div
    v-if="variant === 'cards'"
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  >
    <div
      v-for="n in count"
      :key="n"
      class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
      </div>
      <div class="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div class="h-3 bg-gray-100 rounded w-1/2"></div>
    </div>
  </div>

  <!-- List / table skeleton -->
  <div
    v-else
    class="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100"
  >
    <div
      v-for="n in count"
      :key="n"
      class="flex items-center gap-4 p-4 animate-pulse"
    >
      <div class="h-3 bg-gray-200 rounded w-20 shrink-0"></div>
      <div class="h-3 bg-gray-100 rounded flex-1"></div>
      <div class="h-3 bg-gray-100 rounded w-24 hidden sm:block"></div>
      <div class="h-3 bg-gray-200 rounded w-16 shrink-0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ variant?: "cards" | "list"; count?: number }>(),
  { variant: "cards", count: 6 },
);
</script>
