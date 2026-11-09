import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { RbcCreditParser } from "./credit";

// Sanitized extract mirroring the real RBC Cash Back Mastercard PDF text.
// Spans a year boundary (Dec -> Jan); charges positive, credits "-$".
const RBC_CREDIT_TEXT =
  "RBC ®   Cash Back Mastercard ‡  JANE DOE   5415 90** **** 0000  " +
  "STATEMENT FROM DEC 16, 2025 TO JAN 15, 2026  " +
  "CALCULATING YOUR BALANCE  Previous Account Balance   $15.74  " +
  "Total Account Balance   $0.43  NEW BALANCE   $0.43  " +
  "TRANSACTION  DATE   POSTING  DATE   ACTIVITY DESCRIPTION   AMOUNT ($)  " +
  "DEC 20   DEC 21   SOME STORE TORONTO ON  12302026259001876532228  $24.99  " +
  "JAN 02   JAN 03   ANOTHER SHOP CALGARY AB  55490536271206843233841  $1,215.74  " +
  "JAN 10   JAN 10   PAYMENT - THANK YOU / PAIEMENT - MERCI  75105396287619983921403  -$66.96  " +
  "JAN 15   JAN 15   PURCHASE INTEREST 20.99%   $0.43  " +
  "TOTAL ACCOUNT BALANCE   $0.43  1 OF 1\n" +
  "Total Account Balance.   The total amount of your previous account balance...";

describe("RbcCreditParser", () => {
  const rows = new RbcCreditParser().parseText(RBC_CREDIT_TEXT);

  it("parses every transaction row, including interest without a reference", () => {
    expect(rows).toHaveLength(4);
    const interest = rows.find((r) => r.description.includes("INTEREST"));
    expect(interest?.type).toBe(TxType.expense);
    expect(interest?.amount).toBe(0.43);
  });

  it("classifies charges as expenses and payments as income", () => {
    const charge = rows.find((r) => r.description.startsWith("SOME STORE"));
    expect(charge?.type).toBe(TxType.expense);
    expect(charge?.amount).toBe(24.99);

    const payment = rows.find((r) => r.description.startsWith("PAYMENT"));
    expect(payment?.type).toBe(TxType.income);
    expect(payment?.amount).toBe(66.96);
  });

  it("parses amounts with thousands separators", () => {
    const big = rows.find((r) => r.description.startsWith("ANOTHER SHOP"));
    expect(big?.amount).toBe(1215.74);
  });

  it("drops the reference number from descriptions", () => {
    expect(rows.every((r) => !/\d{15,}/.test(r.description))).toBe(true);
    expect(rows[0].description).toBe("SOME STORE TORONTO ON");
  });

  it("rolls December rows back a year on a Dec -> Jan statement", () => {
    expect(new Date(rows[0].date!).getFullYear()).toBe(2025);
    expect(new Date(rows[1].date!).getFullYear()).toBe(2026);
  });
});
