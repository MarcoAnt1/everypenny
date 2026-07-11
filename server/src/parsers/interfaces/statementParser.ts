import { ParseResult } from "./parsedTransactions";

export interface StatementParser {
    parse(filePath: string): Promise<ParseResult>;
}