import { TxType } from "@prisma/client";
import { parseDateString } from "../../../helper/formatHelper";
import { CsvParser } from "../../base/csvParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";

const TRANSFER_OUT_CODES = ["TRFOUT"];

export class WealthsimpleCheckingParser extends CsvParser {
  protected mapRow(
    row: Record<string, any>,
    rowIndex: number,
  ): ParsedTransaction | null {
    const rawDate = row.date;
    const rawAmount = row.amount;
    const code = String(row.transaction || "")
      .trim()
      .toUpperCase();
    const description = String(row.description || "").trim();

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
      description: description || code,
      amount: Math.abs(amount),
      type: this.resolveType(code, amount),
      valid: !!date,
    };
  }

  private resolveType(code: string, amount: number): TxType {
    if (TRANSFER_OUT_CODES.includes(code)) return TxType.transfer;
    return amount >= 0 ? TxType.income : TxType.expense;
  }
}
