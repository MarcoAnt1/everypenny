import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { login as loginApi, register as registerApi } from "../api/auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<any | null>(
    JSON.parse(localStorage.getItem("user") ?? "null"),
  );

  const isAunthenticated = computed(() => !!token.value);

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

  const register = async (name: string, email: string, password: string) => {
    const res = await registerApi({ name, email, password });
    setAuth(res.data.token, res.data.user);
    return res.data;
  };

  return { token, user, isAunthenticated, login, register, logout };
});
