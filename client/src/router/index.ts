import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";
import Accounts from "../pages/Accounts.vue";
import Transactions from "../pages/Transactions.vue";
import Budgets from "../pages/Budgets.vue";
import Goals from "../pages/Goals.vue";
import Categories from "../pages/Categories.vue";
import Tags from "../pages/Tags.vue";
import Connections from "../pages/Connections.vue";

const routes = [
  { path: "/login", component: Login, meta: { public: true } },
  { path: "/", component: Dashboard },
  { path: "/accounts", component: Accounts },
  { path: "/transactions", component: Transactions },
  { path: "/budgets", component: Budgets },
  { path: "/goals", component: Goals },
  { path: "/categories", component: Categories },
  { path: "/tags", component: Tags },
  { path: "/connections", component: Connections },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (!to.meta.public && !authStore.isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && authStore.isAuthenticated) {
    next("/");
  } else {
    next();
  }
});

export default router;
