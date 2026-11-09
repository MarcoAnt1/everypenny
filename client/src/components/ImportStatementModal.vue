<template>
    <div
        class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
        @mousedown.self="$emit('close')"
    >
        <div class="bg-white rounded-xl shadow-xl w-full sm:w-fit sm:min-w-[600px] max-w-full sm:max-w-[90vw] max-h-[90vh] flex flex-col">
            
            <!-- Header -->
            <div class="p-6 border-b flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-6">Import Statement</h3>
                    <p class="text-sm text-gray-500">{{ stepLabel }}</p>
                </div>
                <button @click="$emit('close')" class="text-gray-500 hover:text-gray-600 text-xl">
                    ✕
                </button>
            </div>

            <!-- Progress Bar -->
            <div class="px-6 pt-4">
                <div class="flex items-center gap-2">
                    <div
                        v-for="(label, i) in steps"
                        :key="i"
                        class="flex items-center gap-2 flex-1"
                    >
                        <div class="flex items-center gap-2">
                            <div 
                                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                :class="step > i
                                    ? 'bg-indigo-600 text-white'
                                    : step === i
                                        ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                                        : 'bg-gray-100 text-gray-500'"   
                            >
                                {{ step > i ? '✓' : i + 1 }}
                            </div>
                            <span
                                class="text-sm hidden sm:inline"
                                :class="step === i ? 'text-indigo-600 font-medium' : 'text-gray-500'"
                            >
                                {{  label }}
                            </span>
                        </div>
                        <div v-if="i < steps.length - 1" class="flex-1 h-px bg-gray-200 mx-2" />
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6">

                <div v-if="step === 0" class="space-y-6">

                    <!-- Error -->
                    <div
                        v-if="error"
                        class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg"
                    >
                        {{ error }}
                    </div>

                    <!-- Account -->
                    <div>
                        <label class="text-sm font-medium text-gray-600">Import to Account</label>
                        <Dropdown
                            v-model="form.accountId"
                            :options="importAccountOptions"
                            placeholder="Select account"
                            class="w-full mt-1"
                        />
                    </div>

                    <!-- Bank + Statement Type -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Bank</label>
                            <Dropdown
                                :model-value="form.bank"
                                :options="bankOptions"
                                placeholder="Select bank"
                                class="w-full mt-1"
                                @update:model-value="onBankSelect"
                            />
                        </div>

                        <div>
                            <label class="text-sm font-medium text-gray-600">Statement Type</label>
                            <Dropdown
                                v-model="form.statementType"
                                :options="statementTypeOptions"
                                :disabled="!form.bank"
                                :placeholder="form.bank ? 'Select type' : 'Pick a bank first'"
                                class="w-full mt-1"
                            />
                        </div>
                    </div>

                    <!-- File Upload -->
                    <div>
                        <label class="text-sm font-medium text-gray-600">Statement File</label>
                        <div
                            class="mt-1 border-2 border-dashed rounded-xl p-8 text-center transition"
                            :class="form.file
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-gray-300 hover:border-indigo-400'"
                            @dragover.prevent
                            @drop.prevent="onDrop"
                        >
                            <div v-if="!form.file">
                                <p class="text-3xl mb-2">📂</p>
                                <p class="text-sm text-gray-500">Drag & drop your file here or</p>
                                <label class="mt-2 inline-block cursor-pointer text-indigo-600 text-sm hover:underline">
                                    browse to upload
                                    <input
                                        type="file"
                                        class="hidden"
                                        :accept="acceptedFormats"
                                        @change="onFileChange"
                                    >
                                </label>
                                <p class="text-xs text-gray-500 mt-2"> {{ acceptedFormats }}</p>
                            </div>
                            <div v-else class="flex items-center justify-center gap-3">
                                <span class="text-2xl">📄</span>
                                <div class="text-left">
                                    <p class="text-sm font-medium text-gray-700">{{ form.file.name }}</p>
                                    <p class="text-xs text-gray-500">{{ formatFileSize(form.file.size) }}</p>
                                </div>
                                <button
                                    @click="form.file = null"
                                    class="ml-4 text-red-400 hover:text-red-600 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preview -->
                <div v-if="step === 1">
                    <div v-if="loading" class="text-center py-16 text-gray-500">
                        <p class="text-3xl mb-3">⏳</p>
                        <p>Parsing your statement...</p>
                    </div>

                    <div v-else>

                        <!-- Error -->
                        <div
                            v-if="error"
                            class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4"
                        >
                            {{ error }}
                        </div>

                        <!-- Rows the parser couldn't read -->
                        <div
                            v-if="invalidCount > 0"
                            class="bg-yellow-50 text-yellow-700 text-sm px-4 py-3 rounded-lg mb-4"
                        >
                            ⚠️ {{ invalidCount }} row{{ invalidCount === 1 ? '' : 's' }} couldn't be read and {{ invalidCount === 1 ? 'is' : 'are' }} not shown below.
                        </div>

                        <!-- Rows already saved in this account -->
                        <div
                            v-if="duplicateCount > 0"
                            class="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-lg mb-4"
                        >
                            {{ duplicateCount }} row{{ duplicateCount === 1 ? ' looks' : 's look' }} already imported into this account and {{ duplicateCount === 1 ? 'was' : 'were' }} unchecked. Re-check any that are genuinely new.
                        </div>

                        <!-- Own-account transfers matched to another account -->
                        <div
                            v-if="transferMatchCount > 0"
                            class="bg-indigo-50 text-indigo-700 text-sm px-4 py-3 rounded-lg mb-4"
                        >
                            {{ transferMatchCount }} row{{ transferMatchCount === 1 ? ' matches' : 's match' }} a transaction in another of your accounts and {{ transferMatchCount === 1 ? 'was' : 'were' }} set as a transfer. On import {{ transferMatchCount === 1 ? 'it is' : 'they are' }} linked to the existing transaction instead of counted twice.
                        </div>

                        <!-- Summary -->
                        <div class="grid grid-cols-3 gap-3 mb-6">
                            <div class="bg-gray-100 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-500">Total</p>
                                <p class="text-xl font-bold text-gray-700">{{ previewRows.length }}</p>
                            </div>
                            <div class="bg-green-100 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-500">Income</p>
                                <p class="text-xl font-bold text-green-600">{{ incomeCount }}</p>
                            </div>
                            <div class="bg-red-100 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-500">Expenses</p>
                                <p class="text-xl font-bold text-red-500">{{ expenseCount }}</p>
                            </div>
                        </div>

                        <!-- Transactions Table -->
                        <div class="overflow-x-auto rounded-xl border">
                            <table class="text-sm">
                                <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th class="px-3 py-3 text-left w-8">
                                            <input type="checkbox" @change="toggleAll" :checked="allSelected" />
                                        </th>
                                        <th class="px-6 py-3 text-left">Date</th>
                                        <th class="px-6 py-3 text-left">Description</th>
                                        <th class="px-6 py-3 text-left">Type</th>
                                        <th class="px-6 py-3 text-left">To Account</th>
                                        <th class="px-6 py-3 text-left">Category</th>
                                        <th class="px-6 py-3 text-left">Tags</th>
                                        <th class="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr
                                        v-for="(row, i) in previewRows"
                                        :key="i"
                                        class="hover:bg-gray-50 transition"
                                        :class="!row.selected ? 'opacity-40' : ''"
                                    >
                                        <!-- Select -->
                                        <td class="px-3 py-2">
                                            <input type="checkbox" v-model="row.selected" />
                                        </td>

                                        <!-- Date -->
                                        <td class="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                                            {{ formatDate(row.date) }}
                                        </td>

                                        <!-- Description (editable) -->
                                        <td class="px-3 py-2">
                                            <input
                                                v-model="row.description"
                                                type="text"
                                                class="w-full min-w-40 border rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                            />
                                            <p
                                                v-if="row.match?.kind === 'duplicate'"
                                                class="mt-1 text-[11px] text-amber-700"
                                                :title="row.match.description"
                                            >
                                                ⚠️ Already imported · {{ formatDate(row.match.date) }} · {{ row.match.description }}
                                            </p>
                                            <p
                                                v-else-if="row.match?.kind === 'transfer'"
                                                class="mt-1 text-[11px] text-indigo-600"
                                                :title="row.match.description"
                                            >
                                                🔗 Matches {{ row.match.accountName }} · {{ formatDate(row.match.date) }} · {{ row.match.description }}
                                            </p>
                                        </td>

                                        <!-- Type toggle -->
                                        <td class="px-3 py-2">
                                            <button
                                                @click="cycleType(row)"
                                                class="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
                                                :class="row.type === 'income'
                                                    ? 'bg-green-100 text-green-600'
                                                    : row.type === 'transfer'
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : 'bg-red-100 text-red-500'"
                                            >
                                                {{  row.type === 'income' ? '💰 Income' : row.type === 'transfer' ? '🔁 Transfer' : '💸 Expense' }}
                                            </button>
                                        </td>

                                        <!-- To Account (Only relevant for transfers)-->
                                        <td class="px-3 py-2">
                                            <Dropdown
                                                v-if="row.type === 'transfer'"
                                                v-model="row.toAccountId"
                                                :options="rowToAccountOptions"
                                                placeholder="- Save as expense -"
                                                class="min-w-40"
                                            />
                                            <span v-else class="text-gray-300">-</span>
                                        </td>

                                        <!-- Category -->
                                        <td class="px-3 py-2">
                                            <CategoryPicker
                                                v-model="row.categoryId"
                                                :categories="categories"
                                                placeholder="— None —"
                                                class="min-w-44"
                                            />
                                        </td>

                                        <!-- Tag toggle -->

                                        <td class="px-3 py-2">
                                            <div class="relative">
                                                <button
                                                    @click.stop="openTagMenu = openTagMenu === i ? null : i"
                                                    type="button"
                                                    class="tag-trigger-btn w-full border rounded px-2 py-1 text-xs text-left bg-white hover:bg-gray-50"    
                                                >
                                                    {{  row.tagIds.length > 0 ? `${row.tagIds.length} selected` : '— Tags —' }}
                                                </button>

                                                <div
                                                    v-if="openTagMenu === i"
                                                    @click.stop
                                                    class="absolute z-50 mt-1 w-40 bg-white border rounded-lg shadow-lg p-2 space-y-1"
                                                >
                                                    <label 
                                                        v-for="tag in tags"
                                                        :key="tag.id"
                                                        class="flex items-center gap-2 text-xs px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            :checked="row.tagIds.includes(tag.id)"
                                                            @change="toggleRowTag(row, tag.id)"
                                                        />
                                                        {{ tag.name }}
                                                    </label>
                                                    <div 
                                                        v-if="tags.length === 0" class="text-xs text-gray-500 px-2 py-1"
                                                    >
                                                        No tags yet
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <!-- Amount -->
                                        <td 
                                            class="px-3 py-3 text-right font-semibold whitespace-nowrap"
                                            :class="row.type === 'income'
                                                ? 'text-green-500'
                                                : row.type === 'transfer'
                                                    ? 'text-indigo-500'
                                                    : 'text-red-500'"
                                        >
                                            {{ (row.type === 'transfer' ? row.direction === 'in' : row.type === 'income') ? '+' : '-' }}{{ formatCurrency(Math.abs(Number(row.amount))) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Success -->
                <div v-if="step === 2" class="text-center py-16">
                    <p class="text-5xl mb-4">🎉</p>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">Import Successful!</h3>
                    <p class="text-gray-500">
                        <strong class="text-indigo-600">{{ importedCount }}</strong> transactions imported successfully.
                    </p>
                    <p v-if="skippedCount > 0" class="text-sm text-gray-500 mt-1">
                        {{ skippedCount }} row{{ skippedCount === 1 ? '' : 's' }} were skipped.
                    </p>
                    <p v-if="linkedCount > 0" class="text-sm text-gray-500 mt-1">
                        🔗 {{ linkedCount }} transfer{{ linkedCount === 1 ? ' was' : 's were' }} linked to an existing transaction instead of duplicated.
                    </p>
                    <div
                        v-if="warning"
                        class="mt-4 mx-auto max-w-md bg-yellow-50 text-yellow-700 text-sm px-4 py-3 rounded-lg"
                    >
                        ⚠️ {{ warning }}
                    </div>
                </div>
            </div>
        
            <!-- Footer -->
            <div class="p-6 border-t flex justify-between items-center">
                <button
                    v-if="step > 0 && step < 2"
                    @click="step--"
                    class="btn-secondary"
                >
                    ← Back
                </button>
                <div v-else />

                <div class="flex gap-3">
                    <button
                        v-if="step < 2"
                        @click="emit('close')"
                        class="btn-secondary"
                    >
                        Cancel
                    </button>

                    <!-- Parse -->
                    <button
                        v-if="step === 0"
                        @click="parseFile"
                        :disabled="!form.accountId || !form.bank || !form.statementType || !form.file || loading"
                        class="btn-primary"
                    >
                        Parse Statement →
                    </button>

                    <!-- Confirm -->
                    <button
                        v-if="step === 1 && !loading"
                        @click="confirmImport"
                        :disabled="selectedRows.length === 0 || saving"
                        class="btn-primary"
                    >
                        {{ saving ? 'Importing...' : `Import ${selectedRows.length} Transactions` }}
                    </button>

                    <!-- Done -->
                    <button
                        v-if="step === 2"
                        @click="emit('close')"
                        class="btn-primary"
                    >
                        Done ✓
                    </button>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
    preview,
    confirmImport as confirmImportApi,
    getSupported,
    type SupportedStatement,
} from '../api/imports';
import { getCategories } from '../api/categories';
import { getTags } from '../api/tags';
import { formatCurrency, formatDate } from '../utils/format';
import Dropdown from './Dropdown.vue';
import CategoryPicker from './CategoryPicker.vue';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

const props = defineProps<{ accounts: any[] }>();
const emit = defineEmits(['close', 'imported']);

const step = ref(0);
const loading = ref(false);
const saving = ref(false);
const error = ref('');

const importedCount = ref(0);
const skippedCount = ref(0);
const linkedCount = ref(0);
const invalidCount = ref(0);
const warning = ref('');

const previewRows = ref<any[]>([]);
const categories = ref<any[]>([]);
const tags = ref<any[]>([]);
const supported = ref<SupportedStatement[]>([]);

const openTagMenu = ref<number | null>(null);

const steps = [ 'Upload', 'Preview & Edit', 'Done'];

// Display names for the backend's Bank / StatementType enum values.
const BANK_LABELS: Record<string, string> = {
    amex: 'American Express',
    neo: 'Neo Financial',
    wealthsimple: 'Wealthsimple',
    cibc: 'CIBC',
    td: 'TD',
    rbc: 'RBC',
    bmo: 'BMO',
    scotiabank: 'Scotiabank',
};

const TYPE_LABELS: Record<string, string> = {
    credit_card: 'Credit Card',
    checking: 'Chequing',
    savings: 'Savings',
    investment: 'Investment',
};

const form = ref({
    accountId: '',
    bank: '',
    statementType: '',
    file: null as File | null
});

onMounted(async () => {
    document.addEventListener('click', closeTagMenu);
    try {
        const res = await getSupported();
        supported.value = res.data;
    } catch (err) {
        error.value = 'Could not load the list of supported banks.';
    }
});

onUnmounted(() => document.removeEventListener('click', closeTagMenu));

const closeTagMenu = () => (openTagMenu.value = null);

// Banks that have at least one parser registered.
const availableBanks = computed(() =>
    [...new Set(supported.value.map((s) => s.bank))].sort(),
);

// Statement types available for the chosen bank.
const availableTypes = computed(() =>
    supported.value
        .filter((s) => s.bank === form.value.bank)
        .map((s) => s.statementType),
);

const onBankChange = () => {
    // The previously chosen type may not exist for this bank.
    form.value.statementType =
        availableTypes.value.length === 1 ? availableTypes.value[0] : '';
};

const importAccountOptions = computed(() =>
    props.accounts.map((a) => ({
        value: a.id,
        label: `${a.name} — ${formatCurrency(a.balance)}`,
    })),
);
const bankOptions = computed(() =>
    availableBanks.value.map((b) => ({ value: b, label: BANK_LABELS[b] ?? b })),
);
const statementTypeOptions = computed(() =>
    availableTypes.value.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t })),
);
const onBankSelect = (value: string) => {
    form.value.bank = value;
    onBankChange();
};

