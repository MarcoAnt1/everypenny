import apiClient from "./client";

export const getGoals = () => apiClient.get("/api/goals");
export const createGoal = (data: object) => apiClient.post('/api/goals', data);
export const updateGoal = (id: string, data: object) => apiClient.put(`/api/goals/${id}`, data);
export const deleteGoal = (id: string) => apiClient.delete(`/api/goals/${id}`);
export const addFund = (id: string, amount: number) => apiClient.patch(`/api/goals/${id}/add-funds`, { amount });
