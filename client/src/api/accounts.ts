import apiClient from "./client";

export const getAccounts = () => apiClient.get("/api/accounts");