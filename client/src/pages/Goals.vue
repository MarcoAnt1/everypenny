<template>
    <div>Goals</div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { getGoals, createGoal, updateGoal, deleteGoal, addFunds } from '../api/goals';

const loading = ref(true);
const saving = ref(false);
const goals = ref<any[]>([]);
const showModal = ref(false);
const showAddFundsModal = ref(false);
const showDeleteConfirm = ref(false);
const editingGoal = ref<any>(null);
const deletingGoal = ref<any>(null);
const fundingGoal = ref<any>(null);
const fundAmount = ref(0);

const defaultForm = {
    name: '',
    description: '',
    targetAmount: 0,
    curentAmount: 0,
    targetDate: '',
    status: 'active',
}

const form = ref({ ...defaultForm });

onMounted(async () => await loadGoals());

const loadGoals = async () => {
    loading.value = true;
    try {
        const res = await getGoals();
        goals.value = res.data;
    } catch (error) {
        console.error('Error loading budgets:', error);
    } finally {
        loading.value = false;
    }
}

// Summary
const activeGoals = computed(() => goals.value.filter(g => g.status === 'active'));
const totalSaved = computed(() => goals.value.reduce((s, g) => s + g.currentAmount));
const totalNeeded = computed(() => goals.value.reduce((s, g) => s + g.remaining, 0));

// Add/Edit Modal
const openModal = (goal?: any) => {
    editingGoal.value = goal || null;
    form.value = goal ? {
        name: goal.description,
        description: goal.description || '',
        targetAmount: goal.targetAmount,
        curentAmount: goal.curentAmount,
        targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
        status: goal.status,
    } : { ...defaultForm };
    showModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    editingGoal.value = null;
    form.value = { ...defaultForm };
}

// Save
const saveGoal = async () => {
    saving.value = true;
    try {
        if (editingGoal.value) {
            await updateGoal(editingGoal.value.id, form.value);
        } else {
            await createGoal(form.value);
        }
        await loadGoals();
        closeModal()
    } catch (error) {
        console.error('Error saving goals:', error);
    } finally {
        saving.value = false;
    }
}

// Add Funds
const openAddFundsModal = (goal: any) => {
    fundingGoal.value = goal;
    fundAmount.value = 0;
    showAddFundsModal.value = true;
}

const submitAddFunds = async () => {
    if (!fundingGoal.value) {
        return;
    }

    saving.value = true;

    try {
        await addFunds(fundingGoal.value.id, fundAmount.value);
        await loadGoals();
        showAddFundsModal.value = false;
        fundingGoal.value = null
    } catch (error) {
        console.error('Error adding funds:', error);
    } finally {
        saving.value = false;
    }
}

// Delete
const confirmDelete = (budget: any) => {
    deletingGoal.value = budget;
    showDeleteConfirm.value = true;
}

const deleteBudgetConfirmed = async () => {
    if (!deletingGoal.value) {
        return;
    }
    await deleteGoal(deletingGoal.value.id);
    await loadGoals();
    showDeleteConfirm.value = false;
    deletingGoal.value = null;
}

// Helpers
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(amount);
};


const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

</script>