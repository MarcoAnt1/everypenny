<template>
    <div class="space-y-8">

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
                v-for="card in summaryCards"
                :key="card.label"
                class="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4"
            >
                <div class="text-4xl">{{ card.icon }}</div>
                <div>
                    <p class="text-sm text-gray-400">{{ card.label }}</p>
                    <p class="text-2xl font-bold" :class="card.color">
                        {{ card.value }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Recent Transactions + Budgets-->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Recent Transactions -->
            <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">Recent Transactions</h3>
                    <RouterLink to="/transactions" class="text-sm text-indigo-500 houver:underline">
                        View All
                    </RouterLink>
                </div>

                <div v-if="loading" class="text-center text-gray-400 py-8">Loading...</div>

                <div v-else-if="recentTransactions.length === 0" class="text-center text-gray-400 py-8">
                    No transactions yet.
                </div>

                <ul v-else class="space-y-3">
                    <li
                        v-for="tx in recentTransactions"
                        :key="tx.id"
                        class="flex items-center justify-between py-2 border-b last:border-0"
                    >
                        <div>
                            <p class="text-sm font-medium text-gray-700">{{ tx.description }}</p>
                            <p class="text-xs text-gray-400">
                                {{ tx.category?.name ?? 'Uncategorized' }} · {{  formatDate(tx.date) }}
                            </p>
                        </div>
                        <span
                            class="text-sm font-semibold"
                            :class="tx.type === 'income' ? 'text-green-500' : 'text-red-500'"
                        >
                            {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                        </span>
                    </li>
                </ul>
            </div>

            <!-- Budget Overview -->
            <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">Budget Overview</h3>
                    <RouterLink to="/budgets" class="text-sm text-indigo-500 hover:underline">
                        View All
                    </RouterLink>
                </div>

                <div v-if="loading" class="text-center text-gray-400 py-8">Loading...</div>

                <div v-else-if="budgets.length === 0" class="text-center text-gray-400 py-8">
                    No budgets set yet.
                </div>

                <ul v-else class="space-y-4">
                    <li v-for="budget in budgets" :key="budget.id">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium text-gray-700">{{ budget.name  }}</span>
                            <span class="text-gray-400">
                                {{ formatCurrency(budget.spent) }} / {{ formatCurrency(budget.limitAmount) }}
                            </span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2">
                            <div
                                class="h-2 rounded-full transition-all"
                                :class="budget.percentage >= 100
                                    ? 'bg-red-500'
                                    : budget.percentage >= 75
                                        ? 'bg-yellow-400'
                                        : 'bg-green-500'"
                                :style="{ width: `${Math.min(budget.percentage, 100)}%` }"    
                            />
                        </div>
                        <p class="text-xs text-gray-400 mt-1">{{ budget.percentage }}% used</p>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Goals -->
        <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-700">Goals</h3>
                <RouterLink to="/goals" class="text-sm text-indigo-500 hover:underline">
                    View All
                </RouterLink>
            </div>

            <div v-if="loading" class="text-center text-gray-400 py-8">Loading...</div>

            <div v-else-if="goals.length === 0" class="text-center text-gray-400 py-8">
                No goals set yet.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                    v-for="goal in goals"
                    x:key="goal.id"
                    class="border rounded-lg p-4"
                >
                    <div class="flex items-center justify-between mb-2">
                        <p class="font-medium text-gray-700">🎯 {{ goal.name }}</p>
                        <span
                            class="text-xs px-2 py-1 rounded-full"
                            :class="goal.status === 'completed'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-indigo-100 text-indigo-600'"
                        >
                            {{  goal.status }}
                        </span> 
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div
                            class="h-2 rounded-full bg-indigo-500 transition-all"
                            :style="{ width: `${Math.min(goal.percentage, 100)}%` }"
                        />
                    </div>
                    <div class="flex justify-between text-xs text-gray-400">
                        <span>{{ formatCurrency(goal.currentAmount) }} </span>
                        <span>{{ formatCurrency(goal.targetAmount) }} </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getAccounts } from '../api/accounts';
import { getTransactions } from '../api/transactions';
import { getBudgets } from '../api/budgets';
import { getGoals } from '../api/goals';
import { formatDate, formatCurrency } from '../helper/formatHelper.ts';

const loading = ref(true);
const accounts = ref<any[]>([]);
const transactions = ref<any[]>([]);
const budgets = ref<any[]>([]);
const goals = ref<any[]>([]);

// Fetch all data on mount
onMounted(async () => {
    try {
        const [accRes, txRes, budgetRes, goalRes ] = await Promise.all([
            getAccounts(),
            getTransactions(),
            getBudgets(),
            getGoals()
        ]);

        accounts.value = accRes.data;
        transactions.value = txRes.data;
        budgets.value = budgetRes.data;
        goals.value = goalRes.data;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    } finally {
        loading.value = false;
    }
});

// Summary cards
const summaryCards = computed(() => {
    const totalBalance = accounts.value.reduce((sum, acc) => sum + acc.balance, 0);
    const income = transactions.value
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.value
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const goalsCount = goals.value.filter(g => g.status === 'active').length;

    return [
        { label: 'Total Balance',   value: formatCurrency(totalBalance),  icon: '💰', color: 'text-indigo-600' },
        { label: 'Total Income',    value: formatCurrency(income),        icon: '📈', color: 'text-green-500' },
        { label: 'Total Expenses',  value: formatCurrency(expenses),      icon: '📉', color: 'text-red-500' },
        { label: 'Active Goals',    value: String(goalsCount),            icon: '🎯', color: 'text-yellow-500' }
    ];
});

// Last 5 transactions
const recentTransactions = computed(() => transactions.value.slice(0, 5));

</script>