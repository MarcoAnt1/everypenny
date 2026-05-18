import apiClient from './client';

export const getCategories = () => apiClient.get('/api/categories');