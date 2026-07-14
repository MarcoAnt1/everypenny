// We parse only the "new charges and credits" section — the "Your payments"

import { TxType } from "@prisma/client";
import { PdfParser } from "../../base/pdfParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";

// section above it is card payments (money from another account), which we skip.
const SECTION_START = "Your new charges and credits";
const SECTION_END = "Total for"

// One record: transDate  postDate  description[ spendCategory]  amount.
// The lookahead anchors the amount as the last number before the next record or
// the section total, so a stray number in a description can't derail it.
const RECORD_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}(.+?)\s{2,}(-?[\d,]+\.\d{2})(?=\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s{2,}|\s+Total for|\s*$)/g;

const PERIOD_RE = /([A-Za-z]+ \d{1,2}) to ([A-Za-z]+ \d{1,2},? \d{4})/;

// CIBC spend categories sit between the merchant/location and the amount.
// Strip a trailing one so descriptions stay merchant-focused. Unknown categories
// simply remain in the description (graceful fallback).
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
    const { year, startMonth } = this.extractPeriod(text);

    const start = text.indexOf(SECTION_START);
    if (start === -1) {
      throw new Error("Could not find the charges section in the CIBC PDF");
    }

    const end = text.indexOf(SECTION_END, start);
    const section = end !== -1 ? text.slice(start, end) : text.slice(start);

    const rows: ParsedTransaction[] = [];
    let rowIndex = 0;
    for (const match of section.matchAll(RECORD_RE)) {
      const parsed = this.mapMatch(match, rowIndex++, year, startMonth);
      if (parsed) rows.push(parsed);
    }

    return rows;
  }

  private mapMatch(
    match: RegExpMatchArray,
    rowIndex: number,
    year: string,
    startMonth: number | null,
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

    const date = this.resolveDate(txDateRaw, year, startMonth);

    return {
      rowIndex,
      date,
      description,
      amount: Math.abs(amount),
      type: amount >= 0 ? TxType.expense : TxType.income,
      valid: !!date,
    };
  }

  private extractPeriod(text: string): {
    year: string;
    startMonth: number | null;
  } {
    const match = text.match(PERIOD_RE);
    const start = match?.[1] || null;
    const end = match?.[2] || null;
    const year = end?.match(/\d{4}/)?.[0] || String(new Date().getFullYear());
    const startMonth = start ? new Date(`${start} ${year}`).getMonth() : null;
    return { year, startMonth };
  }

  private resolveDate(
    txDateRaw: string,
    year: string,
    startMonth: number | null,
  ): string | null {
    const parsed = new Date(`${txDateRaw} ${year}`);
    if (isNaN(parsed.getTime())) return null;

    const resolvedYear =
      startMonth !== null && parsed.getMonth() < startMonth
        ? String(Number(year) + 1)
        : year;

    const fullDate = new Date(`${txDateRaw} ${resolvedYear}`);
    return isNaN(fullDate.getTime()) ? null : fullDate.toISOString();
  }
}
