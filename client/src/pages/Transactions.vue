<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Transactions</h2>
        <p class="text-sm text-gray-400">Track your income and expenses</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showImportModal = true"
          class="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
        >
          📂 Import Statement
        </button>
        <button
          @click="openModal()"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + Add Transaction
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm p-4 space-y-4">
      <!-- Row 1 - Search + date presets + account + type + category -->
      <div class="flex flex-wrap gap-3">
        <!-- Search -->
        <input
          v-model="search"
          type="text"
          placeholder="Search description or amount…"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-[200px]"
        />

        <!-- Date Preset -->
        <select
          v-model="filters.preset"
          @change="onPresetChange"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="ytd">Year to Date</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>

        <!-- Type -->
        <select
          v-model="filters.type"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>

        <!-- Account (multi-select) -->
        <MultiSelect
          v-model="filters.accountIds"
          :options="accountOptions"
          placeholder="All Accounts"
          class="w-44"
        />

        <!-- Category (multi-select, incl. Uncategorized) -->
        <MultiSelect
          v-model="filters.categoryIds"
          :options="categoryOptions"
          placeholder="All Categories"
          class="w-48"
        />

        <!-- Person / Owner (only shown when you share with someone) -->
        <select
          v-if="people.length > 1"
          v-model="filters.ownerId"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All People</option>
          <option v-for="p in people" :key="p.id" :value="p.id">
            {{ personLabel(p) }}
          </option>
        </select>

        <!-- Clear -->
        <button
          @click="clearFilters"
          class="border text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
        >
          Clear
        </button>
      </div>

      <!-- Row 2 - Custom date range (only when preset = custom)-->
      <div
        v-if="filters.preset === 'custom'"
        class="flex flex-wrap gap-3 items-center"
      >
        <span class="text-sm text-gray-500">From</span>
        <input
          v-model="filters.startDate"
          type="date"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <span class="text-sm text-gray-500">To</span>
        <input
          v-model="filters.endDate"
          type="date"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <!-- Row 3 - Tag pills -->
      <div v-if="tags.length > 0" class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-gray-400 mr-1">Tags:</span>
        <button
          v-for="tag in tags"
          :key="tag.id"
          @click="toggleTagFilter(tag.id)"
          class="text-xs px-3 py-1 rounded-full transition"
          :class="
            filters.tagIds.includes(tag.id)
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          "
        >
          {{ tag.name }}
          <span v-if="filters.tagIds.includes(tag.id)">✓</span>
        </button>
      </div>

      <!-- Active filter summary -->
      <div
        v-if="hasActiveFilters"
        class="flex items-center gap-2 text-xs text-gray-400"
      >
        <span>Showing:</span>
        <span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
          {{ dataRangeLabel }}
        </span>
        <span
          v-if="filters.type"
          class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize"
        >
          {{ filters.type }}
        </span>
        <span
          v-if="filters.ownerId"
          class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
        >
          👤 {{ people.find((p) => p.id === filters.ownerId)?.name }}
        </span>
        <span
          v-if="filters.tagIds.length"
          class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
        >
          {{ filters.tagIds.length }} tag{{
            filters.tagIds.length > 1 ? "s" : ""
          }}
        </span>
        <span class="text-gray-300">·</span>
        <span
          >{{ visibleTransactions.length }} transaction{{
            visibleTransactions.length !== 1 ? "s" : ""
          }}</span
        >
      </div>
    </div>

    <!-- Summary Strip -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Income</p>
        <p class="text-xl font-bold text-green-500">
          {{ formatCurrency(totalIncome) }}
        </p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Expenses</p>
        <p class="text-xl font-bold text-red-500">
          {{ formatCurrency(totalExpenses) }}
        </p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 text-center">
        <p class="text-xs text-gray-400">Net</p>
        <p
          class="text-xl font-bold"
          :class="net >= 0 ? 'text-indigo-600' : 'text-red-500'"
        >
          {{ formatCurrency(net) }}
        </p>
      </div>
    </div>

    <!--Loading -->
    <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

    <!-- Empty -->
    <div
      v-else-if="visibleTransactions.length === 0"
      class="text-center text-gray-400 py-16"
    >
      <p class="text-4xl mb-4">💸</p>
      <p class="text-lg font-medium">No transactions found</p>
      <p class="text-sm">Add your first transaction or adjust your filters</p>
    </div>

    <!-- Transactions Table -->
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th class="px-6 py-3 text-left">Date</th>
            <th class="px-6 py-3 text-left">Description</th>
            <th class="px-6 py-3 text-left">Category</th>
            <th class="px-6 py-3 text-left">Account</th>
            <th class="px-6 py-3 text-left">Tags</th>
            <th class="px-6 py-3 text-right">Amount</th>
            <th class="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="tx in visibleTransactions"
            :key="tx.id"
            class="hover:bg-gray-50 transition"
          >
            <!-- Date -->
            <td class="px-6 py-4 text-gray-400 whitespace-nowrap">
              {{ tx.date }}
            </td>

            <!-- Description -->
            <td class="px-6 py-4">
              <p class="font-medium text-gray-800">{{ tx.description }}</p>
              <p v-if="tx.notes" class="text-xs text-gray-400">
                {{ tx.notes }}
              </p>
            </td>
            <td class="px-6 py-4 text-gray-500">
              {{ tx.category?.name || "-" }}
            </td>

            <!-- Account -->
            <td class="px-6 py-4 text-gray-500">
              <div v-if="tx.type === 'transfer'">
                <p class="text-sm">{{ tx.account?.name }}</p>
                <p
                  class="text-xs"
                  :class="
                    Number(tx.amount) >= 0
                      ? 'text-green-400'
                      : 'text-indigo-400'
                  "
                >
                  {{ Number(tx.amount) >= 0 ? "← from" : "→ to" }}
                  {{ tx.externalParty ?? tx.toAccount?.name ?? "outside" }}
                </p>
              </div>
              <span v-else>{{ tx.account?.name || "-" }}</span>
              <p
                v-if="people.length > 1 && tx.account?.owner"
                class="text-xs text-gray-400"
              >
                👤 {{ personLabel(tx.account.owner) }}
              </p>
            </td>

            <!-- Tags -->
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="t in tx.tags"
                  :key="t.tagId"
                  class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full"
                >
                  {{ t.tag.name }}
                </span>
              </div>
            </td>

            <!-- Amount -->
            <td
              class="px-6 py-4 text-right font-semibold whitespace-nowrap"
              :class="
                tx.type === 'transfer'
                  ? Number(tx.amount) >= 0
                    ? 'text-green-500'
                    : 'text-indigo-500'
                  : Number(tx.amount) >= 0
                    ? 'text-green-500'
                    : 'text-red-500'
              "
            >
              {{
                tx.type === "transfer"
                  ? Number(tx.amount) >= 0
                    ? "↓"
                    : "↑"
                  : Number(tx.amount) >= 0
                    ? "+"
                    : "-"
              }}{{ formatCurrency(Math.abs(Number(tx.amount))) }}
            </td>

            <!-- Actions -->
            <td class="px-6 py-4 text-center">
              <ActionMenu
                :actions="[
                  { label: 'Edit', onClick: () => openModal(tx) },
                  { label: 'Copy', onClick: () => duplicateTransaction(tx) },
                  {
                    label: 'Delete',
                    danger: true,
                    onClick: () => confirmDelete(tx),
                  },
                ]"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @mousedown.self="closeModal"
    >
      <div
        class="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 class="text-lg font-semibold text-gray-800 mb-6">
          {{ editingTransaction ? "Edit Transaction" : "Add Transaction" }}
        </h3>

        <div
          v-if="error"
          class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4"
        >
          {{  error }}
        </div>

        <div class="space-y-4">
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
                💰 Income
              </button>
              <button
                @click="form.type = 'transfer'"
                :class="
                  form.type === 'transfer'
                    ? 'flex-1 bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium'
                    : 'flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50'
                "
              >
                🔁 Transfer
              </button>
            </div>
          </div>

          <!-- Account -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Account</label>
            <select
              v-model="form.accountId"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select account</option>
              <option
                v-for="account in accounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>

          <!-- Destination Account (only for transfers)-->
          <div v-if="form.type === 'transfer'">
            <label class="text-sm text-gray-600 font-medium">To Account</label>
            <select
              v-model="form.toAccountId"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select destination account</option>
              <option value="external">🌐 Outside account (external)</option>
              <option
                v-for="account in accounts.filter(
                  (a) => a.id !== form.accountId,
                )"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>

          <!-- External transfer: direction + outside party -->
          <template
            v-if="form.type === 'transfer' && form.toAccountId === 'external'"
          >
            <div>
              <label class="text-sm text-gray-600 font-medium">Direction</label>
              <div class="flex gap-3 mt-1">
                <button
                  type="button"
                  @click="form.direction = 'out'"
                  :class="
                    form.direction === 'out'
                      ? 'flex-1 bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium'
                      : 'flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50'
                  "
                >
                  ↑ Send out
                </button>
                <button
                  type="button"
                  @click="form.direction = 'in'"
                  :class="
                    form.direction === 'in'
                      ? 'flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium'
                      : 'flex-1 border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50'
                  "
                >
                  ↓ Receive in
                </button>
              </div>
            </div>
            <div>
              <label class="text-sm text-gray-600 font-medium">
                Outside party (optional)
              </label>
              <input
                v-model="form.externalParty"
                type="text"
                placeholder="e.g. John, Landlord, external savings"
                class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </template>

          <!-- Description -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Description</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="e.g Grocery Shopping"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <!-- Amount -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Amount</label>
            <input
              v-model.number="form.amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <!-- Date -->
          <div>
            <label for="date" class="text-sm text-gray-600 font-medium"
              >Date</label
            >
            <input
              id="date"
              v-model="form.date"
              type="date"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Category</label>
            <CategoryPicker
              v-model="form.categoryId"
              :categories="categories"
              placeholder="Select category"
              allow-create
              class="mt-1"
              @create="showCategoryModal = true"
            />
          </div>

          <!-- Tags -->
          <div>
            <label class="text-sm text-gray-600 font-medium">Tags</label>
            <div class="relative mt-1" ref="formTagMenuRef">
              <button
                @click.stop="showFormTagMenu = !showFormTagMenu"
                type="button"
                class="w-full border rounded-lg px-3 py-2 text-sm text-left bg-white hover:bg-gray-50"
              >
                {{
                  form.tagIds.length > 0
                    ? form.tagIds
                        .map((id) => tags.find((t) => t.id === id)?.name)
                        .join(", ")
                    : "Select tags"
                }}
              </button>

              <div
                v-if="showFormTagMenu"
                class="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-2 space-y-1 max-h-48 overflow-y-auto"
              >
                <label
                  v-for="tag in tags"
                  :key="tag.id"
                  class="flex items-center gap-2 text-sm px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="form.tagIds.includes(tag.id)"
                    @change="toggleTag(tag.id)"
                  />
                  {{ tag.name }}
                </label>
                <div
                  v-if="tags.length === 0"
                  class="text-xs text-gray-400 px-2 py-1"
                >
                  No tags yet
                </div>
              </div>
            </div>
          </div>

          <CategoryFormModal
            v-if="showCategoryModal"
            @close="showCategoryModal = false"
            @saved="onCategorySaved"
          />

          <!-- Notes -->
          <div>
            <label for="notes" class="text-sm text-gray-600 font-medium"
              >Notes (optional)</label
            >
            <textarea
              name="notes"
              id="notes"
              v-model="form.notes"
              placeholder="Any extra details..."
              rows="2"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
              @click="saveTransaction"
              :disabled="saving"
              class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
            >
              {{
                saving
                  ? "Saving..."
                  : editingTransaction
                    ? "Save Changes"
                    : "Add Transaction"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <DeleteConfirmation
      v-if="showDeleteConfirm"
      :item="'Transaction'"
      :item-description="deletingTransaction?.description"
      @close="showDeleteConfirm = false"
      @deleted="deleteTransactionConfirmed"
    />
  </div>

  <ImportStatementModal
    v-if="showImportModal"
    :accounts="accounts"
    @close="showImportModal = false"
    @imported="onImported"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../api/transactions";
import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";
import { getTags } from "../api/tags";
import { formatCurrency } from "../utils/format";
import ImportStatementModal from "../components/ImportStatementModal.vue";
import DeleteConfirmation from "../components/DeleteConfirmation.vue";
import ActionMenu from "../components/ActionMenu.vue";
import CategoryFormModal from "../components/CategoryFormModal.vue";
import CategoryPicker from "../components/CategoryPicker.vue";
import MultiSelect from "../components/MultiSelect.vue";
import { useAuthStore } from "../stores/auth";

const loading = ref(true);
const saving = ref(false);
const transactions = ref<any[]>([]);
const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const tags = ref<any[]>([]);
const showModal = ref(false);
const showImportModal = ref(false);
const showDeleteConfirm = ref(false);
const editingTransaction = ref<any>(null);
const deletingTransaction = ref<any>(null);
const showFormTagMenu = ref(false);
const formTagMenuRef = ref<HTMLElement | null>(null);
const showCategoryModal = ref(false);

const authStore = useAuthStore();

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

// Options for the multi-select filters.
const accountOptions = computed(() =>
  accounts.value.map((a) => ({ value: a.id, label: a.name })),
);

const categoryOptions = computed(() => {
  const opts: { value: string; label: string; indent?: boolean }[] = [
    { value: "none", label: "Uncategorized" },
  ];
  for (const cat of categories.value) {
    opts.push({ value: cat.id, label: cat.name });
    for (const sub of cat.subcategories ?? []) {
      opts.push({ value: sub.id, label: sub.name, indent: true });
    }
  }
  return opts;
});

const today = () => new Date();

const getPresetDates = (
  preset: string,
): { startDate: string; endDate: string } => {
  const now = today();
  const year = now.getFullYear();
  const month = now.getMonth();

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "this_month":
      return {
        startDate: fmt(new Date(year, month, 1)),
        endDate: fmt(new Date(year, month + 1, 0)),
      };
    case "last_month":
      return {
        startDate: fmt(new Date(year, month - 1, 1)),
        endDate: fmt(new Date(year, month, 0)),
      };
    case "ytd":
      return {
        startDate: fmt(new Date(year, 0, 1)),
        endDate: fmt(now),
      };
    case "this_year":
      return {
        startDate: fmt(new Date(year, 0, 1)),
        endDate: fmt(new Date(year, 11, 31)),
      };
    case "last_year":
      return {
        startDate: fmt(new Date(year - 1, 0, 1)),
        endDate: fmt(new Date(year - 1, 11, 31)),
      };
    case "all":
      return { startDate: "", endDate: "" };
    default:
      return { startDate: "", endDate: "" };
  }
};

const defaultFilters = () => {
  const { startDate, endDate } = getPresetDates("this_month");
  return {
    preset: "this_month",
    type: "",
    accountIds: [] as string[],
    ownerId: "",
    categoryIds: [] as string[],
    startDate,
    endDate,
    tagIds: [] as string[],
  };
};

const filters = ref(defaultFilters());
const search = ref("");

const STORAGE_KEY = "everypenny:transactionFilters";

const loadSavedFilters = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveFilters = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...filters.value, search: search.value }),
    );
  } catch {
    // storage may be unavailable (private mode, etc.) — ignore
  }
};

