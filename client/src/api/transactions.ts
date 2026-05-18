import apiClient from './client';

export const getTransactions = () => apiClient.get('/api/transactions');
export const createTransaction = (data: object) => apiClient.post('/api/transactions', data);
export const updateTransaction = (id: string, data: object) => apiClient.put(`/api/transactions/${id}`, data);
export const deleteTransaction = (id: string) => apiClient.delete(`/api/transactions/${id}`);