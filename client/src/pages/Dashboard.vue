<template>
  <div class="space-y-8">
    <!-- Controls -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p class="text-sm text-gray-400">Your money at a glance · {{ periodLabel }}</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <PeriodSelector @change="onPeriodChange" />

        <!-- Person (only when you share with someone) -->
        <Dropdown
          v-if="people.length > 1"
          v-model="ownerId"
          :options="personOptions"
          class="w-40"
        />
      </div>
    </div>

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

    <!-- Insights -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-xs text-gray-400">Avg spend / day</p>
        <p class="text-lg font-bold text-gray-700">
          {{ formatCurrency(avgDailySpend) }}
        </p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-xs text-gray-400">Biggest expense</p>
        <p class="text-lg font-bold text-red-500">
          {{ formatCurrency(biggestExpense) }}
        </p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-xs text-gray-400">Transactions</p>
        <p class="text-lg font-bold text-gray-700">{{ txCount }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4">
        <p class="text-xs text-gray-400">Savings rate</p>
        <p
          class="text-lg font-bold"
          :class="savingsRate >= 0 ? 'text-green-500' : 'text-red-500'"
        >
          {{ savingsRate }}%
        </p>
      </div>
    </div>

    <!-- Analytics: Spending by Category + Income vs Expenses -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Spending by Category -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Spending by Category</h3>
          <span class="text-sm text-gray-400">{{ formatCurrency(expenses) }} total</span>
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">Loading...</div>

        <div
          v-else-if="topCategories.length === 0"
          class="text-center text-gray-400 py-8"
        >
          No spending in this period.
        </div>

        <ul v-else class="space-y-4">
          <li v-for="cat in topCategories" :key="cat.name">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-gray-700">
                {{ cat.icon }} {{ cat.name }}
              </span>
              <span class="text-gray-400">
                {{ formatCurrency(cat.amount) }} · {{ cat.pct }}%
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div
                class="h-2 rounded-full bg-indigo-500 transition-all"
                :style="{ width: `${cat.pct}%` }"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- Income vs Expenses (last 6 months) -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Income vs Expenses</h3>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Income
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Expenses
            </span>
          </div>
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">Loading...</div>

        <div v-else>
          <div class="flex items-end justify-between gap-2">
            <div
              v-for="m in monthlyTrend"
              :key="m.key"
              class="flex-1 flex flex-col items-center gap-2"
            >
              <div class="flex items-end justify-center gap-1 h-36 w-full">
                <div
                  class="w-3.5 bg-green-400 rounded-t transition-all"
                  :style="{ height: `${(m.income / trendMax) * 100}%` }"
                  :title="`Income: ${formatCurrency(m.income)}`"
                />
                <div
                  class="w-3.5 bg-red-400 rounded-t transition-all"
                  :style="{ height: `${(m.expense / trendMax) * 100}%` }"
                  :title="`Expenses: ${formatCurrency(m.expense)}`"
                />
              </div>
              <span class="text-xs text-gray-400">{{ m.label }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-300 mt-3 text-center">
            Last 6 months{{ ownerId ? ` · ${selectedPersonName}` : "" }}
          </p>
        </div>
      </div>
    </div>

    <!-- Balances by type + Biggest expenses -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Balances by account type -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Balances by Type</h3>
          <span class="text-sm text-gray-400"
            >{{ formatCurrency(totalBalance) }} net</span
          >
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">
          Loading...
        </div>
        <div
          v-else-if="balancesByType.length === 0"
          class="text-center text-gray-400 py-8"
        >
          No accounts yet.
        </div>

        <ul v-else class="space-y-4">
          <li v-for="b in balancesByType" :key="b.type">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-gray-700">
                {{ b.icon }} {{ b.label }}
              </span>
              <span :class="b.total >= 0 ? 'text-gray-600' : 'text-red-500'">
                {{ formatCurrency(b.total) }}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all"
                :class="b.total >= 0 ? 'bg-indigo-500' : 'bg-red-400'"
                :style="{
                  width: `${(Math.abs(b.total) / maxAbsBalance) * 100}%`,
                }"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- Biggest expenses -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Biggest Expenses</h3>
          <span class="text-sm text-gray-400">{{ periodLabel }}</span>
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">
          Loading...
        </div>
        <div
          v-else-if="biggestExpenses.length === 0"
          class="text-center text-gray-400 py-8"
        >
          No expenses in this period.
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="tx in biggestExpenses"
            :key="tx.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <p class="text-sm font-medium text-gray-700">
                {{ tx.description }}
              </p>
              <p class="text-xs text-gray-400">
                {{ tx.category?.name ?? "Uncategorized" }} ·
                {{ formatDate(tx.date) }}
              </p>
            </div>
            <span class="text-sm font-semibold text-red-500">
              -{{ formatCurrency(Math.abs(Number(tx.amount))) }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Recent Transactions + Budgets-->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Transactions -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">
            Recent Transactions
          </h3>
          <RouterLink
            to="/transactions"
            class="text-sm text-indigo-500 hover:underline"
          >
            View All
          </RouterLink>
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">
          Loading...
        </div>

        <div
          v-else-if="recentTransactions.length === 0"
          class="text-center text-gray-400 py-8"
        >
          No transactions yet.
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="tx in recentTransactions"
            :key="tx.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <p class="text-sm font-medium text-gray-700">
                {{ tx.description }}
              </p>
              <p class="text-xs text-gray-400">
                {{ tx.category?.name ?? "Uncategorized" }} ·
                {{ formatDate(tx.date) }}
              </p>
            </div>
            <span
              class="text-sm font-semibold"
              :class="Number(tx.amount) >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ Number(tx.amount) >= 0 ? "+" : "-"
              }}{{ formatCurrency(Math.abs(Number(tx.amount))) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Budget Overview -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Budget Overview</h3>
          <RouterLink
            to="/budgets"
            class="text-sm text-indigo-500 hover:underline"
          >
            View All
          </RouterLink>
        </div>

        <div v-if="loading" class="text-center text-gray-400 py-8">
          Loading...
        </div>

        <div
          v-else-if="budgets.length === 0"
          class="text-center text-gray-400 py-8"
        >
          No budgets set yet.
        </div>

        <ul v-else class="space-y-4">
          <li v-for="budget in budgets" :key="budget.id">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-gray-700">{{ budget.name }}</span>
              <span class="text-gray-400">
                {{ formatCurrency(budget.spent) }} /
                {{ formatCurrency(budget.limitAmount) }}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all"
                :class="
                  budget.percentage >= 100
                    ? 'bg-red-500'
                    : budget.percentage >= 75
                      ? 'bg-yellow-400'
                      : 'bg-green-500'
                "
                :style="{ width: `${Math.min(budget.percentage, 100)}%` }"
              />
            </div>
            <p class="text-xs text-gray-400 mt-1">
              {{ budget.percentage }}% used
            </p>
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

      <div v-if="loading" class="text-center text-gray-400 py-8">
        Loading...
      </div>

      <div
        v-else-if="goals.length === 0"
        class="text-center text-gray-400 py-8"
      >
        No goals set yet.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="goal in goals" :key="goal.id" class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <p class="font-medium text-gray-700">🎯 {{ goal.name }}</p>
            <span
              class="text-xs px-2 py-1 rounded-full"
              :class="
                goal.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-indigo-100 text-indigo-600'
              "
            >
              {{ goal.status }}
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
import { ref, computed, onMounted } from "vue";
import { getAccounts } from "../api/accounts";
import { getTransactions } from "../api/transactions";
import { getBudgets } from "../api/budgets";
import { getGoals } from "../api/goals";
import { getCategories } from "../api/categories";
import { useAuthStore } from "../stores/auth";
import { formatDate, formatCurrency } from "../utils/format";
import PeriodSelector from "../components/PeriodSelector.vue";
import Dropdown from "../components/Dropdown.vue";
import { type PeriodRange } from "../utils/PeriodRange";

const loading = ref(true);
const accounts = ref<any[]>([]);
const transactions = ref<any[]>([]); // trailing 12 months, all people
const budgets = ref<any[]>([]);
const goals = ref<any[]>([]);
const categories = ref<any[]>([]);

const authStore = useAuthStore();

const period = ref<PeriodRange | null>(null);
const ownerId = ref("");

const fmt = (d: Date) => d.toISOString().split("T")[0];

// Fetch transactions covering the selected period AND the trailing 6 months
// (the Income vs Expenses chart always shows the last 6 months).
const loadTransactions = async () => {
  const now = new Date();
  const sixMonthsAgo = fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const today = fmt(now);
  const start =
    period.value && period.value.start < sixMonthsAgo
      ? period.value.start
      : sixMonthsAgo;
  const end =
    period.value && period.value.end > today ? period.value.end : today;
  const res = await getTransactions({ startDate: start, endDate: end });
  transactions.value = res.data;
};

// Guards the PeriodSelector's initial @change (fired during mount) so we don't
// fetch twice — the first load happens in onMounted.
let initialized = false;

const onPeriodChange = (p: PeriodRange) => {
  period.value = p;
  if (initialized) loadTransactions();
};

const people = computed(() => {
  const map = new Map<string, { id: string; name: string }>();
  for (const acc of accounts.value) {
    if (acc.owner?.id) {
      map.set(acc.owner.id, { id: acc.owner.id, name: acc.owner.name });
    }
  }
  return Array.from(map.values());
});

const personLabel = (p: { id: string; name: string }) =>
  p.id === authStore.user?.id ? `${p.name} (you)` : p.name;

const selectedPersonName = computed(
  () => people.value.find((p) => p.id === ownerId.value)?.name ?? "",
);

const personOptions = computed(() => [
  { value: "", label: "All People" },
  ...people.value.map((p) => ({ value: p.id, label: personLabel(p) })),
]);

const periodLabel = computed(() => period.value?.label ?? "");

const periodRange = computed(() => ({
  start: period.value?.start ?? "",
  end: period.value?.end ?? "",
}));

const categoryDisplay = computed(() => {
  const map = new Map<string, { name: string; icon: string }>();
  for (const parent of categories.value) {
    const display = { name: parent.name, icon: parent.icon || "📁" };
    map.set(parent.id, display);
    for (const sub of parent.subcategories ?? []) {
      map.set(sub.id, display);
    }
  }
  return map;
});

const matchesOwner = (t: any) =>
  !ownerId.value || t.account?.owner?.id === ownerId.value;

const periodTx = computed(() => {
  const { start, end } = periodRange.value;
  return transactions.value.filter(
    (t) => t.date >= start && t.date <= end && matchesOwner(t),
  );
});

const visibleAccounts = computed(() =>
  ownerId.value
    ? accounts.value.filter((a) => a.owner?.id === ownerId.value)
    : accounts.value,
);

const totalBalance = computed(() =>
  visibleAccounts.value.reduce((sum, acc) => sum + Number(acc.balance), 0),
);
const income = computed(() =>
  periodTx.value
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
);
const expenses = computed(() =>
  periodTx.value
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
);
const net = computed(() => income.value - expenses.value);

const summaryCards = computed(() => [
  {
    label: "Total Balance",
    value: formatCurrency(totalBalance.value),
    icon: "💰",
    color: "text-indigo-600",
  },
  {
    label: "Income",
    value: formatCurrency(income.value),
    icon: "📈",
    color: "text-green-500",
  },
  {
    label: "Expenses",
    value: formatCurrency(expenses.value),
    icon: "📉",
    color: "text-red-500",
  },
  {
    label: "Net",
    value: formatCurrency(net.value),
    icon: net.value >= 0 ? "🟢" : "🔴",
    color: net.value >= 0 ? "text-indigo-600" : "text-red-500",
  },
]);

const spendingByCategory = computed(() => {
  const totals = new Map<string, { name: string; icon: string; amount: number }>();
  for (const t of periodTx.value) {
    if (t.type !== "expense") continue;
    const disp = t.categoryId ? categoryDisplay.value.get(t.categoryId) : undefined;
    const name = disp?.name ?? "Uncategorized";
    const icon = disp?.icon ?? "❓";
    const entry = totals.get(name) ?? { name, icon, amount: 0 };
    entry.amount += Math.abs(Number(t.amount));
    totals.set(name, entry);
  }
  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
});

const topCategories = computed(() => {
  const all = spendingByCategory.value;
  const total = all.reduce((s, c) => s + c.amount, 0);
  const withPct = (c: { name: string; icon: string; amount: number }) => ({
    ...c,
    pct: total ? Math.round((c.amount / total) * 100) : 0,
  });

  if (all.length <= 8) return all.map(withPct);

  const top = all.slice(0, 7).map(withPct);
  const restAmount = all.slice(7).reduce((s, c) => s + c.amount, 0);
  top.push({
    name: "Other",
    icon: "•",
    amount: restAmount,
    pct: total ? Math.round((restAmount / total) * 100) : 0,
  });
  return top;
});

const monthlyTrend = computed(() => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleString("en-US", { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      income: 0,
      expense: 0,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));

  for (const t of transactions.value) {
    if (!matchesOwner(t)) continue;
    const m = byKey.get(String(t.date).slice(0, 7));
    if (!m) continue;
    if (t.type === "income") m.income += Math.abs(Number(t.amount));
    else if (t.type === "expense") m.expense += Math.abs(Number(t.amount));
  }
  return months;
});

const trendMax = computed(() =>
  Math.max(1, ...monthlyTrend.value.flatMap((m) => [m.income, m.expense])),
);

const recentTransactions = computed(() =>
  transactions.value.filter(matchesOwner).slice(0, 5),
);

// --- Insights ---
const daysInPeriod = computed(() => {
  const { start, end } = periodRange.value;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
});
const avgDailySpend = computed(() => expenses.value / daysInPeriod.value);
const biggestExpense = computed(() => {
  const amounts = periodTx.value
    .filter((t) => t.type === "expense")
    .map((t) => Math.abs(Number(t.amount)));
  return amounts.length ? Math.max(...amounts) : 0;
});
const txCount = computed(() => periodTx.value.length);
const savingsRate = computed(() =>
  income.value > 0 ? Math.round((net.value / income.value) * 100) : 0,
);

// Largest individual expenses in the selected period.
const biggestExpenses = computed(() =>
  periodTx.value
    .filter((t) => t.type === "expense")
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
    .slice(0, 5),
);

// Net balance grouped by account type (person-filtered like the rest).
const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  investment: "Investment",
  cash: "Cash",
};
const TYPE_ICONS: Record<string, string> = {
  checking: "🏦",
  savings: "💰",
  credit_card: "💳",
  investment: "📈",
  cash: "💵",
};
const balancesByType = computed(() => {
  const totals = new Map<string, number>();
  for (const a of visibleAccounts.value) {
    totals.set(a.type, (totals.get(a.type) ?? 0) + Number(a.balance));
  }
  return Array.from(totals.entries())
    .map(([type, total]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      icon: TYPE_ICONS[type] ?? "🏦",
      total,
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
});
const maxAbsBalance = computed(() =>
  Math.max(1, ...balancesByType.value.map((b) => Math.abs(b.total))),
);

onMounted(async () => {
  try {
    const [accRes, budgetRes, goalRes, catRes] = await Promise.all([
      getAccounts(),
      getBudgets(),
      getGoals(),
      getCategories(),
    ]);
    accounts.value = accRes.data;
    budgets.value = budgetRes.data;
    goals.value = goalRes.data;
    categories.value = catRes.data;
    // period is already set by PeriodSelector's initial @change emit.
    await loadTransactions();
  } catch (error) {
    console.error("Error loading dashboard:", error);
  } finally {
    loading.value = false;
    initialized = true;
  }
});
</script>
