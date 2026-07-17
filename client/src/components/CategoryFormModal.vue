<template>
  <div
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-800 mb-6">
        {{
          category
            ? "Edit Category"
            : parentId
              ? "Add Subcategory"
              : "Add Category"
        }}
      </h3>

      <div
        v-if="error"
        class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4"
      >
        {{ error }}
      </div>

      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="text-sm text-gray-600 font-medium">Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Food"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <!-- Icon -->
        <div>
          <label class="text-sm text-gray-600 font-medium">Icon (emoji)</label>
          <input
            v-model="form.icon"
            type="text"
            placeholder="e.g. 🍔"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <!-- Parent Category (read only if set) -->
        <div v-if="parentId && !category">
          <label class="text-sm text-gray-600 font-medium"
            >Parent Category</label
          >
          <p
            class="mt-1 text-sm text-indigo-600 font-medium px-3 py-2 bg-indigo-50 rounded-lg"
          >
            {{ parentName }}
          </p>
        </div>

        <!-- Parent selector on edit -->
        <div v-if="category">
          <label class="text-sm text-gray-600 font-medium"
            >Parent Category (optional)</label
          >
          <select
            v-model="form.parentId"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">None (top level)</option>
            <option v-for="cat in parentOptions" :key="cat.id" :value="cat.id">
              {{ cat.icon || "📁" }} {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            @click="emit('close')"
            class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            @click="save"
            :disabled="!form.name || saving"
            class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
          >
            {{
              saving ? "Saving..." : category ? "Save Changes" : "Add Category"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  getCategories,
  createCategory,
  updateCategory,
} from "../api/categories";

const props = defineProps<{
  category?: any;
  parentId?: string;
  parentName?: string;
}>();

const emit = defineEmits(["close", "saved"]);

const saving = ref(false);
const error = ref("");
const allCategories = ref<any[]>([]);

const form = ref({
  name: props.category?.name || "",
  icon: props.category?.icon || "",
  parentId: props.category?.parentId || "",
});

onMounted(async () => {
  try {
    const res = await getCategories();
    allCategories.value = res.data;
  } catch (err) {
    console.error("Error loading categories:", err);
  }
});

// Options for parent selector (exclude self when editing)
const parentOptions = computed(() =>
  allCategories.value.filter((c) => !c.parentId && c.id !== props.category?.id),
);

const save = async () => {
  if (!form.value.name.trim()) return;

  error.value = "";
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      parentId: form.value.parentId || null,
    };

    let saved: any;
    if (props.category) {
      const res = await updateCategory(props.category.id, payload);
      saved = res.data;
    } else {
      const res = await createCategory(payload);
      saved = res.data;
    }

    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    error.value = err.response?.data?.error || "Failed to save category";
  } finally {
    saving.value = false;
  }
};
</script>
