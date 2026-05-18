import apiClient from "./client";

export const getGoals = () => apiClient.get("/api/goals");