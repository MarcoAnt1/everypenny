<template>
    <div>Budgets</div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../api/budgets';
import { getCategories } from '../api/categories';

const loading = ref(true);
const saving = ref(false);
const budgets = ref<any[]>([]);
const categories = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingBudget = ref<any>(null);
const deletingBudget = ref<any>(null);

const defaultForm = {
    name: '',
    categoryId: '',
    limitAmount: 0,
    period: 'monthly',
}

const form = ref({ ...defaultForm });

onMounted(async () => {
    await Promise.all([ loadBudgets(), loadCategories()]);
});

const loadBudgets = async () => {
    loading.value = true;
    try {
        const res = await getBudgets();
        budgets.value = res.data;
    } catch (error) {
        console.error('Error loading budgets:', error);
    } finally {
        loading.value = false;
    }
}

const loadCategories = async() => {
    const res = await getCategories();
    categories.value = res.data;
}

// Summary
const totalBudgeted = computed(() => budgets.value.reduce((s, b) => s + b.limitAmount, 0));
const totalSpent = computed(() => budgets.value.reduce((s, b) => s + b.spent, 0));
const totalRemeining = computed(() => totalBudgeted.value - totalSpent.value);

// Modal
const openModal = (budget?: any) => {
    editingBudget.value = budget || null;
    form.value = budget ? {
        name: budget.description,
        categoryId: budget.categoryId || '',
        limitAmount: budget.limitAmount,
        period: budget.period,
    } : { ...defaultForm };
    showModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    editingBudget.value = null;
    form.value = { ...defaultForm };
}

// Save
const saveBudget = async () => {
    saving.value = true;
    try {
        if (editingBudget.value) {
            await updateBudget(editingBudget.value.id, form.value);
        } else {
            await createBudget(form.value);
        }
        await loadBudgets();
        closeModal()
    } catch (error) {
        console.error('Error saving budget:', error);
    } finally {
        saving.value = false;
    }
}

// Delete
const confirmDelete = (budget: any) => {
    deletingBudget.value = budget;
    showDeleteConfirm.value = true;
}

const deleteBudgetConfirmed = async () => {
    if (!deletingBudget.value) {
        return;
    }
    await deleteBudget(deletingBudget.value.id);
    await loadBudgets();
    showDeleteConfirm.value = false;
    deletingBudget.value = null;
}

// Helpers
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(amount);
};

</script>