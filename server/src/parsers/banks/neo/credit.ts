import { TxType } from "@prisma/client";
import { PdfParser } from "../../base/pdfParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";

const SECTION_END = "Important information about your Card Account";

// One record: txDate  postedDate  description[ city][ CAN]  amount
// The lookahead anchors the amount as the LAST number before the next record,
// the page footer, or end-of-section. This prevents a payment line (which has no
// "CAN") from swallowing the following purchase and stealing its amount.
const RECORD_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}(.+?)\s{2,}(-?[\d,]+\.\d{2})(?=\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s{2,}|\s+Neo Financial|\s*$)/g;

const PERIOD_RE = /([A-Za-z]+ \d+, \d{4})\s*-\s*([A-Za-z]+ \d+, \d{4})/;

const SKIP_DESCRIPTIONS = ["payment received"];

export class NeoCreditParser extends PdfParser {
  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const text = await this.extractText(filePath);
    const { year, startMonth } = this.extractPeriod(text);

    const start = text.search(/Transaction Date\s+Posted Date\s+Description/);
    if (start === -1) {
      throw new Error("Could not find the transactions section in the Neo PDF");
    }

    const end = text.indexOf(SECTION_END);
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

    const description = match[3]
      .replace(/\s+(CAN|USD)\s*$/, "") // drop trailing currency marker
      .replace(/\s{2,}/g, " ") // collapse runs of spaces
      .trim();

    if (SKIP_DESCRIPTIONS.some((s) => description.toLowerCase().includes(s))) {
      return null;
    }

    const date = this.resolveDate(txDateRaw, year, startMonth);

    return {
      rowIndex,
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? TxType.expense : TxType.income,
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
    const startMonth = start ? new Date(start).getMonth() : null;

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
