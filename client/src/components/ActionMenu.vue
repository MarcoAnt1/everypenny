<template>
  <div class="relative" ref="menuRef">
    <!-- Trigger button -->
    <button
      @click.stop="isOpen = !isOpen"
      class="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5"
        view-box="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border z-50 overflow-hidden"
      :class="dropUp ? 'botton-full mb-1' : 'top-full'"
    >
      <button
        v-for="action in actions"
        :key="action.label"
        @click.stop="handleAction(action)"
        class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition"
        :class="
          action.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'
        "
      >
        <span>{{ action.icon }}</span>
        <span>{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Action {
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}

const props = defineProps<{
  actions: Action[];
  dropUp?: boolean;
}>();

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const handleAction = (action: Action) => {
  action.onClick();
  isOpen.value = false;
};

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>
