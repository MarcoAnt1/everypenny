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

    const date = parseDateString(rawDate);
    return {
      rowIndex,
      date,
      description: description || type,
      amount: Math.abs(amount),
      type: this.resolveType(type, amount),
      valid: !!date,
    };
  }

  private resolveType(type: string, amount: number): TxType {
    const t = type.toLowerCase();

    if (REFUND_TYPE_RE.test(t)) {
      return TxType.income;
    }

    return amount < 0 ? TxType.income : TxType.expense;
  }
}
