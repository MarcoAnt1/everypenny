import * as XLSX from "xlsx";
import * as fs from "fs";

export interface ParsedTransaction {
    date: string | null;
    description: string;
    amount: number;
    type: "expense" | "income";
    valid: boolean;
}

export abstract class BaseBankProcessor {
    protected abstract dateHeaders: string[];
    protected abstract descHeaders: string[];
    protected abstract amountHeaders: string[];

    protected statementYear: string = new Date().getFullYear().toString();

    protected abstract parseRow(row: any[], indexes: { date: number; desc: number; amount: number}): ParsedTransaction | null;

    public processXlsx(filePath: string): ParsedTransaction[] {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header:1 , defval: ""});

        return this.processMatrix(matrix);
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

        const transactionsRows = matrix.slice(headerRowIndex + 1);
        const indexes = { date: dateColIndex, desc: descColIndex, amount: amountColIndex };

        return transactionsRows
            .map(row => this.parseRow(row, indexes))
            .filter((row): row is ParsedTransaction => row !== null);
    }

    protected parseDateString(raw: any): string | null {
        if (!raw) return null;

        // Handle Excel serial number dates
        const num = Number(raw);
        if (!isNaN(num) && num > 10000) {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + num * 86400000);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }

        // Try direct parse
        const direct = new Date(raw);
        if (!isNaN(direct.getTime())) {
            return direct.toISOString();
        }

        // Try DD/MM/YYYY or DD-MM-YYYY
        const parts = raw.split(/[\/\-\.]/);
        if (parts.length === 3) {
            const [a, b, c] = parts;
            // Try DD/MM/YYYY
            const attempt1 = new Date(
                `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`,
            );
            if (!isNaN(attempt1.getTime())) {
                return attempt1.toISOString();
            }
            // Try MM/DD/YYYY
            const attempt2 = new Date(
                `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`,
            );
            if (!isNaN(attempt2.getTime())) {
                return attempt2.toISOString();
            }
        }

        return null;
    };
}