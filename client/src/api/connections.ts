import apiClient from "./client";

export const getConnections = () => apiClient.get("/api/connections");
export const inviteConnection = (data: object) =>
  apiClient.post("/api/connections/invite", data);
export const acceptConnection = (id: string) =>
  apiClient.post(`/api/connections/${id}/accept`);
export const rejectConnection = (id: string) =>
  apiClient.post(`/api/connections/${id}/reject`);
export const deleteConnection = (id: string) =>
  apiClient.delete(`/api/connections/${id}`);
export const updateConnection = (id: string, data: object) =>
  apiClient.put(`/api/connections/${id}`, data);
