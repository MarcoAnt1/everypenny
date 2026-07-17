export const formatCurrency = (amount: number | string | null | undefined) => {
  const n = typeof amount === "number" ? amount : Number(amount);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number.isFinite(n) ? n : 0);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";

  const d = new Date(dateString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};