const savedFilters = loadSavedFilters();
if (savedFilters) {
  filters.value = {
    ...defaultFilters(),
    ...savedFilters,
    tagIds: savedFilters.tagIds ?? [],
    accountIds: savedFilters.accountIds ?? [],
    categoryIds: savedFilters.categoryIds ?? [],
  };
  if (filters.value.preset !== "custom") {
    const { startDate, endDate } = getPresetDates(filters.value.preset);
    filters.value.startDate = startDate;
    filters.value.endDate = endDate;
  }
  search.value = savedFilters.search ?? "";
}

let reloadTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleReload = () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => loadTransactions(), 150);
};
watch(
  filters,
  () => {
    scheduleReload();
    saveFilters();
  },
  { deep: true },
);
watch(search, saveFilters);

const onPresetChange = () => {
  if (filters.value.preset !== "custom") {
    const { startDate, endDate } = getPresetDates(filters.value.preset);
    filters.value.startDate = startDate;
    filters.value.endDate = endDate;
  }
};

const toggleTagFilter = (tagId: string) => {
  const idx = filters.value.tagIds.indexOf(tagId);
  if (idx === -1) {
    filters.value.tagIds.push(tagId);
  } else {
    filters.value.tagIds.splice(idx, 1);
  }
};

const dataRangeLabel = computed(() => {
  const presetLabels: Record<string, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    ytd: "Year to Date",
    this_year: "This Year",
    last_year: "Last Year",
    all: "All Time",
    custom: `${filters.value.startDate} → ${filters.value.endDate}`,
  };
  return presetLabels[filters.value.preset] ?? "Custom";
});

