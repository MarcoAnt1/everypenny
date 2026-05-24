import apiClient from './client';

export const getAccounts = () => apiClient.get('/api/accounts');
export const createAccount = (data: object) => apiClient.post('/api/accounts', data);
export const updateAccount = (id: string, data: object) => apiClient.put(`/api/accounts/${id}`, data);
export const deleteAccount = (id: string) => apiClient.delete(`/api/accounts/${id}`);