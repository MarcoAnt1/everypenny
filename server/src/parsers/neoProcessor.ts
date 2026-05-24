import { BaseBankProcessor } from "./baseBankProcessor";
import { ParsedTransaction, ParseResult } from "./parsedTransactions";

const TRANSACTION_SECTION_START = 'Transaction Date   Posted Date   Description';
const TRANSACTION_SECTION_END = 'Important information about your Card Account';
const SKIP_DESCRIPTIONS = ['payment received', 'online payment'];

const PDF_LINE_PATTERN = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}(.+?)\s{2,}(?:[A-Z]+\s{2,})?CAN\s{2,}(-?[\d,]+\.\d{2})/g

export class NeoProcessor extends BaseBankProcessor {
    protected dateHeaders = ["transaction date", "date"];
    protected descHeaders = ["description"];
    protected amountHeaders = ["amount"];

    protected parsePdfText(text: string): ParseResult {
        const { period, year, startMonth } = this.extractPeriod(text);

        const start = text.indexOf(TRANSACTION_SECTION_START);
        const end = text.indexOf(TRANSACTION_SECTION_END);

        if (start === -1) {
            throw new Error('Could not find transactions section in Neo PDF');
        }

        const transactionText = end !== -1 ? text.slice(start, end) : text.slice(start);
        const matches = [...transactionText.matchAll(PDF_LINE_PATTERN)];

        const rows = matches.map((match, index) => this.parseToRows(match, index, year, startMonth))
        return {
            total: rows.length,
            valid: rows.filter(r => r.valid).length,
            invalid: rows.filter(r => !r.valid).length,
            period,
            rows
        }
    }

    protected parseXlsxRow(row: any[], indexes: { date: number; desc: number; amount: number; }): ParsedTransaction | null {
        return null;
    }

    private parseToRows(match: any, index: number, year: string, startMonth: number | null): ParsedTransaction {        const txDateRaw = match[1].trim();
        const description = match[3].trim();
        const amount = parseFloat(match[4].replace(/,/g, ''));
        const type = amount >= 0 ? 'income' : 'expense';
        const date = this.resolveMonthDate(txDateRaw, year, startMonth);

        return {
            rowIndex: index,
            date,
            description,
            amount: Math.abs(amount),
            type,
            valid: !!date && !isNaN(Math.abs(amount))
        }
    }
}