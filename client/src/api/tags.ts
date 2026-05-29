import apiClient from './client';

export const getTags = () => apiClient.get('/api/tags');
export const createTag = (data: object) => apiClient.post('/api/tags', data);
export const updateTag = (id: string, data: object) => apiClient.put(`/api/tags/${id}`, data);
export const deleteTag = (id: string) => apiClient.delete(`/api/tags/${id}`);