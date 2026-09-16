import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { AmexCreditParser } from "./credit";

// A sanitized sheet matrix mirroring the real Amex xlsx layout: metadata rows,
// then a header row, then transactions. Positive = purchase, negative = refund.
const matrix: any[][] = [
  ["Transaction Details", "American Express Card / 18 Apr 2026 to 17 May 2026", "", "", ""],
  ["Prepared for", "", "", "", ""],
  ["TEST USER", "", "", "", ""],
  ["", "", "", "", ""],
  ["Date", "Date Processed", "Description", "Amount", ""],
  ["17 May 2026", "17 May 2026", "MEMBERSHIP FEE INSTALLMENT", 12.99, ""],
  ["03 May 2026", "04 May 2026", "SQUARE ONE INSURANCE", -30.71, ""], // refund
  ["20 Apr 2026", "20 Apr 2026", "PAYMENT RECEIVED - THANK YOU", -1689.42, ""], // payment (money in)
  ["", "", "", "", ""], // trailing empty row
];

describe("AmexCreditParser", () => {
  const rows = new AmexCreditParser().parseMatrix(matrix);

  it("finds the header row and parses the transactions", () => {
    // fee + refund + payment; only the empty row is dropped.
    expect(rows).toHaveLength(3);
  });

  it("classifies a positive amount as an expense", () => {
    const fee = rows.find((r) => r.description.includes("MEMBERSHIP"));
    expect(fee?.type).toBe(TxType.expense);
    expect(fee?.amount).toBe(12.99);
    expect(fee?.valid).toBe(true);
  });

  it("classifies a negative amount as income (a refund)", () => {
    const refund = rows.find((r) => r.description.includes("SQUARE ONE"));
    expect(refund?.type).toBe(TxType.income);
    expect(refund?.amount).toBe(30.71); // stored positive
  });

  it("includes credit-card payment lines as income", () => {
    const payment = rows.find((r) => /payment received/i.test(r.description));
    expect(payment?.type).toBe(TxType.income); // negative amount = money in
    expect(payment?.amount).toBe(1689.42);
  });

  it("throws when no header row is present", () => {
    expect(() => new AmexCreditParser().parseMatrix([["foo", "bar"]])).toThrow();
  });
});
