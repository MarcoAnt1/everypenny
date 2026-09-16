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
      <!-- Brand + collapse toggle (aligned to the header height) -->
      <div
        class="h-16 border-b flex items-center shrink-0"
        :class="railCollapsed ? 'lg:justify-center px-2' : 'px-4 justify-between'"
      >
        <button
          type="button"
          class="flex items-center gap-2 min-w-0 rounded-lg transition-colors hover:opacity-80"
          :title="railCollapsed ? 'Expand menu' : 'Every Penny'"
          @click="onBrandClick"
        >
          <span class="text-2xl shrink-0">💰</span>
          <span
            v-if="!railCollapsed"
            class="text-xl font-bold text-indigo-600 whitespace-nowrap"
          >
            Every Penny
          </span>
        </button>
        <button
          v-if="!railCollapsed"
          type="button"
          class="hidden lg:inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors shrink-0"
          title="Collapse menu"
          aria-label="Collapse menu"
          @click="toggleCollapse"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

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
      <!-- Header (slim top bar, aligned to the sidebar brand row) -->
      <header
        class="bg-white border-b h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 shrink-0"
      >
        <div class="flex items-center gap-2 min-w-0">
          <button
            @click="mobileOpen = !mobileOpen"
            class="lg:hidden text-gray-500 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-lg transition-colors shrink-0"
            aria-label="Open menu"
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
          <span class="lg:hidden text-lg font-bold text-indigo-600">Every Penny</span>
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
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

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

// Desktop only: collapse/expand the icon rail (persisted).
const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed.value));
  } catch {
    // ignore persistence failures
  }
};

// Clicking the brand collapses the rail on desktop; on mobile it just closes
// the drawer (the rail concept doesn't apply there).
const onBrandClick = () => {
  if (isDesktop.value) {
    toggleCollapse();
  } else {
    mobileOpen.value = false;
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

const today = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});
</script>
