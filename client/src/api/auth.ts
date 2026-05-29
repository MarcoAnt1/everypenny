import apiClient from "./client";

export const register = (data: {
  name: string;
  email: string;
  password: string;
}) => {
  return apiClient.post("/api/auth/register", data);
};

export const login = (data: { email: string; password: string }) => {
  return apiClient.post("/api/auth/login", data);
};

export const getMe = () => apiClient.get("/api/auth/me");
