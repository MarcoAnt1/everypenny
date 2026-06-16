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
                <span>{{ cat.icon || "📄" }}</span>
                <span class="text-sm text-gray-600">{{ sub.name }}</span>
              </div>
              <div class="flex gap-2">
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

    <!-- Add/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-800 mb-6">
          {{
            editingCategory
              ? "Edit Category"
              : parentId
                ? "Add Subcategory"
                : "Add Category"
          }}
        </h3>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Name</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Food"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo 400"
            />
          </div>

          <!-- Type -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Type</label>
            <div class="flex gap-3 mt-1">
              <button
                @click="form.type = 'expense'"
                :class="
                  form.type === 'expense'
                    ? 'flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium'
                    : 'flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50'
                "
              >
                💸 Expense
              </button>
              <button
                @click="form.type = 'income'"
                :class="
                  form.type === 'income'
                    ? 'flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium'
                    : 'flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50'
                "
              >
                💰 income
              </button>
            </div>
          </div>

          <!-- Icon -->
          <div>
            <label class="text-sm text-gray-600 font-medium"
              >Icon (emoji)</label
            >
            <input
              v-model.number="form.icon"
              type="text"
              placeholder="e.g. 🍔"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <!-- Parent Category (read only if set) -->
          <div v-if="parentId && !editingCategory">
            <label class="text-sm text-gray-600 font-medium"
              >Parent Category</label
            >
            <p
              class="mt-1 text-sm text-indigo-600 font-medium px-3 py-2 bg-indigo-50 rounded-lg"
            >
              {{ parentCategoryName }}
            </p>
          </div>

          <!-- Parent selector on edit -->
          <div v-if="editingCategory">
            <label class="text-sm text-gray-600 font-medium"
              >Parent Category (optional)</label
            >
            <select
              v-model="form.parentId"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">None (top level)</option>
              <option
                v-for="cat in parentOptions"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.icom || "📁" }} {{ cat.name }}
              </option>
            </select>
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
              @click="saveGoal"
              :disabled="!form.name || !form.type || saving"
              class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
            >
              {{
                saving
                  ? "Saving..."
                  : editingCategory
                    ? "Save Changes"
                    : "Add Category"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

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
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categories";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";

const loading = ref(true);
const saving = ref(false);
const categories = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingCategory = ref<any>(null);
const deletingCategory = ref<any>(null);
const parentId = ref<string | null>(null);

const defaultForm = {
  name: "",
  type: "expense",
  icon: "",
  parentId: "",
};

const form = ref({ ...defaultForm });

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

// Options for parent selector (exlcude self when editing
const parentOptions = computed(() =>
  categories.value.filter(
    (c) => !c.parentId && c.id !== editingCategory.value?.id,
  ),
);

// Parent name for display
const parentCategoryName = computed(() => {
  if (!parentId.value) return "";

  return categories.value.find((c) => c.id === parentId.value)?.name || "";
});

// Modal
const openModal = (category?: any, presentParentId?: string) => {
  editingCategory.value = category || null;
  parentId.value = presentParentId || null;

  form.value = category
    ? {
        name: category.name,
        type: category.type,
        icon: category.icon || "",
        parentId: category.parentId || "",
      }
    : {
        ...defaultForm,
        parentId: presentParentId || "",
      };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingCategory.value = null;
  form.value = { ...defaultForm };
};

// Save
const saveGoal = async () => {
  saving.value = true;
  try {
    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, form.value);
    } else {
      await createCategory(form.value);
    }
    await loadCategories();
    closeModal();
  } catch (error) {
    console.error("Error saving category:", error);
  } finally {
    saving.value = false;
  }
};

// Delete
const confirmDelete = (goal: any) => {
  deletingCategory.value = goal;
  showDeleteConfirm.value = true;
};

const deleteCategoryConfirmed = async () => {
  if (!deletingCategory.value) {
    return;
  }
  await deleteCategory(deletingCategory.value.id);
  await loadCategories();
  showDeleteConfirm.value = false;
  deletingCategory.value = null;
};
</script>
