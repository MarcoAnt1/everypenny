import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { PdfItem } from "../../base/pdfParser";
import { RbcCheckingParser } from "./checking";

// Positioned items mirroring the real RBC Day to Day Banking PDF layout. Amounts
// are right-aligned to their column header: Withdrawals ends at ~373,
// Deposits at ~465, Balance at ~593. Values are sanitized.
const item = (str: string, x: number, y: number, right = x + str.length * 4): PdfItem => ({
  str,
  x,
  right,
  y,
  page: 1,
});
const W = 373.6; // withdrawals right edge
const D = 465.5; // deposits right edge
const B = 593.7; // balance right edge
const amt = (str: string, right: number, y: number) =>
  item(str, right - str.length * 4.5, y, right);

const RBC_CHEQUING_ITEMS: PdfItem[] = [
  item("From September 23, 2026 to October 23, 2026", 44.9, 700),
  item("Your opening balance on September 23, 2026", 44.9, 600),
  item("Details of your account activity", 44.9, 360),
  // header
  item("Date", 44.9, 340.1, 60.7),
  item("Description", 90, 340.1, 129.4),
  item("Withdrawals ($)", 318.7, 340.1, 373.0),
  item("Deposits ($)", 423.6, 340.1, 464.9),
  item("Balance ($)", 554.4, 340.1, 593.1),
  // rows
  item("Opening Balance", 90, 326.2),
  amt("92.00", B, 326.2),
  item("14 Oct", 44.9, 312),
  item("Online Banking transfer - 1441", 90, 312),
  amt("66.96", W, 312),
  item("Payroll deposit ACME", 90, 298), // same day: no date, no balance
  amt("1,500.00", D, 298),
  amt("1,525.04", B, 298),
  item("e-Transfer sent", 90, 284), // description wraps onto the next line
  item("JANE DOE 4Y6KXD", 90, 270),
  amt("100.00", W, 270),
  item("23 Oct", 44.9, 256),
  item("Monthly fee", 90, 256),
  amt("4.00", W, 256),
  amt("1,421.04", B, 256),
  item("Closing Balance", 90, 242),
  amt("$1,421.04", B, 242),
  item("Important information about your account", 44.9, 200),
];

describe("RbcCheckingParser", () => {
  const rows = new RbcCheckingParser().parseItems(RBC_CHEQUING_ITEMS);

  it("parses every transaction and skips opening/closing balance lines", () => {
    expect(rows).toHaveLength(4);
  });

  it("tells withdrawals from deposits by column position", () => {
    const deposit = rows.find((r) => r.description.startsWith("Payroll"));
    expect(deposit?.type).toBe(TxType.income);
    expect(deposit?.amount).toBe(1500);

    const fee = rows.find((r) => r.description === "Monthly fee");
    expect(fee?.type).toBe(TxType.expense);
    expect(fee?.amount).toBe(4);
  });

  it("carries the date forward to same-day rows", () => {
    const sameDay = rows.slice(0, 3).map((r) => new Date(r.date!).getDate());
    expect(sameDay).toEqual([14, 14, 14]);
    expect(new Date(rows[3].date!).getDate()).toBe(23);
  });

  it("joins a description that wraps onto two lines", () => {
    expect(rows[2].description).toBe("e-Transfer sent JANE DOE 4Y6KXD");
    expect(rows[2].amount).toBe(100);
  });

  it("reproduces the statement's running balance", () => {
    const closing = rows.reduce(
      (bal, r) => bal + (r.type === TxType.income ? r.amount : -r.amount),
      92,
    );
    expect(closing).toBeCloseTo(1421.04, 2);
  });

  it("resolves the year from the statement period", () => {
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });
});
