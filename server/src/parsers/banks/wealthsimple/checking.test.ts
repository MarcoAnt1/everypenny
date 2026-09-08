import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { WealthsimpleCheckingParser } from "./checking";

// Sanitized CSV records mirroring the real Wealthsimple chequing export.
// Amount is pre-signed by Wealthsimple: positive = money in, negative = out.
const records: Record<string, any>[] = [
  { date: "2026-06-01", transaction: "INT", description: "Interest earned", amount: "67.28" },
  { date: "2026-06-02", transaction: "TRFOUT", description: "Transfer out to FHSA", amount: "-200.0" },
  { date: "2026-06-07", transaction: "E_TRFOUT", description: "Interac e-Transfer Out to Someone", amount: "-250.0" },
  { date: "2026-06-06", transaction: "MONEY_MOVEMENT_IN", description: "Deposit", amount: "500.0" },
  { date: "2026-06-15", transaction: "AFT_IN", description: "Direct deposit", amount: "1000.0" },
];

describe("WealthsimpleCheckingParser", () => {
  const rows = new WealthsimpleCheckingParser().parseRecords(records);

  it("parses every record", () => {
    expect(rows).toHaveLength(5);
  });

  it("marks internal TRFOUT moves as transfers", () => {
    const transfer = rows.find((r) => r.description.includes("FHSA"));
    expect(transfer?.type).toBe(TxType.transfer);
    expect(transfer?.amount).toBe(200); // stored positive; direction handled at import
  });

  it("classifies negative non-transfer amounts as expenses", () => {
    const etransfer = rows.find((r) => r.description.includes("e-Transfer Out"));
    expect(etransfer?.type).toBe(TxType.expense);
    expect(etransfer?.amount).toBe(250);
  });

  it("classifies positive amounts as income", () => {
    const income = rows.filter((r) => r.type === TxType.income);
    expect(income.map((r) => r.amount).sort((a, b) => a - b)).toEqual([
      67.28, 500, 1000,
    ]);
  });

  it("skips rows with no amount", () => {
    const withGap = new WealthsimpleCheckingParser().parseRecords([
      ...records,
      { date: "2026-06-20", transaction: "INT", description: "n/a", amount: "" },
    ]);
    expect(withGap).toHaveLength(5); // the empty-amount row is dropped
  });
});

// The richer Wealthsimple "activities" export uses different column names:
// effective_date / activity_sub_type / net_cash_amount (still pre-signed).
const activityRecords: Record<string, any>[] = [
  { effective_date: "2026-01-01", activity_type: "MoneyMovement", activity_sub_type: "AFT_OUT", description: "Pre-authorized Debit", net_cash_amount: "-2460" },
  { effective_date: "2026-01-02", activity_type: "MoneyMovement", activity_sub_type: "E_TRFIN", description: "Interac e-Transfer Received", net_cash_amount: "1000" },
  { effective_date: "2026-01-14", activity_type: "MoneyMovement", activity_sub_type: "TRFOUT", description: "Transfer out to FHSA", net_cash_amount: "-200" },
  { effective_date: "2026-01-31", activity_type: "Interest", activity_sub_type: "-", description: "Interest received", net_cash_amount: "53.1" },
];

describe("WealthsimpleCheckingParser — activities export", () => {
  const rows = new WealthsimpleCheckingParser().parseRecords(activityRecords);

  it("reads the effective_date / net_cash_amount / activity_sub_type columns", () => {
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });

  it("classifies debits as expenses and deposits as income", () => {
    const debit = rows.find((r) => r.description.includes("Pre-authorized"));
    expect(debit?.type).toBe(TxType.expense);
    expect(debit?.amount).toBe(2460);

    const deposit = rows.find((r) => r.description.includes("Received"));
    expect(deposit?.type).toBe(TxType.income);
    expect(deposit?.amount).toBe(1000);
  });

  it("still marks a TRFOUT sub-type as a transfer", () => {
    const transfer = rows.find((r) => r.description.includes("FHSA"));
    expect(transfer?.type).toBe(TxType.transfer);
    expect(transfer?.amount).toBe(200);
  });
});
