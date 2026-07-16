<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Categories</h2>
        <p class="text-sm text-gray-400">Organize your transactions</p>
      </div>
      <button
        @click="openModal()"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
      >
        + Add Category
      </button>
    </div>

    <!-- Summary Strip -->
    <div class="grid gap-4">
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Total</p>
        <p class="text-xl font-bold text-indigo-600">{{ categories.length }}</p>
      </div>
    </div>

    <!--Loading -->
    <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

    <!-- Empty -->
    <div
      v-else-if="categories.length === 0"
      class="text-center text-gray-400 py-16"
    >
      <p class="text-4xl mb-4">💸</p>
      <p class="text-lg font-medium">No categories yet</p>
      <p class="text-sm">Create your first category to organize transactions</p>
    </div>

    <div v-else class="grid bg-white rounded-xl shadow-sm p-6">
      <ul class="space-y-2">
        <li v-for="cat in categories" :key="cat.id">
          <!-- Parent Category -->
          <div
            class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center gap-2">
              <span>{{ cat.icon || "📁" }}</span>
              <span class="text-sm font-medium text-gray-700">{{
                cat.name
              }}</span>
              <span
                v-if="cat.subcategories?.length"
                class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >
                {{ cat.subcategories.length }} sub
              </span>
            </div>
            <div class="flex gap-2">
              <button
                @click="openModal(undefined, cat.id)"
                class="text-xs text-indigo-500 hover:text-indigo-700"
              >
                + Sub
              </button>
              <template v-if="cat.userId">
                <button
                  @click="openModal(cat)"
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  Edit
                </button>
                <button
                  @click="confirmDelete(cat)"
                  class="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </template>
              <span v-else class="text-xs text-gray-300">System</span>
            </div>
          </div>

          <!-- Subcategories -->
          <ul v-if="cat.subcategories?.length" class="ml-6 mt-1 space-y-1">
            <li
              v-for="sub in cat.subcategories"
              :key="sub.id"
              class="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <div class="flex items-center gap-2">
                <span class="text-gray-300">└</span>
                <span>{{ sub.icon || "📄" }}</span>
                <span class="text-sm text-gray-600">{{ sub.name }}</span>
              </div>
              <div class="flex gap-2" v-if="sub.userId">
                <button
                  @click="openModal(sub)"
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  Edit
                </button>
                <button
                  @click="confirmDelete(sub)"
                  class="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <CategoryForModal
      v-if="showModal"
      :category="editingCategory"
      :parent-id="parentId || undefined"
      :parent-name="parentCategoryName"
      @close="closeModal"
      @saved="loadCategories()"
    />

    <DeleteConfirmation
      v-if="showDeleteConfirm"
      :item="'Category'"
      :item-description="deletingCategory?.name"
      @close="showDeleteConfirm = false"
      @deleted="deleteCategoryConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { getCategories, deleteCategory } from "../api/categories";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";
import CategoryForModal from "../components/CategoryForModal.vue";

const loading = ref(true);
const categories = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingCategory = ref<any>(null);
const deletingCategory = ref<any>(null);
const parentId = ref<string | null>(null);

onMounted(async () => await loadCategories());

const loadCategories = async () => {
  loading.value = true;
  try {
    const res = await getCategories();
    categories.value = res.data;
  } catch (error) {
    console.error("Error loading categories:", error);
  } finally {
    loading.value = false;
  }
};

// Parent name for display
const parentCategoryName = computed(() => {
  if (!parentId.value) return "";

  return categories.value.find((c) => c.id === parentId.value)?.name || "";
});

// Modal
const openModal = (category?: any, presentParentId?: string) => {
  editingCategory.value = category || null;
  parentId.value = presentParentId || null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingCategory.value = null;
};

// Delete
const confirmDelete = (category: any) => {
  deletingCategory.value = category;
  showDeleteConfirm.value = true;
};

const deleteCategoryConfirmed = async () => {
  if (!deletingCategory.value) {
    return;
  }
  try {
    await deleteCategory(deletingCategory.value.id);
    await loadCategories();
  } catch (error) {
    console.error("Error deleting category:", error);
  } finally {
    showDeleteConfirm.value = false;
    deletingCategory.value = null;
  }
};
</script>
