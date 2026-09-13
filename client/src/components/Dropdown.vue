<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      :disabled="disabled"
      class="w-full border rounded-lg px-3 py-2 text-sm text-left truncate focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      @click="open = !open"
    >
      {{ selectedLabel }}
    </button>

    <div
      v-if="open"
      @click.stop
      class="absolute z-50 mt-1 w-full min-w-40 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto p-1"
    >
      <div
        v-for="opt in options"
        :key="opt.value"
        class="px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-gray-100"
        :class="
          opt.value === modelValue
            ? 'bg-indigo-50 text-indigo-600 font-medium'
            : 'text-gray-700'
        "
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Option {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  { placeholder: "Select", disabled: false },
);

const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(
  () =>
    props.options.find((o) => o.value === props.modelValue)?.label ??
    props.placeholder,
);

const select = (value: string) => {
  emit("update:modelValue", value);
  open.value = false;
};

const onClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>
