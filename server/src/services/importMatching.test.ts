import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { ExistingTx, ImportRow, matchImportRows } from "./importMatching";

const CARD = "card";
const CHEQUING = "chequing";

const tx = (over: Partial<ExistingTx>): ExistingTx => ({
  id: "x",
  accountId: CARD,
  accountName: "RBC Mastercard",
  date: new Date("2026-10-14T06:00:00Z"),
  amount: 0,
  description: "",
  type: TxType.expense,
  transferGroupId: null,
  ...over,
});
const row = (date: string, amount: number, direction: "in" | "out"): ImportRow => ({
  date: new Date(`${date}T06:00:00Z`).toISOString(),
  amount,
  direction,
});

describe("matchImportRows — duplicates in the same account", () => {
  it("flags a re-imported row (same day, same amount and direction)", () => {
    const existing = [tx({ id: "a", amount: -24.99, description: "LINKEDIN" })];
    const [m] = matchImportRows([row("2026-10-14", 24.99, "out")], CARD, existing);
    expect(m).toMatchObject({ kind: "duplicate", transactionId: "a" });
  });

  it("does not flag the same amount in the opposite direction", () => {
    const existing = [tx({ id: "a", amount: -24.99 })];
    const [m] = matchImportRows([row("2026-10-14", 24.99, "in")], CARD, existing);
    expect(m).toBeNull();
  });

  it("does not flag a plain row more than a day away", () => {
    const existing = [tx({ id: "a", amount: -24.99 })];
    const [m] = matchImportRows([row("2026-10-17", 24.99, "out")], CARD, existing);
    expect(m).toBeNull();
  });

  it("flags the card payment when chequing already recorded it as a transfer leg", () => {
    // Chequing imported first, payment marked "transfer -> card": the card
    // already holds a +66.96 transfer leg, posted a couple of days apart.
    const existing = [
      tx({ id: "leg", amount: 66.96, type: TxType.transfer, transferGroupId: "g1", date: new Date("2026-10-12T06:00:00Z") }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 66.96, "in")], CARD, existing);
    expect(m).toMatchObject({ kind: "duplicate", transactionId: "leg" });
  });

  it("uses each existing transaction at most once", () => {
    const existing = [tx({ id: "a", amount: -4 })];
    const matches = matchImportRows(
      [row("2026-10-14", 4, "out"), row("2026-10-14", 4, "out")],
      CARD,
      existing,
    );
    expect(matches[0]).toMatchObject({ kind: "duplicate" });
    expect(matches[1]).toBeNull();
  });
});

describe("matchImportRows — own-account transfers", () => {
  it("suggests a transfer when the other side is a plain row in another account", () => {
    // Card imported first: payment saved as income (+66.96) on the card. Now the
    // chequing statement shows the matching -66.96.
    const existing = [
      tx({ id: "pay", accountId: CARD, amount: 66.96, type: TxType.income, description: "PAYMENT - THANK YOU" }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 66.96, "out")], CHEQUING, existing);
    expect(m).toMatchObject({
      kind: "transfer",
      transactionId: "pay",
      accountId: CARD,
      accountName: "RBC Mastercard",
    });
  });

  it("does not link to a row that is already part of a transfer", () => {
    const existing = [
      tx({ id: "leg", accountId: CARD, amount: 66.96, type: TxType.transfer, transferGroupId: "g1" }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 66.96, "out")], CHEQUING, existing);
    expect(m).toBeNull();
  });

  it("ignores counterparts outside the transfer window", () => {
    const existing = [
      tx({ id: "pay", accountId: CARD, amount: 66.96, type: TxType.income, date: new Date("2026-10-20T06:00:00Z") }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 66.96, "out")], CHEQUING, existing);
    expect(m).toBeNull();
  });

  it("prefers a duplicate over a transfer suggestion", () => {
    const existing = [
      tx({ id: "dup", accountId: CHEQUING, amount: -66.96 }),
      tx({ id: "pay", accountId: CARD, amount: 66.96, type: TxType.income }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 66.96, "out")], CHEQUING, existing);
    expect(m).toMatchObject({ kind: "duplicate", transactionId: "dup" });
  });

  it("picks the closest-dated counterpart", () => {
    const existing = [
      tx({ id: "far", accountId: CARD, amount: 50, type: TxType.income, date: new Date("2026-10-17T06:00:00Z") }),
      tx({ id: "near", accountId: CARD, amount: 50, type: TxType.income, date: new Date("2026-10-15T06:00:00Z") }),
    ];
    const [m] = matchImportRows([row("2026-10-14", 50, "out")], CHEQUING, existing);
    expect(m).toMatchObject({ transactionId: "near" });
  });
});
