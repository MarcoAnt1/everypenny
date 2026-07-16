import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { login as loginApi, register as registerApi, getMe } from "../api/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<any | null>(
    JSON.parse(localStorage.getItem("user") ?? "null"),
  );

  const isAuthenticated = computed(() => !!token.value);

  const setAuth = (newToken: string, newUser: any) => {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const login = async (email: string, password: string) => {
    const res = await loginApi({ email, password });
    setAuth(res.data.token, res.data.user);
    return res.data;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    inviteToken: string,
  ) => {
    const res = await registerApi({ name, email, password, inviteToken });
    setAuth(res.data.token, res.data.user);
    return res.data;
  };

  const fetchCurrentUser = async () => {
    if (!token.value) return;
    try {
      const res = await getMe();
      user.value = res.data;
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch {
      logout();
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
  };
});
