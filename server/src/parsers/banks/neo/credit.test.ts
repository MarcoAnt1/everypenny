import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { NeoCreditParser } from "./credit";

// Sanitized extract mirroring the real Neo PDF text layout. The key edge case:
// a payment line (no "CAN", positive amount) sits directly before a purchase.
const NEO_TEXT =
  "TEST USER  0000 May 16, 2026 - Jun 15, 2026  Account Summary  " +
  "Transactions  Transaction Date   Posted Date   Description Amount ($CAD)  " +
  "Jun 13   Jun 13   THE PETROPOLITAN   CALGARY   CAN   -25.73 " +
  "Jun 9   Jun 9   Payment Received, Thank you   600.00 " +
  "Jun 7   Jun 8   BIG SMOKE BURGER   CAN   -33.68  " +
  "Neo Financial  neofinancial.com Page 2 of 5 " +
  "Important information about your Card Account";

// A statement that spans a year boundary (Dec 2025 -> Jan 2026).
const NEO_BOUNDARY =
  "TEST USER  0000 Dec 20, 2025 - Jan 19, 2026  " +
  "Transactions  Transaction Date   Posted Date   Description Amount ($CAD)  " +
  "Jan 05   Jan 06   SOME STORE   CALGARY   CAN   -10.00 " +
  "Dec 28   Dec 29   OTHER STORE   CALGARY   CAN   -20.00  " +
  "Neo Financial Important information about your Card Account";

describe("NeoCreditParser", () => {
  const rows = new NeoCreditParser().parseText(NEO_TEXT);

  it("captures the purchase that follows a payment line (no data loss)", () => {
    // Regression: the old regex let the payment swallow this purchase's amount.
    const burger = rows.find((r) => r.description.includes("BIG SMOKE"));
    expect(burger).toBeDefined();
    expect(burger?.amount).toBe(33.68);
    expect(burger?.type).toBe(TxType.expense);
  });

  it("skips credit-card payment lines", () => {
    expect(rows.some((r) => /payment received/i.test(r.description))).toBe(false);
    expect(rows).toHaveLength(2); // two purchases, payment excluded
  });

  it("treats negative amounts as purchases (expenses)", () => {
    expect(rows.every((r) => r.type === TxType.expense)).toBe(true);
  });

  it("strips the trailing CAN currency marker from descriptions", () => {
    expect(rows.some((r) => /\bCAN\b/.test(r.description))).toBe(false);
  });

  it("resolves the year from the statement period", () => {
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });

  it("assigns the correct year across a Dec -> Jan boundary", () => {
    const boundaryRows = new NeoCreditParser().parseText(NEO_BOUNDARY);
    const jan = boundaryRows.find((r) => r.description.includes("SOME STORE"));
    const dec = boundaryRows.find((r) => r.description.includes("OTHER STORE"));
    expect(jan?.date?.startsWith("2026")).toBe(true);
    expect(dec?.date?.startsWith("2025")).toBe(true);
  });
});
