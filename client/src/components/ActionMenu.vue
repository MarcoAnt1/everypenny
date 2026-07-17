<template>
  <div class="relative" ref="menuRef">
    <!-- Trigger button -->
    <button
      @click.stop="toggle"
      class="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed w-28 bg-white rounded-lg shadow-lg border z-[9999] overflow-hidden py-1"
        :style="dropDownStyle"
      >
        <button
          v-for="action in actions"
          :key="action.label"
          @click.stop="handleAction(action)"
          class="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition"
          :class="
            action.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700'
          "
        >
          <span>{{ action.label }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

interface Action {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

const props = defineProps<{ actions: Action[] }>();

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const dropDownStyle = ref({});

const menuId = Math.random().toString(36).slice(2);

// Must match the dropdown's `w-28` (7rem) and its rendered row height, so the
// flip-up check and right-alignment land where the menu actually is.
const DROPDOWN_WIDTH = 112;
const ROW_HEIGHT = 30;

const calculatePosition = async () => {
  await nextTick();
  if (!menuRef.value) return;

  const rect = menuRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const dropHeight = props.actions.length * ROW_HEIGHT;
  const left = `${rect.right - DROPDOWN_WIDTH}px`;

  const flipUp = spaceBelow < dropHeight && spaceAbove > dropHeight;
  dropDownStyle.value = {
    top: flipUp ? `${rect.top - dropHeight - 4}px` : `${rect.bottom + 4}px`,
    left,
  };
};

const toggle = async () => {
  if (isOpen.value) {
    isOpen.value = false;
    return;
  }

  window.dispatchEvent(
    new CustomEvent("close-action-menus", { detail: menuId }),
  );
  isOpen.value = true;
  await calculatePosition();
};

const handleAction = (action: Action) => {
  action.onClick();
  isOpen.value = false;
};

const handleCloseOthers = (e: Event) => {
  const id = (e as CustomEvent).detail;
  if (id !== menuId ) isOpen.value = false;
}

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

// The dropdown is teleported to <body> and positioned `fixed` from a one-time
// measurement, so any scroll would strand it away from its row. Close instead.
const handleScroll = () => {
  if (isOpen.value) isOpen.value = false;
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("close-action-menus", handleCloseOthers);
  window.addEventListener("scroll", handleScroll, true);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("close-action-menus", handleCloseOthers);
  window.removeEventListener("scroll", handleScroll, true);
});
</script>
