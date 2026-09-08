import { TxType } from "@prisma/client";
import { parseDateString } from "../../../utils/date";
import { CsvParser } from "../../base/csvParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";

// Wealthsimple credit-card CSV export. Header:
//   transaction_date, post_date, type, details, amount, currency
// Unlike the chequing export, the amount here is a magnitude and the `type`
// column carries the direction (Purchase, Refund, Payment, ...).
const REFUND_TYPE_RE = /refund|return|reversal|credit|cashback|reward|rebate/;

export class WealthsimpleCreditParser extends CsvParser {
  protected mapRow(
    row: Record<string, any>,
    rowIndex: number,
  ): ParsedTransaction | null {
    const rawDate = row.transaction_date || row.post_date;
    const rawAmount = row.amount;
    const type = String(row.type || "").trim();
    const description = String(row.details || "").trim();

    if (!rawDate || rawAmount === undefined || rawAmount === "") {
      return null;
    }

    const amount = parseFloat(String(rawAmount).replace(/[^\d.-]/g, ""));
    if (isNaN(amount) || amount === 0) {
      return null;
    }

    const resolved = this.resolveType(type, amount);
    if (resolved === null) {
      return null; // e.g. a card payment — see resolveType
    }

    const date = parseDateString(rawDate);
    return {
      rowIndex,
      date,
      description: description || type,
      amount: Math.abs(amount),
      type: resolved,
      valid: !!date,
    };
  }

  // Returns the transaction type, or null for rows we deliberately skip.
  private resolveType(type: string, amount: number): TxType | null {
    const t = type.toLowerCase();

    // A card payment is a transfer from a bank account, not card activity —
    // skip it, matching the CIBC and Neo credit parsers.
    if (t.includes("payment")) {
      return null;
    }

    // Refunds/credits/rewards put money back on the card.
    if (REFUND_TYPE_RE.test(t)) {
      return TxType.income;
    }

    // Otherwise fall back to the amount sign (purchases and fees are positive).
    return amount < 0 ? TxType.income : TxType.expense;
  }
}
