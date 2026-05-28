import { ParseResult } from "./parsedTransactions";

export interface StatementProcessor {
    parse(filePath: string): Promise<ParseResult>;
}