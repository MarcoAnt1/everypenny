import apiClient from './client';

export const getTags = () => apiClient.get('/api/tags');