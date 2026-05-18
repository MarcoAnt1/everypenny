<template>
    <div class="flex h-screen bg-gray-100">

        <!-- Sidebar -->
        <aside class="w-64 bg-white shadow-md flex flex-col">

            <!-- Logo -->
            <div class="p6 border-b">
                <h1 class="text-2x1 font-bold text-indigo-600">💰 Every Penny</h1>
                <p class="text-xs text-gray-400 mt-1">Personal Finance Manager</p>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 p-4 space-y-1">
                <RouterLink
                    v-for="item in menuItems"
                    :key="item.path"
                    :to="item.path"
                    class="flex items-center gap-3 px-4 py3 rounded-lg text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    active-class="bg-indigo-50 text-indigo600 font-semibold"
                >
                    <span class="text-x1">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                </RouterLink>
            </nav>

            <!-- Footer -->
             <div class="p-4 border-t text-xs text-gray-400 text-center">
                EveryPenny v0.1.0
             </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden">

            <!-- Header -->
            <header class="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
                <h2 class="text-x1 font-semibold text-gray-700">{{ currentPage }}</h2>
                <span class="text-sm text-gray-400">{{ today }}</span>
            </header>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-8">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">

import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const menuItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Accounts', path: '/accounts', icon: '🏦' },
    { label: 'Transactions', path: '/transactions', icon: '💸' },
    { label: 'Budgets', path: '/budgets', icon: '📋' },
    { label: 'Goals', path: '/goals', icon: '🎯' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
];

const currentPage = computed(() => {
    const item = menuItems.find(item => item.path === route.path);
    return item ? item.label : 'EveryPenny';
});

const today = computed(() => {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
})

</script>