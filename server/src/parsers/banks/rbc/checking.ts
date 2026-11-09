import { TxType } from "@prisma/client";
import { PdfItem, PdfParser } from "../../base/pdfParser";
import { ParsedTransaction } from "../../interfaces/parsedTransactions";
import { resolvePeriod, resolveYear } from "../../base/statementPeriod";

// RBC chequing statements can't be parsed from flattened text: the Withdrawals
// and Deposits columns both hold bare numbers, the date is printed only on a
// day's first transaction, and the running balance only on its last. So this
// parser works from positioned items and classifies each amount by the column
// header it is right-aligned to.

const DATE_RE = /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
const AMOUNT_RE = /^-?[\d,]+\.\d{2}$/;
const PERIOD_RE = /From ([A-Za-z]+ \d{1,2}, \d{4}) to ([A-Za-z]+ \d{1,2}, \d{4})/;

const LINE_TOLERANCE = 2; // items within this many points share a line
const COLUMN_TOLERANCE = 20; // max distance from an amount to its column edge

type Columns = {
  dateX: number;
  descX: number;
  withdrawals: number; // right edges of the amount column headers
  deposits: number;
  balance: number;
};

export class RbcCheckingParser extends PdfParser {
  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const items = await this.extractItems(filePath);
    return this.parseItems(items);
  }

  public parseItems(items: PdfItem[]): ParsedTransaction[] {
    const period = resolvePeriod(
      items.map((i) => i.str).join(" "),
      PERIOD_RE,
    );

    const rows: ParsedTransaction[] = [];
    let currentDate: string | null = null;
    let pendingDesc: string[] = [];
    let foundHeader = false;

    const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
    for (const page of pages) {
      const pageItems = items.filter((i) => i.page === page);
      const header = this.findColumns(pageItems);
      if (!header) continue;
      foundHeader = true;

      for (const line of this.toLines(pageItems, header.y)) {
        const lineText = line.map((i) => i.str).join(" ");
        if (/Closing Balance/i.test(lineText)) return rows;
        if (/Opening Balance|Balance forward/i.test(lineText)) continue;

        // A line that starts outside the Date/Description columns is past the
        // end of the table on this page (footer, notices).
        const first = line[0];
        const isDateCell =
          Math.abs(first.x - header.cols.dateX) < 5 &&
          DATE_RE.test(first.str.trim());
        if (!isDateCell && first.x < header.cols.descX - 2) break;

        let withdrawal: number | null = null;
        let deposit: number | null = null;
        for (const item of line) {
          const s = item.str.trim();
          if (item === first && isDateCell) {
            const [, day, mon] = s.match(DATE_RE)!;
            currentDate = resolveYear(`${mon} ${day}`, period);
          } else if (AMOUNT_RE.test(s)) {
            const amount = parseFloat(s.replace(/,/g, ""));
            const col = this.amountColumn(item.right, header.cols);
            if (col === "withdrawals") withdrawal = amount;
            else if (col === "deposits") deposit = amount;
            // balance column: running balance, not a transaction
          } else {
            pendingDesc.push(s);
          }
        }

        const amount = withdrawal ?? deposit;
        if (amount === null || amount === 0) continue; // description wraps onto the next line

        rows.push({
          rowIndex: rows.length,
          date: currentDate,
          description: pendingDesc.join(" ").replace(/\s{2,}/g, " ").trim(),
          amount: Math.abs(amount),
          type: withdrawal !== null ? TxType.expense : TxType.income,
          valid: !!currentDate,
        });
        pendingDesc = [];
      }
    }

    if (!foundHeader) {
      throw new Error("Could not find the account activity table in the RBC PDF");
    }
    return rows;
  }

  private findColumns(
    items: PdfItem[],
  ): { y: number; cols: Columns } | null {
    const find = (label: RegExp) => items.find((i) => label.test(i.str.trim()));
    const withdrawals = find(/^Withdrawals \(\$\)$/);
    const deposits = find(/^Deposits \(\$\)$/);
    const balance = find(/^Balance \(\$\)$/);
    if (!withdrawals || !deposits || !balance) return null;

    const onHeaderLine = (i: PdfItem) =>
      Math.abs(i.y - withdrawals.y) < LINE_TOLERANCE;
    const date = items.find((i) => onHeaderLine(i) && i.str.trim() === "Date");
    const desc = items.find(
      (i) => onHeaderLine(i) && i.str.trim() === "Description",
    );

    return {
      y: withdrawals.y,
      cols: {
        dateX: date?.x ?? 0,
        descX: desc?.x ?? 0,
        withdrawals: withdrawals.right,
        deposits: deposits.right,
        balance: balance.right,
      },
    };
  }

  // Items below the header, grouped into visual lines (top to bottom), each
  // line sorted left to right.
  private toLines(items: PdfItem[], headerY: number): PdfItem[][] {
    const below = items
      .filter((i) => i.y < headerY - LINE_TOLERANCE)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: PdfItem[][] = [];
    for (const item of below) {
      const line = lines[lines.length - 1];
      if (line && Math.abs(line[0].y - item.y) < LINE_TOLERANCE) {
        line.push(item);
      } else {
        lines.push([item]);
      }
    }
    return lines.map((l) => l.sort((a, b) => a.x - b.x));
  }

  private amountColumn(
    right: number,
    cols: Columns,
  ): "withdrawals" | "deposits" | "balance" | null {
    const candidates = [
      ["withdrawals", cols.withdrawals],
      ["deposits", cols.deposits],
      ["balance", cols.balance],
    ] as const;
    const [name, edge] = candidates.reduce((best, c) =>
      Math.abs(c[1] - right) < Math.abs(best[1] - right) ? c : best,
    );
    return Math.abs(edge - right) <= COLUMN_TOLERANCE ? name : null;
  }
}
