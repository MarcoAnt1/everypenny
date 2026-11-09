import { TxType } from "@prisma/client";
import { PdfParser } from "../../base/pdfParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";
import {
  StatementPeriod,
  resolvePeriod,
  resolveYear,
} from "../../base/statementPeriod";

const MON = "(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)";

// TX DATE  POSTING DATE  DESCRIPTION  [reference no.]  $AMOUNT
// Credits (payments, refunds) are printed negative: "-$66.96". Interest rows
// have no reference number.
const RECORD_RE = new RegExp(
  `(${MON} \\d{1,2})\\s{2,}(${MON} \\d{1,2})\\s{2,}(.+?)\\s{2,}(?:\\d{15,}\\s{2,})?(-?\\$[\\d,]+\\.\\d{2})`,
  "g",
);

// "STATEMENT FROM SEP 16 TO OCT 15, 2026" (start carries a year only when the
// statement spans a year boundary).
const PERIOD_RE = new RegExp(
  `STATEMENT FROM (${MON} \\d{1,2}(?:, \\d{4})?) TO (${MON} \\d{1,2}, \\d{4})`,
);

const HEADER_RE = /ACTIVITY DESCRIPTION\s+AMOUNT \(\$\)/;
// Upper-case only: the summary and the legal text use "Total Account Balance".
const END_MARKER = "TOTAL ACCOUNT BALANCE";

export class RbcCreditParser extends PdfParser {
  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const text = await this.extractText(filePath);
    return this.parseText(text);
  }

  public parseText(text: string): ParsedTransaction[] {
    const period = resolvePeriod(text, PERIOD_RE);

    const start = text.search(HEADER_RE);
    if (start === -1) {
      throw new Error("Could not find the transactions section in the RBC PDF");
    }
    const end = text.lastIndexOf(END_MARKER);
    const section = text.slice(start, end > start ? end : undefined);

    const rows: ParsedTransaction[] = [];
    let rowIndex = 0;
    for (const match of section.matchAll(RECORD_RE)) {
      const parsed = this.mapMatch(match, rowIndex++, period);
      if (parsed) rows.push(parsed);
    }
    return rows;
  }

  private mapMatch(
    match: RegExpMatchArray,
    rowIndex: number,
    period: StatementPeriod | null,
  ): ParsedTransaction | null {
    const amount = parseFloat(match[4].replace(/[$,]/g, ""));
    if (isNaN(amount) || amount === 0) return null;

    const description = match[3]
      .replace(/\b\d{15,}\b/g, "") // stray reference numbers
      .replace(/\s{2,}/g, " ")
      .trim();
    const date = resolveYear(match[1], period);

    return {
      rowIndex,
      date,
      description,
      // Charges are positive (expense); payments/credits negative (income —
      // money into the card, reclassifiable in the import preview).
      amount: Math.abs(amount),
      type: amount > 0 ? TxType.expense : TxType.income,
      valid: !!date,
    };
  }
}
