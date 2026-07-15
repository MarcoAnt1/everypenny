import { describe, it, expect } from "vitest";
import { TxType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { signAmount } from "./balance";

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
