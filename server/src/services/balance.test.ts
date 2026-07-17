import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { signAmount, mergeDeltas } from "./balance";

describe("signAmount", () => {
  it("negates an expense so it debits the account", () => {
    expect(signAmount(TxType.expense, 50).toString()).toBe("-50");
  });

  it("keeps income positive so it credits the account", () => {
    expect(signAmount(TxType.income, 50).toString()).toBe("50");
  });

  it("keeps a transfer positive (direction is decided by the caller)", () => {
    expect(signAmount(TxType.transfer, 50).toString()).toBe("50");
  });

  it("accepts number, string, and Decimal inputs", () => {
    expect(signAmount(TxType.expense, "12.34").toString()).toBe("-12.34");
    expect(signAmount(TxType.income, new Decimal("99.99")).toString()).toBe(
      "99.99",
    );
  });

  it("preserves cent precision (no float drift)", () => {
    // 0.1 + 0.2 would drift as a float; Decimal keeps it exact.
    const sum = signAmount(TxType.income, "0.1").plus(
      signAmount(TxType.income, "0.2"),
    );
    expect(sum.toString()).toBe("0.3");
  });

  it("handles zero", () => {
    expect(signAmount(TxType.expense, 0).toString()).toBe("0");
  });
});

describe("mergeDeltas", () => {
  const d = (accountId: string, delta: string) => ({
    accountId,
    delta: new Decimal(delta),
  });

  it("sums every delta for the same account", () => {
    // Regression: a `??` precedence bug once kept only the FIRST delta per
    // account, so importing 26 rows moved the balance by just the first one.
    const merged = mergeDeltas([
      d("a", "-12.99"),
      d("a", "-104.96"),
      d("a", "-18.89"),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].accountId).toBe("a");
    expect(merged[0].delta.toString()).toBe("-136.84");
  });

  it("keeps accounts separate", () => {
    const merged = mergeDeltas([
      d("a", "-100"),
      d("b", "100"),
      d("a", "-50"),
    ]);
    const byId = Object.fromEntries(
      merged.map((m) => [m.accountId, m.delta.toString()]),
    );
    expect(byId).toEqual({ a: "-150", b: "100" });
  });

  it("nets opposing deltas on one account", () => {
    const merged = mergeDeltas([d("a", "-100"), d("a", "100")]);
    expect(merged[0].delta.toString()).toBe("0");
  });

  it("returns an empty list for no deltas", () => {
    expect(mergeDeltas([])).toEqual([]);
  });
});
