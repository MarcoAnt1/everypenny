import { BaseBankProcessor } from "./baseBankProcessor";
import { ParsedTransaction, ParseResult } from "./parsedTransactions";
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const INCOME_SUBTYPES = [ 'AFT_IN', 'E_TRFIN'];
const TRANSFER_SUBTYPES = [ 'TRANSFER', 'E_TRFOUT'];
const INCOME_TYPES = [ 'Interest' ];
const SKIP_TYPES = [ 'Dividend', 'Buy', 'Sell' ]

export class WealthSimpleProcessor extends BaseBankProcessor {
    protected dateHeaders = [ 'transaction_date '];
    protected descHeaders = [ 'name' ];
    protected amountHeaders = [ 'net_cash_amount' ];

    protected parsePdfText(text: string): ParseResult {
        throw new Error("Method not implemented.");
    }
    protected parseXlsxRow(row: any[], indexes: { date: number; desc: number; amount: number; }): ParsedTransaction | null {
        throw new Error("Method not implemented.");
    }

    public processCsv(filePath: string): ParseResult {
        const raw = fs.readFileSync(filePath, 'utf-8');

        const cleaned = raw
            .split('\n')
            .filter(line => !line.startsWith('"As of') && line.trim() !== '')
            .join('\n');

        const rows: any[] = parse(cleaned, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const parsed = rows
            .map((row, index) => this.parseWealthsimpleRow(row, index))
            .filter((row): row is ParsedTransaction => row !== null);

        return {
            total: parsed.length,
            valid: parsed.filter(r => r.valid).length,
            invalid: parsed.filter(r => !r.valid).length,
            rows: parsed
        }
    }

    private parseWealthsimpleRow(row: any, index: number): ParsedTransaction | null {
        const activityType = String(row.activity_type || '').trim();
        const activitySubType = String(row.activity_sub_type || '').trim();
        const rawAmount = row.net_cash_amount;
        const rawDate = row.transaction_date;
        const accountType = String(row.account_type || '').trim();

        if (SKIP_TYPES.includes(activityType)) return null;
        if (!rawAmount || !rawDate) return null;

        const amount = parseFloat(String(rawAmount).replace(/[^\d.-]/g, ''));
        if (isNaN(amount) || amount === 0) return null;

        const type = this.resolveType(activityType, activitySubType, amount);
        const description = this.buildDescription(activityType, activitySubType, accountType);
        const date = this.parseDateString(rawDate);

        return {
            rowIndex: index,
            date,
            description,
            amount: Math.abs(amount),
            type,
            valid: !!date && !isNaN(Math.abs(amount))
        }
    }

    private resolveType(activityType: string, activitySubType: string, amount: number): 'income' | 'expense' | 'transfer' {
        if (INCOME_TYPES.includes(activityType)) return 'income';

        if (TRANSFER_SUBTYPES.includes(activitySubType)) return 'transfer';

        if (INCOME_SUBTYPES.includes(activitySubType)) return 'income';

        if (activitySubType === 'AFT_OUT') return 'expense';

        return amount >= 0 ? 'income' : 'expense';
    }

    private buildDescription(activityType: string, activitySubType: string, accountType: string): string {
        const map: Record<string, string> = {
            'AFT_IN': 'Direct Deposit',
            'AFT_OUT': 'Bill Payment',
            'E_TRFIN': 'Transfer In',
            'E_TRFOUT': 'Transfer Out',
            'TRANSFER': 'Transfer',
        };

        if (activityType  === 'Interest') return `Interest -${accountType}`;

        return map[activitySubType] ?? `${accountType} ${activitySubType}`.trim();
    }
}