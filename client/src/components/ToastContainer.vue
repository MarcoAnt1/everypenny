<template>
  <div
    class="fixed top-4 right-4 z-[10000] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
      role="alert"
      class="flex items-start gap-3 rounded-lg border shadow-lg px-4 py-3 text-sm"
      :class="styles[t.type]"
    >
      <span>{{ icons[t.type] }}</span>
      <p class="flex-1 break-words">{{ t.message }}</p>
      <button
        type="button"
        class="text-lg leading-none opacity-60 hover:opacity-100"
        @click="remove(t.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useToastStore, type ToastType } from "../stores/toast";

const store = useToastStore();
const { toasts } = storeToRefs(store);
const { remove } = store;

const styles: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-700",
  error: "bg-red-50 border-red-200 text-red-700",
  info: "bg-indigo-50 border-indigo-200 text-indigo-700",
};
const icons: Record<ToastType, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};
</script>
