<template>
    <div
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        @click.self="$emit('close')"
    >
        <div class="bg-white rounded-xl shadow-xl w-fit min-w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col">
            
            <!-- Header -->
            <div class="p-6 border-b flex items center justify-between">
                <div>
                    <h3 class="text-lg-font-semibold text-gray-800 mb-6">Import Statement</h3>
                    <p class="text-sm text-gray-400">{{ stepLabel }}</p>
                </div>
                <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-xl">
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
                                        ? 'bg-indigo-100 text-indigo-600 border-2 border-inddigo-600'
                                        : 'bg-gray-100 text-gray-400'"   
                            >
                                {{ step > i ? '✓' : i + 1 }}
                            </div>
                            <span
                                class="text-sm"
                                :class="step === i ? 'text-indigo-600 font-medium' : 'text-gray-400'"
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
                    
                    <!-- Account -->
                    <div>
                        <label class="text-sm font-medium text-gray-600">Import to Account</label>
                        <select
                            v-model="form.accountId"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="">Select account</option>
                            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                                {{ acc.name }} — {{ formatCurrency(acc.balance) }}
                            </option>
                        </select>
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
                                <p class="text-xs text-gray-400 mt-2"> {{ acceptedFormats }}</p>
                            </div>
                            <div v-else class="flex items-center justify-center gap-3">
                                <span class="text-2xl">📄</span>
                                <div class="text-left">
                                    <p class="text-sm font-medium text-gray-700">{{ form.file.name }}</p>
                                    <p class="text-xs text-gray-400">{{ formatFileSize(form.file.size) }}</p>
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
                    <div v-if="loading" class="text-center py-16 text-gray-400">
                        <p class="text-3xl mb-3">⏳</p>
                        <p>Parsing your statement...</p>
                    </div>

                    <div v-else>

                        <!-- Summary -->
                        <div class="grid grid-cols-4 gap-4 mb-6">
                            <div class="bg-gray-50 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-400">Total</p>
                                <p class="text-xl font-bold text-gray-700">{{ previewRows.length }}</p>
                            </div>
                            <div class="bg-green-50 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-400">Income</p>
                                <p class="text-xl font-bold text-green-600">{{ incomeCount }}</p>
                            </div>
                            <div class="bg-red-50 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-400">Expenses</p>
                                <p class="text-xl font-bold text-red-500">{{ expenseCount }}</p>
                            </div>
                            <div class="bg-indigo-50 rounded-lg p-3 text-center">
                                <p class="text-xs text-gray-400">Matched</p>
                                <p class="text-xl font-bold text-indigo-600">{{ matchedCount }}</p>
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
                                        <th class="px-6 py-3 text-left">Category</th>
                                        <th class="px-6 py-3 text-right">Amount</th>
                                        <th class="px-6 py-3 text-center">Remove</th>
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

                                        <!-- Description -->
                                        <td class="px-3 py-2 text-gray-700 max-w-xs truncate">
                                            {{ row.description }}
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

                                        <!-- Type toggle -->
                                        <td class="px-3 py-2">
                                            <select
                                                v-model="row.categoryId"
                                                class="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-32"
                                            >
                                                <option value="">— None —</option>
                                                <option
                                                    v-for="cat in categories"
                                                    :key="cat.id"
                                                    :value="cat.id"
                                                >
                                                    {{  cat.name }}
                                                </option>
                                            </select>
                                        </td>

                                        <!-- Amount -->
                                        <td 
                                            class="px-3 py-3 text-right font-semibold whitespace-nowrap"
                                            :class="row.type === 'income' ? 'text-green-500' : 'text-red-500'"    
                                        >
                                            {{ row.type === 'income' ? '+' : '-' }}{{ formatCurrency(row.amount) }}
                                        </td>

                                        <!-- Remove -->
                                        <td class="px-3 py-2 text-center">
                                            <button
                                                @click="removeRow(i)"
                                                class="text-red-400 hover:text-red-600 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Sucess -->
                <div v-if="step === 2" class="text-center py-16">
                    <p class="text-5xl mb-4">🎉</p>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">Import Successful!</h3>
                    <p class="text-gray-400">
                        <strong class="text-indigo-600">{{ importedCount }}</strong> transactions imported successfully.
                    </p>
                    <p v-if="skippedCount > 0" class="text-sm text-gray-400 mt-1">
                        {{ skippedCount }} row were skipped.
                    </p>
                </div>
            </div>
        
            <!-- Footer -->
            <div class="p-6 border-t flex justify-between items center">
                <button
                    v-if="step > 0 && step < 2"
                    @click="step--"
                    class="border text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                    ← Back
                </button>
                <div v-else />

                <div class="flex gap-3">
                    <button
                        v-if="step < 2"
                        @click="emit('close')"
                        class="border text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel
                    </button>

                    <!-- Parse -->
                    <button
                        v-if="step === 0"
                        @click="parseFile"
                        :disabled=" !form.accountId || !form.file || loading"
                        class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                    >
                        Parse Statement →
                    </button>

                    <!-- Confirm -->
                    <button
                        v-if="step === 1 && !loading"
                        @click="confirmImport"
                        :disabled="selectedRows.length === 0 || saving"
                        class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                    >
                        {{ saving ? 'Importing...' : `Import ${selectedRows.length} Transactions` }}
                    </button>

                    <!-- Done -->
                    <button
                        v-if="step === 2"
                        @click="emit('close')"
                        class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                    >
                        Done ✓
                    </button>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue';
