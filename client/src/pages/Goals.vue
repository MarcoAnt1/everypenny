<template>
    <div class="space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Goals</h2>
                <p class="text-sm text-gray-400">Monitor your spending limits</p>
            </div>
            <button
                @click="openModal()"
                class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Goal
            </button>
        </div>

        <!-- Summary Strip -->
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Active Goals</p>
                <p class="text-xl font-bold text-indigo-600">{{ activeGoals.length }}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Total Saved</p>
                <p class="text-xl font-bold text-green-500">{{ formatCurrency(totalSaved) }}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400">Total Needed</p>
                <p class="text-xl font-bold text-yellow-500">{{ formatCurrency(totalNeeded) }}</p>
            </div>
        </div>

        <!--Loading -->
        <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

        <!-- Empty -->
        <div v-else-if="goals.length === 0" class="text-center text-gray-400 py-16">
            <p class="text-4xl mb-4">💸</p>
            <p class="text-lg font-medium">No goals yet</p>
            <p class="text-sm">Create your first saving goal to get started</p>
        </div>

        <!-- Goal Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
                v-for="goal in goals"
                :key="goal.id"
                class="bg-white rounded-xl shadow-sm p-6 space-y-4 flex flex-col"
            >

                <!-- Goal Header -->
                <div class="flex items-start justify-between">
                    <div>
                        <p class="font-semibold text-gray-800">🎯 {{ goal.name }}</p>
                        <p 
                            v-if="goal.description" 
                            class="text-xs text-gray-400 mt-1"
                        >
                            {{ goal.description }}
                        </p>
                    </div>
                    <span 
                        class="text-xs px-2 py-1 rounded-full font-medium"
                        :class="goal.status === 'completed'
                            ? 'bg-gree-100 text-green-600'
                            : goal.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-indigo-100 text-indigo-600'"
                    >
                        {{ goal.status }}
                    </span>
                </div>

                <!-- Progress Bar -->
                <div>
                    <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{{ formatCurrency(goal.currentAmount) }}</span>
                        <span>{{ formatCurrency(goal.targetAmount) }}</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-3">
                        <div 
                            class="h-3 rounded-full transation-all duration-500"
                            :class="goal.status === 'completed'
                                ? 'bg-green-500'
                                : 'bg-indigo-500'"
                            :style="{ width: `${Math.min(goal.percentage, 100)}%`}"
                        />
                    </div>
                    <div class="flex justify-between text-xs mt-1">
                        <span class="text-indigo-500 font-medium">{{ goal.percentage }}% saved</span>
                        <span class="text-gray-400">{{ formatCurrency(goal.remainingAmount) }} to go</span>
                    </div>
                </div>

                <!-- Target Date -->
                <p v-if="goal.targetDate" clas="text-xs text-gray-400">
                    📅 Target: {{  formatDate(goal.targetDate) }}
                </p>

                <!-- Actions -->
                <div class="flex gap-2 pt-2 border-t">
                    <button
                        v-if="goal.status === 'active'"
                        @click="openAddFundsModal(goal)"
                        class="flex-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-1 rounded transition"
                    >
                        + Add Funds
                    </button>
                    <button
                        @click="openModal(goal)"
                        class="flex-1 text-sm text-indigo-600 hover:bg-indigo-50 py-1 rounded transition"
                    >
                        Edit
                    </button>
                    <button
                        @click="confirmDelete(goal)"
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
                    {{ editingGoal ? 'Edit Goal' : 'Add Goal' }}
                </h3>

                <div class="space-y-4">
                    <!-- Name -->
                    <div>
                        <label class="text-sm text-gray-600 font-medium">Goal Name</label>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="e.g. Emergency Fund"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo 400"
                        />
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="text-sm text-gray-600 font-medium">Description (optional)</label>
                        <textarea
                            v-model="form.description"
                            placeholder="What is this goal for?"
                            row="2"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo 400"
                        />
                    </div>

                    <!-- Target Amount -->
                    <div>
                        <label class="text-sm text-gray-600 font-medium">Target Amount</label>
                        <input
                            v-model.number="form.targetAmount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    <!-- Target Amount -->
                    <div>
                        <label class="text-sm text-gray-600 font-medium">Current Amount</label>
                        <input
                            v-model.number="form.currentAmount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    <!-- Target Date -->
                    <div>
                        <label class="text-sm text-gray-600 font-medium">Target Date</label>
                        <input
                            v-model="form.targetDate"
                            type="date"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    <!-- Period -->
                    <div>
                        <div v-if="editingGoal">
                            <label class="text-sm text-gray-600 font-medium">Status</label>
                                <select 
                                    v-model="form.status"
                                    class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
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
                            :disabled="!form.name || !form.targetAmount || saving"
                            class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                        >
                            {{ saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Add Goal' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Funds Modal -->
        <div 
            v-if="showAddFundsModal"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            @click.self="closeModal"
        >
            <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Add Funds</h3>
                <p class="text-sm text-gray-400 mb-6">
                    Adding funds to <strong>{{ fundingGoal?.name }}</strong>
                </p>

                <div>
                    <label class="text-sm text-gray-600 font-medium">Amount</label>
                    <input
                        v-model.number="fundAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>

                <div class="flex gap-3 mt-6">
                    <button
                        @click="showAddFundsModal = false"
                        class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        @click="submitAddFunds"
                        :disabled="!fundAmount || saving"
                        class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                    >
                        {{ saving ? 'Saving...' : 'Add Funds' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div 
            v-if="showDeleteConfirm"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
            <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm text-center">
                <p class="text-4xl mb-4">⚠️</p>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Goals
                    ?</h3>
                <p class="text-sm text-gray-400 mb-6">
                    This will permanently delete <strong>{{ deleteGoal?.name }}</strong>.
                </p>
                <div class="flex gap-3">
                    <button
                        @click="showDeleteConfirm = false"
                        class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel                        
                    </button>
                    <button
                        @click="deleteGoalConfirmed"
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
    currentAmount: 0,
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
        console.error('Error loading goals:', error);
    } finally {
        loading.value = false;
    }
}

// Summary
const activeGoals = computed(() => goals.value.filter(g => g.status === 'active'));
const totalSaved = computed(() => goals.value.reduce((s, g) => s + g.currentAmount, 0));
const totalNeeded = computed(() => goals.value.reduce((s, g) => s + g.remainingAmount, 0));

// Add/Edit Modal
const openModal = (goal?: any) => {
    editingGoal.value = goal || null;
    form.value = goal ? {
        name: goal.description,
        description: goal.description || '',
        targetAmount: goal.targetAmount,
        currentAmount: goal.curentAmount,
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
const confirmDelete = (goal: any) => {
    deletingGoal.value = goal;
    showDeleteConfirm.value = true;
}

const deleteGoalConfirmed = async () => {
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