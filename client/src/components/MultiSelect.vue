<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="w-full border rounded-lg px-3 py-2 text-sm text-left truncate focus:outline-none focus:ring-2 focus:ring-indigo-400"
      @click="open = !open"
    >
      {{ summary }}
    </button>

    <div
      v-if="open"
      @click.stop
      class="absolute z-50 mt-1 w-full min-w-48 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto p-1"
    >
      <!-- Clear / "all" row -->
      <div
        class="text-gray-500 px-3 py-1.5 text-sm hover:bg-gray-100 rounded cursor-pointer"
        @click="clear"
      >
        {{ placeholder }}
      </div>

      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
        :class="opt.indent ? 'pl-7' : ''"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(opt.value)"
          @change="toggle(opt.value)"
        />
        <span v-if="opt.indent" class="text-gray-300">└</span>
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Option {
  value: string;
  label: string;
  indent?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    options: Option[];
    placeholder?: string;
  }>(),
  { placeholder: "All" },
);

const emit = defineEmits<{ (e: "update:modelValue", value: string[]): void }>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const summary = computed(() => {
  const n = props.modelValue.length;
  if (n === 0) return props.placeholder;
  if (n === 1) {
    return (
      props.options.find((o) => o.value === props.modelValue[0])?.label ??
      "1 selected"
    );
  }
  return `${n} selected`;
});

const toggle = (value: string) => {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value];
  emit("update:modelValue", next);
};

const clear = () => emit("update:modelValue", []);

const onClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>