const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== "" ||
    filters.value.type !== "" ||
    filters.value.accountIds.length > 0 ||
    filters.value.ownerId !== "" ||
    filters.value.categoryIds.length > 0 ||
    filters.value.tagIds.length > 0 ||
    filters.value.preset !== "all"
  );
});

const defaultForm = {
  description: "",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  type: "expense",
  accountId: "",
  categoryId: "",
  toAccountId: "",
  externalParty: "",
  direction: "out",
  tagIds: [] as string[],
  notes: "",
  status: "cleared",
};

const form = ref({ ...defaultForm, tagIds: [] as string[] });

onMounted(async () => {
  document.addEventListener("click", handleClickOutSideTags);

  await Promise.all([
    loadTransactions(),
    loadAccounts(),
    loadCategories(),
    loadTags(),
  ]);
});

const loadTransactions = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.type) {
      params.type = filters.value.type;
    }

    if (filters.value.accountIds.length > 0) {
      params.accountIds = filters.value.accountIds;
    }

    if (filters.value.ownerId) {
      params.ownerId = filters.value.ownerId;
    }

    if (filters.value.categoryIds.length > 0) {
      params.categoryIds = filters.value.categoryIds;
    }

    if (filters.value.startDate) {
      params.startDate = filters.value.startDate;
    }

    if (filters.value.endDate) {
      params.endDate = filters.value.endDate;
    }

    if (filters.value.tagIds.length > 0) {
      params.tagIds = filters.value.tagIds;
    }

    const res = await getTransactions(params);
    transactions.value = res.data;
  } catch (error) {
    console.error("Error loading transactions:", error);
  } finally {
    loading.value = false;
  }
};

