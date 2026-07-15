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
  ["20 Apr 2026", "20 Apr 2026", "PAYMENT RECEIVED - THANK YOU", -1689.42, ""], // skip
  ["", "", "", "", ""], // trailing empty row
];

describe("AmexCreditParser", () => {
  const rows = new AmexCreditParser().parseMatrix(matrix);

  it("finds the header row and parses only real transactions", () => {
    // fee + refund; the payment line and the empty row are dropped.
    expect(rows).toHaveLength(2);
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

  it("skips credit-card payment lines", () => {
    expect(rows.some((r) => /payment received/i.test(r.description))).toBe(false);
  });

  it("throws when no header row is present", () => {
    expect(() => new AmexCreditParser().parseMatrix([["foo", "bar"]])).toThrow();
  });
});
