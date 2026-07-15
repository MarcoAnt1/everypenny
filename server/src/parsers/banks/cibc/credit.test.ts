import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { CibcCreditParser } from "./credit";

// Sanitized extract mirroring the real CIBC PDF text. Unlike Neo, CIBC shows
// purchases as POSITIVE and credits/refunds as NEGATIVE.
const CIBC_TEXT =
  "Statement Date June 15, 2026  June statement period  May 16 to June 15, 2026  " +
  "Your payments  Trans date Post date   Description   Amount($)  " +
  "May 31   Jun 01   PAYMENT THANK YOU/PAIEMENT MERCI   86.00  " +
  "Total payments   $176.00  " +
  "Your new charges and credits  " +
  "Trans date Post date   Description   Spend Categories   Amount($)  " +
  "Card number 5268 XXXX XXXX 8016  " +
  "May 21   May 22   CYNTHIA'S NO FRILLS 69   CALGARY   AB   Retail and Grocery   34.99 " +
  "Jun 12   Jun 15   BONUS OFFER OFFRE BONIS   Professional and Financial Services   -65.00  " +
  "Total for 5268 XXXX XXXX 8016   $570.51";

describe("CibcCreditParser", () => {
  const rows = new CibcCreditParser().parseText(CIBC_TEXT);

  it("parses only the charges section, ignoring the payments section", () => {
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => /payment thank you/i.test(r.description))).toBe(false);
  });

  it("classifies a positive amount as an expense (purchase)", () => {
    const purchase = rows.find((r) => r.description.includes("NO FRILLS"));
    expect(purchase?.type).toBe(TxType.expense);
    expect(purchase?.amount).toBe(34.99);
  });

  it("classifies a negative amount as income (a credit)", () => {
    const credit = rows.find((r) => r.description.includes("BONUS OFFER"));
    expect(credit?.type).toBe(TxType.income);
    expect(credit?.amount).toBe(65.0); // stored positive
  });

  it("strips the trailing spend category from descriptions", () => {
    const purchase = rows.find((r) => r.description.includes("NO FRILLS"));
    expect(purchase?.description).not.toMatch(/Retail and Grocery/);
    expect(purchase?.description.endsWith("AB")).toBe(true);
  });

  it("resolves the year from the statement period", () => {
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });
});
