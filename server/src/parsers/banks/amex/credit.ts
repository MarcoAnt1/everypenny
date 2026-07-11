import { TxType } from "@prisma/client";
import { parseDateString } from "../../../helper/formatHelper";
import { XlsxColumnIndexes, XlsxParser } from "../../base/xlsxParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";

const SKIP_DESCRIPTIONS = ["payment received", "online payment"];

export class AmexCreditParser extends XlsxParser {
  protected dateHeaders = ["date", "transaction date", "data"];
  protected descHeaders = [
    "description",
    "appearence description",
    "details",
    "descricao",
  ];
  protected amountHeaders = ["amount", "charge", "valor", "value"];

  protected mapRow(
    row: any[],
    indexes: XlsxColumnIndexes,
    rowIndex: number,
  ): ParsedTransaction | null {
    const rawDate = row[indexes.date];
    const rawDesc = row[indexes.desc];
    const rawAmount = row[indexes.amount];

    if (!rawDate || !rawDesc || rawAmount) {
      return null;
    }

    const description = String(rawDesc).trim();
    const lowerDesc = description.toLowerCase();
    if (SKIP_DESCRIPTIONS.some((skip) => lowerDesc.includes(skip))) {
      return null;
    }

    const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ""));
    if (isNaN(amount) || amount === 0) {
      return null;
    }

    const parseDate = parseDateString(String(rawDate));

    return {
      rowIndex,
      date: parseDate,
      description,
      amount: Math.abs(amount),
      type: amount > 0 ? TxType.expense : TxType.income,
      valid: !!parseDate,
    };
  }
}
