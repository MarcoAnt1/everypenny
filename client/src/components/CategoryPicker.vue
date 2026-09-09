<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="w-full border rounded-lg px-3 py-2 text-sm text-left truncate focus:outline-none focus:ring-2 focus:ring-indigo-400"
      :class="allowCreate ? 'pr-9' : ''"
      @click="open = !open"
    >
      {{ selectedLabel || placeholder }}
    </button>

    <!-- Inline "create" affordance (e.g. add a new category from a form) -->
    <button
      v-if="allowCreate"
      type="button"
      title="Add new category"
      class="absolute bottom-1 right-1 border rounded-lg px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50 transition whitespace-nowrap"
      @click="onCreate"
    >
      +
    </button>

    <div
      v-if="open"
      class="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto"
    >
      <!-- Clear / "all" row -->
      <div
        class="text-gray-500 px-4 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
        @click="select('')"
      >
        {{ placeholder }}
      </div>

      <div v-for="cat in categories" :key="cat.id" class="px-2">
        <!-- Parent -->
        <div
          class="font-medium text-gray-700 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
          @click="select(cat.id)"
        >
          {{ cat.name }}
        </div>

        <!-- Children -->
        <div class="ml-4">
          <div
            v-for="sub in cat.subcategories"
            :key="sub.id"
            class="text-sm text-gray-600 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer"
            @click="select(sub.id)"
          >
            └ {{ sub.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    categories: any[];
    placeholder?: string;
    allowCreate?: boolean;
  }>(),
  { placeholder: "Select category", allowCreate: false },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "create"): void;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
  if (!props.modelValue) return "";
  for (const cat of props.categories) {
    if (cat.id === props.modelValue) return cat.name;
    const sub = cat.subcategories?.find((s: any) => s.id === props.modelValue);
    if (sub) return sub.name;
  }
  return "";
});

const select = (id: string) => {
  emit("update:modelValue", id);
  open.value = false;
};

const onCreate = () => {
  open.value = false;
  emit("create");
};

const onClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>