const loadAccounts = async () => {
  const res = await getAccounts();
  accounts.value = res.data;
};
const loadCategories = async () => {
  const res = await getCategories();
  categories.value = res.data;
};
const loadTags = async () => {
  const res = await getTags();
  tags.value = res.data;
};

// Filters
const clearFilters = () => {
  filters.value = defaultFilters();
  search.value = "";
  // the filters watcher triggers the reload
};

// Client-side search over the loaded transactions — matches the description,
// notes, or amount. Instant, no refetch.
const visibleTransactions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return transactions.value;
  return transactions.value.filter((t) => {
    const desc = String(t.description ?? "").toLowerCase();
    const notes = String(t.notes ?? "").toLowerCase();
    const amount = String(Math.abs(Number(t.amount)));
    return desc.includes(q) || notes.includes(q) || amount.includes(q);
  });
});

// Summary
const totalIncome = computed(() =>
  visibleTransactions.value
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
);
const totalExpenses = computed(() =>
  visibleTransactions.value
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
);
const net = computed(() => totalIncome.value - totalExpenses.value);

const transferPerspective = (tx: any) => {
  if (tx.externalParty) {
    return {
      accountId: tx.accountId,
      toAccountId: "external",
      direction: Number(tx.amount) >= 0 ? "in" : "out",
    };
  }
  if (tx.type === "transfer" && tx.toAccountId) {
    const outgoing = Number(tx.amount) < 0;
    return {
      accountId: outgoing ? tx.accountId : tx.toAccountId,
      toAccountId: outgoing ? tx.toAccountId : tx.accountId,
      direction: "out",
    };
  }
  return { accountId: tx.accountId, toAccountId: "", direction: "out" };
};

