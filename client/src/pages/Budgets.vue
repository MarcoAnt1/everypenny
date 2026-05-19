<template>
    <div class="space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Budgets</h2>
                <p class="text-sm text-gray-400">Monitor your spending limitis</p>
            </div>
            <button
                @click="openModal()"
                class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Budget
            </button>
        </div>

        <!-- Summary Strip -->
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Total Budgeted</p>
                <p class="text-xl font-bold text-indigo-600">{{ formatCurrency(totalBudgeted) }}</p>
            </div>
             <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Total Spent</p>
                <p class="text-xl font-bold text-indigo-600">{{ formatCurrency(totalSpent) }}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Remaining</p>
                <p 
                    class="text-xl font-bold"
                    :class="totalRemaining >= 0 ? 'text-green-500' : 'text-red-500'"
                >
                    {{ formatCurrency(totalRemaining) }}
                </p>
            </div>
        </div>

        <!--Loading -->
        <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

        <!-- Empty -->
        <div v-else-if="budgets.length === 0" class="text-center text-gray-400 py-16">
            <p class="text-4xl mb-4">💸</p>
            <p class="text-lg font-medium">No budgets yet</p>
            <p class="text-sm">Create a budget to start tracking your spending</p>
        </div>

        <!-- Budget Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
                v-for="budget in budgets"
                :key="budget.id"
                class="bg-white rounded-xl shadow-sm p-6 spacey-y-4"
            >

                <!-- Budget Header -->
                <div class="flex items-start justify-between">
                    <div>
                        <p class="font-semibold text-gray-800">{{ budget.name }}</p>
                        <p class="text-xs text-gray-400 capitalize">
                            {{ budget.category?.name || '-' }} · {{ budget.period }}
                        </p>
                    </div>
                    <span 
                        class="text-xs px-2 py-2 rounded-full font-medium"
                        :class="budget.percentage >= 100
                            ? 'bg-red-100 text-red-600'
                            : budget.percentage >= 75
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-green-100 text-green-600'"
                    >
                        {{ budget.percentage }}%
                    </span>
                </div>

                <!-- Progress Bar -->
                <div>
                    <div class="w-full bg-gray-100 rounded-full h-3">
                        <div 
                            class="h-3 rounded-full transation-all duration-500"
                            :class="budget.percentage >= 100
                                ? 'bg-red-500'
                                : budget.percentage >= 75
                                    ? 'bg-yellow-400'
                                    : 'bg-green-500'"
                            :style="{ width: `${Math.min(budget.percentage, 100)}%`}"
                        />
                    </div>
                </div>

                <!-- Amounts -->
                <div class="grid grid-cols-3 text-center text-sm">
                    <div>
                        <p class="text-sx text-gray-400">Spent</p>
                        <p class="font-semibold text-red-500">{{ formatCurrency(budget.spent) }}</p>
                    </div>
                    <div>
                        <p class="text-sx text-gray-400">Limit</p>
                        <p class="font-semibold text-gray-700">{{ formatCurrency(budget.limitAmount) }}</p>
                    </div>
                    <div>
                        <p class="text-sx text-gray-400">Remaining</p>
                        <p 
                            class="font-semibold"
                            :class="budget.remaining >= 0 ? 'text-green-500' : 'text-red-500'"
                        >
                            {{ formatCurrency(budget.remaining) }}
                        </p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-2 pt-2 border-t">
                    <button
                        @click="openModal(budget)"
                        class="flex-1 text-sm text-indigo-600 hover:bg-indigo-50 py-1 rounded transition"
                    >
                        Edit
                    </button>
                    <button
                        @click="confirmDelete(budget)"
                        class="flex-1 text-sm text-red-500 hover:bg-red-50 py-1 rounded transition"
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
const totalRemaining = computed(() => totalBudgeted.value - totalSpent.value);

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