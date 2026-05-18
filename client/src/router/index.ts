import { createRouter, createWebHistory } from 'vue-router';

import Dashboard from '../pages/Dashboard.vue';
import Accounts from '../pages/Accounts.vue';
import Transactions from '../pages/Transactions.vue';
import Budgets from '../pages/Budgets.vue';
import Goals from '../pages/Goals.vue';

const routes = [
    { path: '/',              component: Dashboard },
    { path: '/accounts',      component: Accounts },
    { path: '/transactions',  component: Transactions },
    { path: '/budgets',       component: Budgets },
    { path: '/goals',         component: Goals }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