const rowToAccountOptions = computed(() => [
    { value: '', label: '- Save as expense -' },
    ...props.accounts
        .filter((a) => a.id !== form.value.accountId)
        .map((a) => ({ value: a.id, label: a.name })),
]);

const acceptedFormats = computed(() => {
    return '.pdf,.xls,.xlsx,.csv';
});

const stepLabel = computed(() => {
    if (step.value === 0) return 'Select your bank and upload your statement';
    if (step.value === 1) return `${previewRows.value.length} transactions found - review before importing`;

    return 'All done!';
});

const selectedRows = computed(() => previewRows.value.filter(r => r.selected));
const incomeCount = computed(() => previewRows.value.filter(r => r.type === 'income').length);
const expenseCount = computed(() => previewRows.value.filter(r => r.type === 'expense').length);
const duplicateCount = computed(() => previewRows.value.filter(r => r.match?.kind === 'duplicate').length);
const transferMatchCount = computed(() => previewRows.value.filter(r => r.match?.kind === 'transfer').length);
const allSelected = computed(
    () => previewRows.value.length > 0 && previewRows.value.every(r => r.selected),
);

const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    form.value.file = target.files?.[0] || null;
}

const onDrop = (e: DragEvent) => {
    form.value.file = e.dataTransfer?.files?.[0] || null;
}

