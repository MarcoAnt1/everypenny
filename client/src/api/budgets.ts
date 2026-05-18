import apiClient from "./client";

export const getBudgets = () => apiClient.get("/api/budgets");