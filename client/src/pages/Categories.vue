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
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Total</p>
                <p class="text-xl font-bold text-indigo-600">{{ categories.length }}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Income</p>
                <p class="text-xl font-bold text-green-500">{{ incomeCategories.length }}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Expense</p>
                <p class="text-xl font-bold text-yellow-500">{{ expenseCategories.length }}</p>
            </div>
        </div>

        <!--Loading -->
        <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

        <!-- Empty -->
        <div v-else-if="categories.length === 0" class="text-center text-gray-400 py-16">
            <p class="text-4xl mb-4">💸</p>
            <p class="text-lg font-medium">No categories yet</p>
            <p class="text-sm">Create your first category to organize transactions</p>
        </div>


        <!-- Delete Confirmation -->
        <div 
            v-if="showDeleteConfirm"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
            <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm text-center">
                <p class="text-4xl mb-4">⚠️</p>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Category?</h3>
                <p class="text-sm text-gray-400 mb-6">
                    This will permanently delete <strong>{{ deleteCategory?.name }}</strong>.
                </p>
                <div class="flex gap-3">
                    <button
                        @click="showDeleteConfirm = false"
                        class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel                        
                    </button>
                    <button
                        @click="deleteCategoryConfirmed"
                        class="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition text-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/categories';

const loading = ref(true);
const saving = ref(false);
const categories = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingCategory = ref<any>(null);
const deletingCategory = ref<any>(null);
const parentId = ref<string | null>(null);

const defaultForm = {
    name: '',
    type: 'expense',
    icon: '',
    parentId: '',
}

const form = ref({ ...defaultForm });

onMounted(async () => await loadCategories());

const loadCategories = async () => {
    loading.value = true;
    try {
        const res = await getCategories();
        categories.value = res.data;
    } catch (error) {
        console.error('Error loading categories:', error);
    } finally {
        loading.value = false;
    }
}

// Filtered lists - only top level (no parentId)
const incomeCategories = computed(() => categories.value.filter(c => c.type === 'income' && !c.parenId));
const expenseCategories = computed(() => categories.value.filter(c => c.type === 'expense' && !c.parenId));

// Options for parent selector (exlcude self when editing
const parentOptions = computed(() => categories.value.filter(c => !c.parentId && c.id !== editingCategory.value?.id))

// Parent name for display
const parentCtegoryName = computed(() => {
    if (!parentId.value) return '';

    return categories.value.find(c => c.id === parentId.value)?.name || '';
});

// Modal
const openModal = (category?: any, presentParentId?: string) => {
    editingCategory.value = category || null;
    parentId.value = presentParentId || null;

    form.value = category ? {
        name: category.name,
        type: category.type,
        icon: category.icon || '',
        parentId: category.parentId || '',
    } : { 
        ...defaultForm,
        parentId: presentParentId || ''
    };
    showModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    editingCategory.value = null;
    form.value = { ...defaultForm };
}

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
        closeModal()
    } catch (error) {
        console.error('Error saving category:', error);
    } finally {
        saving.value = false;
    }
}

// Delete
const confirmDelete = (goal: any) => {
    deletingCategory.value = goal;
    showDeleteConfirm.value = true;
}

const deleteCategoryConfirmed = async () => {
    if (! deletingCategory.value) {
        return;
    }
    await deleteCategory(deletingCategory.value.id);
    await loadCategories();
    showDeleteConfirm.value = false;
    deletingCategory.value = null;
}

</script>