import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { WealthsimpleCreditParser } from "./credit";

// Sanitized records mirroring the real Wealthsimple credit-card CSV export.
// Columns: transaction_date, post_date, type, details, amount, currency.
const records: Record<string, any>[] = [
  { transaction_date: "2026-08-11", post_date: "2026-08-12", type: "Purchase", details: "CALGARY TRANSIT", amount: "4.0", currency: "CAD" },
  { transaction_date: "2026-08-14", post_date: "2026-08-15", type: "Refund", details: "AMAZON REFUND", amount: "-25.50", currency: "CAD" },
  { transaction_date: "2026-08-20", post_date: "2026-08-21", type: "Payment", details: "PAYMENT RECEIVED - THANK YOU", amount: "-500.0", currency: "CAD" },
  { transaction_date: "2026-08-22", post_date: "2026-08-23", type: "Purchase", details: "SOBEYS", amount: "40.25", currency: "CAD" },
];

describe("WealthsimpleCreditParser", () => {
  const rows = new WealthsimpleCreditParser().parseRecords(records);

  it("parses purchases and refunds but skips card payments", () => {
    expect(rows).toHaveLength(3);
    expect(rows.some((r) => /payment received/i.test(r.description))).toBe(false);
  });

  it("classifies a purchase as an expense", () => {
    const transit = rows.find((r) => r.description === "CALGARY TRANSIT");
    expect(transit?.type).toBe(TxType.expense);
    expect(transit?.amount).toBe(4.0);
  });

  it("classifies a refund as income, stored positive", () => {
    const refund = rows.find((r) => r.description === "AMAZON REFUND");
    expect(refund?.type).toBe(TxType.income);
    expect(refund?.amount).toBe(25.5);
  });

  it("resolves the year from the ISO transaction date", () => {
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });

  it("skips rows with no amount", () => {
    const withGap = new WealthsimpleCreditParser().parseRecords([
      ...records,
      { transaction_date: "2026-08-25", post_date: "2026-08-26", type: "Purchase", details: "n/a", amount: "", currency: "CAD" },
    ]);
    expect(withGap).toHaveLength(3); // the empty-amount row is dropped
  });
});