const parseFile = async () => {
    if (!form.value.file || !form.value.bank || !form.value.statementType) return;

    error.value = '';
    loading.value = true;
    step.value = 1;

    try {
        const [ catRes, tagRes ] = await Promise.all([getCategories(), getTags()]);
        categories.value = catRes.data;
        tags.value = tagRes.data;

        const res = await preview(
            form.value.file,
            form.value.bank,
            form.value.statementType,
            form.value.accountId,
        );

        invalidCount.value = res.data.invalid ?? 0;
        previewRows.value = res.data.rows
            .filter((r: any) => r.valid)
            .map((r: any) => {
                const match = r.match ?? null;
                const isTransfer = match?.kind === 'transfer';
                return {
                    rowIndex: r.rowIndex,
                    date: r.date,
                    description: r.description,
                    amount: r.amount,
                    // Matched own-account transfers start as a transfer to the
                    // account that already holds the other side.
                    type: isTransfer ? 'transfer' : r.type,
                    // Money in or out of this account, kept even if the row is
                    // re-typed as a transfer.
                    direction: r.direction ?? (r.type === 'income' ? 'in' : 'out'),
                    valid: r.valid,
                    // Already saved in this account: start unchecked.
                    selected: match?.kind !== 'duplicate',
                    match,
                    categoryId: r.categoryId || '',
                    toAccountId: isTransfer ? match.accountId : (r.toAccountId || ''),
                    tagIds: [] as string[]
                };
            });
    } catch (err: any) {
        error.value =
            err.response?.data?.error ??
            'Failed to parse statement. Check the bank, statement type, and file.';
        toast.error(error.value);
        step.value = 0;
    } finally {
        loading.value = false;
    }
}

