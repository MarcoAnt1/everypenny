import apiClient from "./client";

export const getTransactions = () => apiClient.get("/api/transactions");