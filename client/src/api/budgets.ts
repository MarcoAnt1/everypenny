import apiClient from "./client";

export const getBudgets = (params?: object) => apiClient.get("/api/budgets", { params });
export const createBudget = (data: object) => apiClient.post("/api/budgets", data);
export const updateBudget = (id: string, data: object) => apiClient.put(`/api/budgets/${id}`, data);
export const deleteBudget = (id: string) => apiClient.delete(`/api/budgets/${id}`);
export const getBudgetTransactions = (id: string, params?: object) =>
  apiClient.get(`/api/budgets/${id}/transactions`, { params });