import { preview, confirmImport as confirmImportApi } from '../api/import';
import { getCategories } from '../api/categories';

const props = defineProps<{ accounts: any[] }>();
const emit = defineEmits(['close', 'imported']);

const step = ref(0);
const loading = ref(false);
const saving = ref(false);

const importedCount = ref(0);
const skippedCount = ref(0);

const previewRows = ref<any[]>([]);
const categories = ref<any[]>([]);

const steps = [ 'Upload', 'Preview & Edit', 'Done'];

const form = ref({
    accountId: '',
    file: null as File | null
});

const acceptedFormats = computed(() => {
    return '.pdf,.xls,.xlsx';
});

const stepLabel = computed(() => {
    if (step.value === 0) return 'Select your bank and upload your statement';
    if (step.value === 1) return `${previewRows.value.length} transactions found - review before importing`;

    return 'All done!';
});

const selectedRows = computed(() => previewRows.value.filter(r => r.selected));
const incomeCount = computed(() => previewRows.value.filter(r => r.type === 'income').length);
const expenseCount = computed(() => previewRows.value.filter(r => r.type === 'expense').length);
const matchedCount = computed(() => previewRows.value.filter(r => r.categoryId).length);
const allSelected = computed(() => previewRows.value.every(r => r.selected));

const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    form.value.file = target.files?.[0] || null;
}

const onDrop = (e: DragEvent) => {
    form.value.file = e.dataTransfer?.files?.[0] || null;
}

const parseFile = async () => {
    if (!form.value.file) return;

    loading.value = true;
    step.value = 1;

    try {
        const catRes = await getCategories();
        categories.value = catRes.data;

        const bankType = props.accounts.find(a => a.id === form.value.accountId).name;

        const res = await preview(form.value.file, bankType);

        previewRows.value = res.data.rows
            .filter((r: any) => r.valid)
            .map((r: any) => ({
                ...r,
                selected: true,
                categoryId: r.categoryId || ''
            }));
    } catch (error: any) {
        console.error('Parse error:', error);
        alert('Failed to parse statement. Please check the file format.');
        step.value = 0;
    } finally {
        loading.value = false;
    }
}

const toggleAll = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    previewRows.value.forEach(r => r.selected = checked);
}

const removeRow = (index: number) => {
    previewRows.value.splice(index, 1);
}

const confirmImport = async () => {
    saving.value = true;
    try {
        const res = await confirmImportApi(
            form.value.accountId,
            selectedRows.value.map(r => ({
                date: r.date,
                description: r.description,
                amount: r.amount,
                type: r.type,
                categoryId: r.categoryId || null,
                valid: r.valid
            }))
        );
        importedCount.value = res.data.imported;
        skippedCount.value = res.data.skipped || 0;
        step.value = 2;
        emit('imported');
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import transactions.');
    } finally {
        saving.value = false;
    }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(amount);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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