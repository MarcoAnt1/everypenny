<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Tags</h2>
        <p class="text-sm text-gray-400">
          Label your transactions for easy filtering
        </p>
      </div>
      <button
        @click="openModal()"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
      >
        + Add Tag
      </button>
    </div>

    <!-- Summary Strip -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Total Tags</p>
        <p class="text-xl font-bold text-indigo-600">{{ tags.length }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Most Used</p>
        <p class="text-xl font-bold text-gray-700">{{ mostUsedTag }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Total Tagged Transactions</p>
        <p class="text-xl font-bold text-gray-700">
          {{ totalTaggedTransactions }}
        </p>
      </div>
    </div>

    <!--Loading -->
    <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

    <!-- Empty -->
    <div v-else-if="tags.length === 0" class="text-center text-gray-400 py-16">
      <p class="text-4xl mb-4">🔖</p>
      <p class="text-lg font-medium">No tags yet</p>
      <p class="text-sm">Create tags to label and filter your transactions</p>
    </div>

    <!-- Tag Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="tag in tags"
        :key="tag.id"
        class="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            :style="{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }"
          >
            {{ tag.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-medium text-gray-800">{{ tag.name }}</p>
            <p class="text-xs text-gray-400">
              {{ tag._count?.transactions || 0 }} transaction{{
                (tag._count?.transactions || 0) !== 1 ? "s" : ""
              }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            @click="openModal(tag)"
            class="flex-1 text-sm text-indigo-600 hover:bg-indigo-50 py-1 rounded transition"
          >
            Edit
          </button>
          <button
            @click="confirmDelete(tag)"
            class="flex-1 text-sm text-red-500 hover:bg-red-50 py-1 rounded transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-800 mb-6">
          {{ editingTag ? "Edit Tag" : "Add Tag" }}
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
            <label class="text-sm text-gray-600 font-medium">Tag Name</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. vacation"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              @keyup.enter="saveTag"
            />
          </div>

          <!-- Color -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Color</label>
            <div class="flex gap-2 mt-1">
              <button
                v-for="c in colorPresets"
                :key="c"
                type="button"
                @click="form.color = c"
                class="w-8 h-8 rounded-full border-2 transition"
                :class="
                  form.color === c
                    ? 'border-gray-800 scale-110'
                    : 'border-transparent'
                "
                :style="{ backgroundColor: c }"
              />
            </div>
          </div>

          <!-- Preview -->
          <div v-if="form.name" class="flex items-center gap-2">
            <p class="text-xs text-gray-400">Preview:</p>
            <span
              class="text-xs px-3 py-1 rounded-full font-medium text-white"
              :style="{ backgroundColor: form.color || DEFAULT_TAG_COLOR }"
            >
              {{ form.name }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-6">
            <button
              @click="closeModal"
              class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              @click="saveTag"
              :disabled="!form.name.trim() || saving"
              class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
            >
              {{
                saving ? "Saving..." : editingTag ? "Save Changes" : "Add Tag"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <DeleteConfirmation
      v-if="showDeleteConfirm"
      :item="'Tag'"
      :item-description="deletingTag?.name"
      @close="showDeleteConfirm = false"
      @deleted="deleteTagConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { getTags, createTag, updateTag, deleteTag } from "../api/tags";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const tags = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingTag = ref<any>(null);
const deletingTag = ref<any>(null);

// Fallback for tags created before colours existed.
const DEFAULT_TAG_COLOR = "#6366f1";

const colorPresets = [
  DEFAULT_TAG_COLOR,
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#6b7280",
];

const defaultForm = { name: "", color: DEFAULT_TAG_COLOR };
const form = ref({ ...defaultForm });

onMounted(async () => await loadTags());

const loadTags = async () => {
  loading.value = true;
  try {
    const res = await getTags();
    tags.value = res.data;
  } catch (error) {
    console.error("Error loading tags:", error);
  } finally {
    loading.value = false;
  }
};

// Summary
const mostUsedTag = computed(() => {
  if (tags.value.length === 0) return "—";
  const sorted = [...tags.value].sort(
    (a, b) => (b._count?.transactions || 0) - (a._count?.transactions || 0),
  );
  return sorted[0]._count?.transactions > 0 ? sorted[0].name : "—";
});

const totalTaggedTransactions = computed(() =>
  tags.value.reduce((sum, t) => sum + (t._count?.transactions || 0), 0),
);

// Add/Edit Modal
const openModal = (tag?: any) => {
  editingTag.value = tag || null;
  form.value = tag
    ? { name: tag.name, color: tag.color || DEFAULT_TAG_COLOR }
    : { ...defaultForm };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingTag.value = null;
  form.value = { ...defaultForm };
  error.value = "";
};

const saveTag = async () => {
  error.value = "";
  saving.value = true;
  try {
    if (editingTag.value) {
      await updateTag(editingTag.value.id, form.value);
    } else {
      await createTag(form.value);
    }
    await loadTags();
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.error ?? "Failed to save tag";
  } finally {
    saving.value = false;
  }
};

// Delete
const confirmDelete = (tag: any) => {
  deletingTag.value = tag;
  showDeleteConfirm.value = true;
};

const deleteTagConfirmed = async () => {
  if (!deletingTag.value) {
    return;
  }
  try {
    await deleteTag(deletingTag.value.id);
    await loadTags();
  } catch (error) {
    console.error("Error deleting tag:", error);
  } finally {
    showDeleteConfirm.value = false;
    deletingTag.value = null;
  }
};
</script>
