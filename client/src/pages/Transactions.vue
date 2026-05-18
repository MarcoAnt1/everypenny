<template>
    <div>Transactions</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getTags } from '../api/tags';

const loading = ref(true);
const saving = ref(false);
const transactions = ref<any[]>([]);
const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const tags = ref<any[]>([]);
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const editingTransaction = ref<any>(null);
const deletingTransaction = ref<any>(null);

const filters = ref({
    type: '',
    accountId: '',
    categoryId: '',
    startDate: '',
    endDate: '',
});

const defaultForm = {
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    accountId: '',
    categoryId: '',
    tagIds: [] as string[],
    notes: '',
    status: 'cleared'
}

const form = ref({ ...defaultForm, tagIds: [] as string[] });

onMounted(async () => {
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

        if (filters.value.accountId) {
            params.accountId = filters.value.accountId;
        }

        if (filters.value.categoryId) {
            params.categoryId = filters.value.categoryId;
        }

        if (filters.value.startDate) {
            params.startDate = filters.value.startDate;
        }

        if (filters.value.endDate) {
            params.endDate = filters.value.endDate;
        }

        const res = await getTransactions(params);
        transactions.value = res.data;
    } catch (error) {
        console.error('Error loading transactions:', error);
    } finally {
        loading.value = false;
    }
}

const loadAccounts = async () => { const res = await getAccounts(); accounts.value = res.data };
const loadCategories = async () => { const res = await getCategories(); categories.value = res.data };
const loadTags = async () => { const res = await getTags(); tags.value = res.data };

// Filters
const applyFilters = () => loadTransactions();
const clearFilters = () => {
    filters.value = {
        type: '',
        accountId: '',
        categoryId: '',
        startDate: '',
        endDate: '',
    };
    loadTransactions();
}

// Summary
const totalIncome = computed(() => transactions.value.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
const totalExpenses = computed(() => transactions.value.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
const net = computed(() => totalIncome.value - totalExpenses.value);

// Modal
const openModal = (tx?: any) => {
    editingTransaction.value = tx || null;
    form.value = tx ? {
        description: tx.description,
        amount: tx.amount,
        date: tx.date.split('T')[0],
        type: tx.type,
        accountId: tx.accountId,
        categoryId: tx.categoryId || '',
        tagIds: tx.tags?.map((t: any) => t.tagId) || [],
        notes: tx.notes || '',
        status: tx.status,
    } : { ...defaultForm, tagIds: []};
    showModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    editingTransaction.value = null;
    form.value = { ...defaultForm, tagIds: [] };
}

const toggleTag = (tagId: string) => {
    const idx = form.value.tagIds.indexOf(tagId);
    if (idx === -1) {
        form.value.tagIds.push(tagId);
    } else {
        form.value.tagIds.splice(idx, 1);
    }
}

// Save
const saveTransactions = async () => {
    saving.value = true;
    try {
        if (editingTransaction.value) {
            await updateTransaction(editingTransaction.value.id, form.value);
        } else {
            await createTransaction(form.value);
        }
        await loadTransactions();
        closeModal()
    } catch (error) {
        console.error('Error saving transaction:', error);
    } finally {
        saving.value = false;
    }
}

// Delete
const confirmDelete = (tx: any) => {
    deletingTransaction.value = tx;
    showDeleteConfirm.value = true;
}

const deleteTransactionConfirmed = async () => {
    if (!deletingTransaction.value) {
        return;
    }
    await deleteTransaction(deletingTransaction.value.id);
    await loadTransactions();
    showDeleteConfirm.value = false;
    deletingTransaction.value = null;
}

// Helpers
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(amount);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

</script>