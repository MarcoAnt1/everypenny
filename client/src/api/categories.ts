import apiClient from './client';

export const getCategories = () => apiClient.get('/api/categories');
export const createCategory = (data: object) => apiClient.post('/api/categories', data);
export const updateCategory = (id: string, data: object) => apiClient.put(`/api/categories/${id}`, data);
export const deleteCategory = (id: string) => apiClient.delete(`/api/categories/${id}`);