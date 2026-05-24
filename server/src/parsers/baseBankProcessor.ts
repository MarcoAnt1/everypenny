import * as XLSX from "xlsx";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs';
import { ParsedTransaction, ParseResult } from "./parsedTransactions";

export abstract class BaseBankProcessor {
    protected abstract dateHeaders: string[];
    protected abstract descHeaders: string[];
    protected abstract amountHeaders: string[];

    protected abstract parsePdfText(text: string): ParseResult;
    protected abstract parseXlsxRow(row: any[], indexes: { date: number; desc: number; amount: number }): ParsedTransaction | null;

    public processXlsx(filePath: string): ParseResult {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header:1 , defval: ""});

        const rows = this.processMatrix(matrix);
        return {
            total: rows.length,
            valid: rows.filter(r => r.valid).length,
            invalid: rows.filter(r => !r.valid).length,
            rows
        }
    }

    public async processPdf(filePath: string): Promise<ParseResult> {
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

        return this.parsePdfText(text);
    }

    private processMatrix(matrix: any[][]): ParsedTransaction[] {
        if (matrix.length === 0) {
            throw new Error("Statement matrix is empty");
        }

        let headerRowIndex = -1;
        let dateColIndex = -1;
        let descColIndex = -1;
        let amountColIndex = -1;

        for (let i = 0; i < matrix.length; i++) {
            const row = matrix[i];

            const dIdx = row.findIndex(cell => this.dateHeaders.includes(String(cell).toLowerCase().trim()));
            const descIdx = row.findIndex(cell => this.descHeaders.includes(String(cell).toLowerCase().trim()));
            const aIdx = row.findIndex(cell => this.amountHeaders.includes(String(cell).toLowerCase().trim()));

            if (dIdx !== -1 && descIdx !== -1 && aIdx !== -1) {
            headerRowIndex = i;
            dateColIndex = dIdx;
            descColIndex = descIdx;
            amountColIndex = aIdx;
            break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("Could not find a valid transaction header row");
        }

        const indexes = { date: dateColIndex, desc: descColIndex, amount: amountColIndex };

        return matrix
            .slice(headerRowIndex + 1)
            .map(row => this.parseXlsxRow(row, indexes))
            .filter((row): row is ParsedTransaction => row !== null);
    }

    protected parseDateString(raw: any): string | null {
        if (!raw) return null;

        const num = Number(raw);
        if (!isNaN(num) && num > 10000) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + num * 86400000);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }

        const direct = new Date(raw);
        if (!isNaN(direct.getTime())) {
            return direct.toISOString();
        }

        // Try DD/MM/YYYY or DD-MM-YYYY
        const parts = raw.split(/[\/\-\.]/);
        if (parts.length === 3) {
            const [a, b, c] = parts;
            const attempt1 = new Date(
                `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`,
            );
            if (!isNaN(attempt1.getTime())) {
                return attempt1.toISOString();
            }
            const attempt2 = new Date(
                `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`,
            );
            if (!isNaN(attempt2.getTime())) {
                return attempt2.toISOString();
            }
        }

        return null;
    };

    protected parseAmount(raw: any): number {
        return parseFloat(String(raw).replace(/[^\d.-]/g, ''));
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