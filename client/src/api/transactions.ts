import apiClient from "./client";
import qs from "qs";

export const getTransactions = (params?: object) =>
  apiClient.get("/api/transactions", {
    params,
    paramsSerializer: (params) =>
      qs.stringify(params, { arrayFormat: "repeat" }),
  });
export const createTransaction = (data: object) =>
  apiClient.post("/api/transactions", data);
export const updateTransaction = (id: string, data: object) =>
  apiClient.put(`/api/transactions/${id}`, data);
export const deleteTransaction = (id: string) =>
  apiClient.delete(`/api/transactions/${id}`);
