import { ParsedTransaction, ParseResult } from "./interfaces/parsedTransactions";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs';
import { StatementProcessor } from "./interfaces/statementProcessor";

const TRANSACTION_SECTION_START = 'Transaction Date   Posted Date   Description';
const TRANSACTION_SECTION_END = 'Important information about your Card Account';
const SKIP_DESCRIPTIONS = ['payment received', 'online payment'];

const PDF_LINE_PATTERN = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\s{2,}(.+?)\s{2,}(?:[A-Z]+\s{2,})?CAN\s{2,}(-?[\d,]+\.\d{2})/g

export class NeoProcessor implements StatementProcessor {
    protected dateHeaders = ["transaction date", "date"];
    protected descHeaders = ["description"];
    protected amountHeaders = ["amount"];

    public async parse(filePath: string): Promise<ParseResult> { 
        const buffer   = fs.readFileSync(filePath)
        const uint8    = new Uint8Array(buffer)
        const doc      = await pdfjsLib.getDocument({ data: uint8 }).promise
        const numPages = doc.numPages
        let text = ''

        for (let i = 1; i <= numPages; i++) {
            const page    = await doc.getPage(i)
            const content = await page.getTextContent()
            text += content.items.map((item: any) => item.str).join(' ') + '\n'
        }

        const { period, year, startMonth } = this.extractPeriod(text);

        const start = text.indexOf(TRANSACTION_SECTION_START);
        const end = text.indexOf(TRANSACTION_SECTION_END);

        if (start === -1) {
            throw new Error('Could not find transactions section in Neo PDF');
        }

        const transactionText = end !== -1 ? text.slice(start, end) : text.slice(start);
        const matches = [...transactionText.matchAll(PDF_LINE_PATTERN)];

        const rows = matches.map((match, index) => this.mapToTransactions(match, index, year, startMonth))
        return {
            total: rows.length,
            valid: rows.filter(r => r.valid).length,
            invalid: rows.filter(r => !r.valid).length,
            period,
            rows
        }
    }

    private mapToTransactions(match: any, index: number, year: string, startMonth: number | null): ParsedTransaction {        
        const txDateRaw = match[1].trim();
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

        protected extractPeriod(text: string): { period: string, year: string; startMonth: number | null } {
        const match = text.match(/([A-Za-z]+ \d+, \d{4})\s*-\s*([A-Za-z]+ \d+, \d{4})/);
        const start = match?.[1] || null;
        const end = match?.[2] || null;
        const year = end?.match(/\d{4}/)?.[0] || new Date().getFullYear().toString();
        const startMonth = start ? new Date(start).getMonth() : null;

        return {
            period: match ? `${start} - ${end}` : 'Unknow period',
            year,
            startMonth
        }
    }

    protected resolveMonthDate(txDateRaw: string, year: string, startMonth: number | null): string | null {
        const parsed = new Date(`${txDateRaw} ${year}`);
        if (isNaN(parsed.getTime())) {
            return null;
        }

        const txMonth = parsed.getMonth();
        const resolvedYear = startMonth !== null && txMonth < startMonth
            ? String(Number(year) + 1)
            : year;
        const fullDate = new Date(`${txDateRaw} ${resolvedYear}`);

        return isNaN(fullDate.getTime()) ? null : fullDate.toISOString();
    }
}