import apiClient from "./client";

export const preview = (file: File, bankType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('bankType', bankType);
    return apiClient.post('/api/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
}

export const confirmImport = (accountId: string, transactions: any[]) => {
    return apiClient.post('/api/import/confirm', { accountId, transactions });
}