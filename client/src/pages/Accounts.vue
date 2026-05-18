<template>
    <div class="space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Accounts</h2>
                <p class="text-sm text-gray-400">Manage your bank accounts</p>
            </div>
            <button
                @click="openModal()"
                class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Account
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center text-gray-400 py-16">Loading...</div>

        <!-- Empty -->
        <div v-else-if="accounts.length === 0" class="text-center text-gray-400 py-16">
            <p class="text-4xl mb-4">🏦</p>
            <p class="text-lg font-medium">No accounts found</p>
            <p class="text-sm">Add your first account to get started</p>
        </div>

        <!-- Accounts Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
                v-for="account in accounts"
                :key="account.id"
                class="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4"
            >
                <!-- Account Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-gray-800">{{ account.name }}</p>
                        <p class="text-xs text-gray-400 capitalize">{{ account.type }}</p>
                    </div>
                    <span class="text-2xl">{{ accountIcon(account.type) }}</span>
                </div>

                <!-- Balance -->
                <div>
                    <p class="text-xs text-gray-400">Current Balance</p>
                    <p 
                        class="text-2xl font-bold"
                        :class="account.balance >= 0 ? 'text-indigo-600' : 'text-red-500'"
                    >
                        {{  formatCurrency(account.balance) }}
                    </p>
                </div>

                <!-- Institution -->
                <p v-if="account.institution" class="text-xs text-gray-400">
                    🏛️ {{ account.institution }}
                </p>

                <!-- Actions -->
                <div class="flex gap-2 pt-2 border-t">
                    <button 
                        @click="openModal(account)"
                        class="flex-1 text-sm text-indigo-600 hover:bg-indigo-50 py-1 rounded transition"
                    >
                        Edit
                    </button>
                    <button
                        @click="confirmDelete(account)"
                        class="flex-1 text-sm text-red-500 hover:bg-red-50 py-1 rounded transition"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Total Balance Bar -->
        <div v-if="accounts.length > 0" class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-400">Total Net Worth</p>
                    <p class="text-3xl font-bold text-indigo-600">{{ formatCurrency(totalBalance) }}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-400">{{ accounts.length }} account{{ accounts.length > 1 ? 's' : '' }}</p>
                </div>
            </div>
        </div>


        <!-- Modal -->
        <div
            v-if="showModal"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            @click.self="closeModal"
        >
            <div class="bg-white rounded-xl p-8 w-full max-w-md">
                <h3 class="text-lg font-semibold text-gray-800 mb-6">
                    {{ editingAccount ? 'Edit Account' : 'Add Account' }}
                </h3>

                <div class="space-y-4">
                    <!-- Name -->
                    <div>
                        <label for="account-name" class="text-sm text-gray-600 font-medium">Account Name</label>
                        <input 
                            id="account-name"
                            v-model="form.name"
                            type="text"
                            placeholder="e.g. Main Checking"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus: ring-indigo-400"
                        >
                    </div>

                    <!-- Type -->
                    <div>
                        <label for="account-type" class="text-sm text-gray-600 font-medium">Account Type</label>
                        <select
                            id="account-type"
                            v-model="form.type"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="" disabled>Select type</option>
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                            <option value="credit">Credit Card</option>
                            <option value="investment">Investment</option>
                            <option value="other">Cash</option>
                        </select>
                    </div>

                    <!-- Institution -->
                    <div>
                        <label for="account-institution" class="text-sm text-gray-600 font-medium">Institution (optional)</label>
                        <input 
                            id="account-institution"
                            v-model="form.institution"
                            type="text"
                            placeholder="e.g. Cheese Bank"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                    </div>

                    <!-- Balance -->
                    <div>
                        <label for="account-balance" class="text-sm text-gray-600 font-medium">Current Balance</label>
                        <input 
                            id="account-balance"
                            v-model.number="form.balance"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                    </div>

                    <!-- Currency -->
                    <div>
                        <label for="account-currency" class="text-sm text-gray-600 font-medium">Currency</label>
                        <select
                            id="account-currency"
                            v-model="form.currency"
                            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="" disabled>Select currency</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                        </select>
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
                            @click="saveAccount()"
                            class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                        >
                            {{ saving ? 'Saving...' : editingAccount ? 'Save Changes' : 'Add Account' }}
                        </button>
                    </div>
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
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete Account?</h3>
                <p class="text-sm text-gray-400 mb-6">
                    This will permanently delete <strong>{{ deletingAccount?.name }}</strong> and all its transactions.
                </p>
                <div class="flex gap-3">
                    <button
                        @click="showDeleteConfirm = false"
                        class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                        Cancel                        
                    </button>
                    <button
                        @click="deleteAccountConfirmed()"
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

import { computed, onMounted, ref } from 'vue';
import { createAccount, deleteAccount, getAccounts, updateAccount } from '../api/accounts';

const loading = ref(true);
const saving = ref(false);
const accounts = ref<any[]>([]);
const showModal  = ref(false)
const showDeleteConfirm = ref(false);
const editingAccount = ref<any>(null);
const deletingAccount = ref<any>(null);

const defaultForm = {
    name: '',
    type: 'checking',
    institution: '',
    balance: 0,
    currency: 'CAD'
}

const form = ref({ ...defaultForm });

// Load accounts
onMounted(async () => {
    await loadAccounts();
});

const loadAccounts = async () => {
    loading.value = true;
    try {
        const res = await getAccounts();
        accounts.value = res.data;
    } catch (error) {
        console.error('Error loading accounts:', error);
    } finally {
        loading.value = false;
    }
}

// Total Balance
const totalBalance = computed(() => {
    return accounts.value.reduce((sum, acc) => sum + acc.balance, 0);
});

// Modal
const openModal = (account?: any) => {
    editingAccount.value = account || null;
    form.value = account
        ? { 
            name: account.name, 
            type: account.type, 
            institution: account.institution || '', 
            balance: account.balance, 
            currency: account.currency || 'CAD' 
        }
        : { ...defaultForm };
    showModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    editingAccount.value = null;
    form.value = { ...defaultForm }
}

// Save
const saveAccount = async () => {
    saving.value = true;
    try {
        if (editingAccount.value) {
            await updateAccount(editingAccount.value.id, form.value);
        } else {
            await createAccount(form.value);
        }
        await loadAccounts();
        closeModal();
    } catch (error) {
        console.error('Error saving account:', error);
    } finally {
        saving.value = false;
    }
}

// Delete
const confirmDelete = (account: any) => {
    deletingAccount.value = account;
    showDeleteConfirm.value = true;
}

const deleteAccountConfirmed = async () => {
    if (!deletingAccount.value) return;
    try {
        await deleteAccount(deletingAccount.value.id);
        await loadAccounts();
    } catch (error) {
        console.error('Error deleting account:', error);
    } finally {
        showDeleteConfirm.value = false;
        deletingAccount.value = null;
    }
}

// Helpers
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

const accountIcon = (type: string) => {
    const icons: Record<string, string> = {
        checking: '🏦',
        savings: '💰',
        credit: '💳',
        investment: '📈',
        other: '💵'
    };
    return icons[type] || '🏦';
}

</script>