const toggleAll = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    previewRows.value.forEach(r => r.selected = checked);
}

const toggleRowTag = (row:any, tagId: string) => {
    const idx = row.tagIds.indexOf(tagId);
    if (idx === -1) row.tagIds.push(tagId);
    else row.tagIds.splice(idx, 1);
}

const confirmImport = async () => {
    error.value = '';
    saving.value = true;
    try {
        const res = await confirmImportApi(
            form.value.accountId,
            form.value.statementType,
            selectedRows.value.map(r => ({
                date: r.date,
                description: r.description,
                amount: r.amount,
                type: r.type,
                direction: r.direction,
                categoryId: r.categoryId || null,
                toAccountId: r.toAccountId || null,
                // Only if the row is still a transfer to the matched account.
                linkTransactionId:
                    r.match?.kind === 'transfer' &&
                    r.type === 'transfer' &&
                    r.toAccountId === r.match.accountId
                        ? r.match.transactionId
                        : null,
                tagIds: r.tagIds || [],
                valid: r.valid
            }))
        );
        importedCount.value = res.data.imported;
        skippedCount.value = res.data.skipped || 0;
        linkedCount.value = res.data.linked || 0;
        warning.value = res.data.warning || '';
        step.value = 2;
        emit('imported');
        toast.success(
            `${importedCount.value} transaction${importedCount.value === 1 ? '' : 's'} imported`,
        );
    } catch (err: any) {
        error.value =
            err.response?.data?.error ?? 'Failed to import transactions.';
        toast.error(error.value);
    } finally {
        saving.value = false;
    }
}

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const cycleType = (row: any) => {
    if (row.type === 'expense') row.type = 'income'
    else if (row.type === 'income') row.type = 'transfer'
    else row.type = 'expense'
}

</script>