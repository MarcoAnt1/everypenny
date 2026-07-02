<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h3 class="text-3xl font-bold text-indigo-600">💰 EveryPenny</h3>
        <p class="text-gray-400 mt-1 text-sm">Take control of your finances</p>
      </div>

      <!-- Tabs -->
      <div class="flex border rounded-lg overflow-hidden mb-6">
        <button
          @click="mode = 'login'"
          :class="
            mode === 'login'
              ? 'flex-1 py-2 bg-indigo-600 text-white text-sm font-medium'
              : 'flex-1 py-2 text-gray-500 text-sm hover:bg-gray-50'
          "
        >
          Login
        </button>
        <button
          @click="mode = 'register'"
          :class="
            mode === 'register'
              ? 'flex-1 py-2 bg-indigo-600 text-white text-sm font-medium'
              : 'flex-1 py-2 text-gray-500 text-sm hover:bg-gray-50'
          "
        >
          Register
        </button>
      </div>

      <!-- Error -->
      <div
        v-if="error"
        class="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4"
      >
        {{ error }}
      </div>

      <!-- Form -->
      <div class="space-y-4">
        <!-- Name (register only) -->
        <div v-if="mode === 'register'">
          <label class="text-sm font-medium text-gray-600">Full Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="John Doe"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="text-sm font-medium text-gray-600">Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="john@example.com"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="text-sm font-medium text-gray-600">Password</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="********"
            class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            @keyup.enter="submit"
          />
          <p v-if="mode === 'register'" class="text-xs text-gray-400 mt-1">
            Minimum 8 characters
          </p>
        </div>
      </div>

      <!-- Submit -->
      <button
        @click="submit"
        :disabled="loading"
        class="w-full mt-6 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
      >
        {{
          loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"
        }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const mode = ref<"login" | "register">("login");
const loading = ref(false);
const error = ref("");

const form = ref({ name: "", email: "", password: "" });

const submit = async () => {
  error.value = "";
  loading.value = true;

  if (mode.value === 'register' && !form.value.name.trim()) {
    error.value = 'Full name is required';
    loading.value = false;
    return;
  }

  if (!form.value.password || form.value.password.length < 8) {
    error.value = mode.value === 'register'
      ? 'Password must be at least 8 characters'
      : 'Passwword is required';
    loading.value = false;
    return;
  }

  try {
    if (mode.value === "login") {
      await authStore.login(form.value.email, form.value.password);
    } else {
      await authStore.register(
        form.value.name,
        form.value.email,
        form.value.password,
      );
    }
    router.push("/");
  } catch (err: any) {
    error.value = err.response?.data?.error ?? "Something went wrong";
  } finally {
    loading.value = false;
  }
};
</script>
