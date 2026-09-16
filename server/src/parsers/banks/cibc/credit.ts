import { TxType } from "@prisma/client";
import { PdfParser } from "../../base/pdfParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";
import {
  StatementPeriod,
  resolvePeriod,
  resolveYear,
} from "../../base/statementPeriod";

const PAYMENTS_SECTION = "Your payments";
const SECTION_START = "Your new charges and credits";
const SECTION_END = "Total for";

const RECORD_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}(.+?)\s{2,}(-?[\d,]+\.\d{2})(?=\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s{2,}|\s+Total\s|\s*$)/g;

const PERIOD_RE = /([A-Za-z]+ \d{1,2}) to ([A-Za-z]+ \d{1,2},? \d{4})/;

const SPEND_CATEGORIES = [
  "Retail and Grocery",
  "Transportation",
  "Health and Education",
  "Hotel, Entertainment and Recreation",
  "Professional and Financial Services",
  "Home and Office Improvement",
  "Personal and Household Expenses",
  "Restaurants",
  "Travel",
];

export class CibcCreditParser extends PdfParser {
  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const text = await this.extractText(filePath);
    return this.parseText(text);
  }

  // Parse the extracted PDF text into transactions. Exposed (separate from the
  // pdfjs extraction) so tests can run against sanitized text fixtures.
  public parseText(text: string): ParsedTransaction[] {
    const period = resolvePeriod(text, PERIOD_RE);

    const chargesStart = text.indexOf(SECTION_START);
    if (chargesStart === -1) {
      throw new Error("Could not find the charges section in the CIBC PDF");
    }

    const rows: ParsedTransaction[] = [];
    let rowIndex = 0;

    // "Your payments" sits above the charges — parse it and mark those rows as
    // income (a payment credits the card).
    const paymentsStart = text.indexOf(PAYMENTS_SECTION);
    if (paymentsStart !== -1 && paymentsStart < chargesStart) {
      const paymentsSection = text.slice(paymentsStart, chargesStart);
      for (const match of paymentsSection.matchAll(RECORD_RE)) {
        const parsed = this.mapMatch(match, rowIndex++, period, TxType.income);
        if (parsed) rows.push(parsed);
      }
    }

    const end = text.indexOf(SECTION_END, chargesStart);
    const chargesSection =
      end !== -1 ? text.slice(chargesStart, end) : text.slice(chargesStart);
    for (const match of chargesSection.matchAll(RECORD_RE)) {
      const parsed = this.mapMatch(match, rowIndex++, period);
      if (parsed) rows.push(parsed);
    }

    return rows;
  }

  private mapMatch(
    match: RegExpMatchArray,
    rowIndex: number,
    period: StatementPeriod | null,
    forcedType?: TxType,
  ): ParsedTransaction | null {
    const txDateRaw = match[1].trim();
    const amount = parseFloat(match[4].replace(/,/g, ""));
    if (isNaN(amount) || amount === 0) return null;

    let description = match[3]
      .replace(/^Ý\s+/, "") // drop the bonus-rewards marker
      .replace(/\s{2,}/g, " ")
      .trim();

    for (const cat of SPEND_CATEGORIES) {
      if (description.endsWith(cat)) {
        description = description.slice(0, -cat.length).trim();
        break;
      }
    }

    const date = resolveYear(txDateRaw, period);

    return {
      rowIndex,
      date,
      description,
      amount: Math.abs(amount),
      type: forcedType ?? (amount >= 0 ? TxType.expense : TxType.income),
      valid: !!date,
    };
  }
}
