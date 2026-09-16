<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Mobile backdrop -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 bg-black/40 z-30 lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="bg-white shadow-md flex flex-col transition-all duration-200 ease-in-out fixed inset-y-0 left-0 z-40 w-64 lg:static lg:z-auto lg:translate-x-0"
      :class="[
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        railCollapsed ? 'lg:w-20' : 'lg:w-64',
      ]"
    >
      <!-- Logo -->
      <div class="p-6 border-b flex items-center" :class="railCollapsed ? 'lg:justify-center' : ''">
        <h1 v-if="!railCollapsed" class="text-2xl font-bold text-indigo-600 whitespace-nowrap">
          💰 Every Penny
        </h1>
        <span v-else class="text-2xl" title="Every Penny">💰</span>
      </div>
      <p v-if="!railCollapsed" class="px-6 text-xs text-gray-400 -mt-4 mb-2">
        Personal Finance Manager
      </p>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          :class="railCollapsed ? 'lg:justify-center' : ''"
          active-class="bg-indigo-50 text-indigo-600 font-semibold"
          :title="railCollapsed ? item.label : ''"
          @click="mobileOpen = false"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span v-if="!railCollapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t">
        <div
          class="flex items-center gap-3 mb-3"
          :class="railCollapsed ? 'lg:justify-center' : ''"
        >
          <div
            class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0"
            :title="railCollapsed ? authStore.user?.name : ''"
          >
            {{ authStore.user?.name?.charAt(0).toUpperCase() }}
          </div>
          <div v-if="!railCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <button
          @click="logout"
          class="w-full text-sm text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition"
          :title="railCollapsed ? 'Sign Out' : ''"
        >
          {{ railCollapsed ? "⎋" : "Sign Out" }}
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header
        class="bg-white shadow-sm px-4 sm:px-8 py-4 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3 min-w-0">
          <button
            @click="toggleSidebar"
            class="text-gray-500 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-lg transition shrink-0"
            :title="railCollapsed ? 'Expand menu' : 'Collapse menu'"
            aria-label="Toggle sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 class="text-lg sm:text-xl font-semibold text-gray-700 truncate">{{ currentPage }}</h2>
        </div>
        <span class="text-sm text-gray-400 hidden sm:inline">{{ today }}</span>
      </header>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const SIDEBAR_KEY = "everypenny.sidebarCollapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

const collapsed = ref(loadCollapsed());
const mobileOpen = ref(false);
const isDesktop = ref(matchesDesktop());

// Rail collapse only applies on desktop; on mobile the drawer always shows full labels.
const railCollapsed = computed(() => collapsed.value && isDesktop.value);

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

function matchesDesktop(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
}

let mql: MediaQueryList | null = null;
const onMediaChange = (e: MediaQueryListEvent) => {
  isDesktop.value = e.matches;
  // Leaving mobile closes any open drawer so it can't linger behind the desktop layout.
  if (e.matches) mobileOpen.value = false;
};

onMounted(() => {
  if (typeof window !== "undefined") {
    mql = window.matchMedia(DESKTOP_QUERY);
    mql.addEventListener("change", onMediaChange);
  }
});

onBeforeUnmount(() => {
  mql?.removeEventListener("change", onMediaChange);
});

const toggleSidebar = () => {
  if (isDesktop.value) {
    collapsed.value = !collapsed.value;
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed.value));
    } catch {
      // ignore persistence failures
    }
  } else {
    mobileOpen.value = !mobileOpen.value;
  }
};

const logout = () => {
  authStore.logout();
  router.push('/login');
}

const menuItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Accounts', path: '/accounts', icon: '🏦' },
    { label: 'Transactions', path: '/transactions', icon: '💸' },
    { label: 'Budgets', path: '/budgets', icon: '📋' },
    { label: 'Goals', path: '/goals', icon: '🎯' },
    { label: 'Categories', path: '/categories', icon: '🏷️'},
    { label: 'Tags', path: '/tags', icon: '🔖'},
    { label: 'Connections', path: '/connections', icon: '🤝'},
    // { label: 'Settings', path: '/settings', icon: '⚙️' },
];

const currentPage = computed(() => {
  const item = menuItems.find((item) => item.path === route.path);
  return item ? item.label : "EveryPenny";
});

const today = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});
</script>
