export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return "";

  const d = new Date(dateString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};