// Modal
const openModal = (tx?: any) => {
  editingTransaction.value = tx || null;
  if (tx) {
    const p = transferPerspective(tx);
    form.value = {
      description: tx.description,
      amount: Math.abs(Number(tx.amount)),
      date: tx.date,
      type: tx.type,
      accountId: p.accountId,
      categoryId: tx.categoryId || "",
      toAccountId: p.toAccountId,
      externalParty: tx.externalParty || "",
      direction: p.direction,
      tagIds: tx.tags?.map((t: any) => t.tagId) || [],
      notes: tx.notes || "",
      status: tx.status,
    };
  } else {
    form.value = { ...defaultForm, tagIds: [] };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingTransaction.value = null;
  form.value = { ...defaultForm, tagIds: [] };
  error.value = "";
};

const toggleTag = (tagId: string) => {
  const idx = form.value.tagIds.indexOf(tagId);
  if (idx === -1) {
    form.value.tagIds.push(tagId);
  } else {
    form.value.tagIds.splice(idx, 1);
  }
};

const onImported = async () => {
  showImportModal.value = false;
  await loadTransactions();
};

const error = ref("");

const saveTransaction = async () => {
  error.value = "";
  if (!form.value.accountId) {
    error.value = "Please select an account";
    return;
  }
  if (!form.value.description.trim()) {
    error.value = "Description is required";
    return;
  }
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    error.value = "Amount must be greater than zero";
    return;
  }
  if (form.value.type === "transfer" && !form.value.toAccountId) {
    error.value = "Transfers need a destination account";
    return;
  }

  saving.value = true;
  try {
    const payload: any = { ...form.value };
    if (payload.type === "transfer" && payload.toAccountId === "external") {
      payload.toAccountId = null; // one-sided external transfer
    } else {
      delete payload.externalParty;
      delete payload.direction;
    }

    if (editingTransaction.value) {
      await updateTransaction(editingTransaction.value.id, payload);
    } else {
      await createTransaction(payload);
    }
    await loadTransactions();
    closeModal();
  } catch (err: any) {
    error.value = err.response?.data?.error ?? "Failed to save transaction";
  } finally {
    saving.value = false;
  }
};

