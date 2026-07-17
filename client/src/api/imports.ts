import apiClient from "./client";

export interface SupportedStatement {
  bank: string;
  statementType: string;
}

// Which (bank, statementType) pairs actually have a parser registered.
export const getSupported = () =>
  apiClient.get<SupportedStatement[]>("/api/import/supported");

export const preview = (file: File, bank: string, statementType: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("bank", bank);
  form.append("statementType", statementType);
  return apiClient.post("/api/import/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const confirmImport = (
  accountId: string,
  statementType: string,
  transactions: any[],
) =>
  apiClient.post("/api/import/confirm", {
    accountId,
    statementType,
    transactions,
  });
