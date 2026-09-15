import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { NeoCheckingParser } from "./checking";

// Sanitized extract mirroring the real Neo Everyday (chequing) PDF text.
// Credits are positive, debits negative; the last number is the running balance.
const NEO_TEXT =
  "Neo Everyday 2404461826 Jun 1, 2026 - Jun 30, 2026  " +
  "Transactions  Transaction Date Posted Date   Description   Credits   Debits   Balance  " +
  "Jun 12   Jun 12   Auto-Payment to Credit   -9.44   8.81 " +
  "Jun 22   Jun 22   Transfer from Savings   45.00   54.26 " +
  "Jun 22   Jun 22   e-Transfer to Marco Wealth   -2,286.40   100.00 " +
  "Page 2 of 2";

describe("NeoCheckingParser", () => {
  const rows = new NeoCheckingParser().parseText(NEO_TEXT);

  it("parses every transaction row", () => {
    expect(rows).toHaveLength(3);
  });

  it("classifies a credit (money in) as income", () => {
    const credit = rows.find((r) => r.description.includes("Transfer from"));
    expect(credit?.type).toBe(TxType.income);
    expect(credit?.amount).toBe(45);
  });

  it("classifies a debit (money out) as an expense, stored positive", () => {
    const debit = rows.find((r) => r.description.includes("e-Transfer"));
    expect(debit?.type).toBe(TxType.expense);
    expect(debit?.amount).toBe(2286.4);
  });

  it("resolves the year from the statement period", () => {
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });
});