// Delete
const confirmDelete = (tx: any) => {
  deletingTransaction.value = tx;
  showDeleteConfirm.value = true;
};

const deleteTransactionConfirmed = async () => {
  if (!deletingTransaction.value) {
    return;
  }
  await deleteTransaction(deletingTransaction.value.id);
  await loadTransactions();
  showDeleteConfirm.value = false;
  deletingTransaction.value = null;
};

const duplicateTransaction = (tx: any) => {
  // Only the incoming side of an internal (two-sided) transfer can't be copied
  // on its own; external transfers are one-sided, so they're fine.
  if (tx.type === "transfer" && !tx.externalParty && Number(tx.amount) >= 0) {
    alert("To duplicate a transfer, use the outgoing record.");
    return;
  }
  editingTransaction.value = null;
  form.value = {
    description: `${tx.description} (copy)`,
    amount: Math.abs(Number(tx.amount)),
    date: new Date().toISOString().split("T")[0],
    type: tx.type,
    accountId: tx.accountId,
    categoryId: tx.categoryId || "",
    toAccountId: tx.toAccountId || (tx.externalParty ? "external" : ""),
    externalParty: tx.externalParty || "",
    direction: Number(tx.amount) >= 0 ? "in" : "out",
    tagIds: tx.tags?.map((t: any) => t.tagId) || [],
    notes: tx.notes || "",
    status: tx.status,
  };

  showModal.value = true;
};

const handleClickOutSideTags = (e: MouseEvent) => {
  if (
    formTagMenuRef.value &&
    !formTagMenuRef.value.contains(e.target as Node)
  ) {
    showFormTagMenu.value = false;
  }
};

const onCategorySaved = async (newCategory: any) => {
  await loadCategories();
  form.value.categoryId = newCategory.id;
  showCategoryModal.value = false;
};

onUnmounted(() =>
  document.removeEventListener("click", handleClickOutSideTags),
);
</script>
