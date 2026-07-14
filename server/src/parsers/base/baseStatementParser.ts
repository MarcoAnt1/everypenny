import {
  ParsedTransaction,
  ParseResult,
} from "../interfaces/parsedTransactions";
import { StatementParser } from "../interfaces/statementParser";

export abstract class BaseStatementParser implements StatementParser {
  async parse(filePath: string): Promise<ParseResult> {
    const rows = await this.extractRows(filePath);
    return this.buildResult(rows);
  }

  protected abstract extractRows(
    filePath: string,
  ): Promise<ParsedTransaction[]>;

  protected buildResult(
    rows: ParsedTransaction[],
    extra?: Promise<ParseResult>,
  ): ParseResult {
    return {
      total: rows.length,
      valid: rows.filter((r) => r.valid).length,
      invalid: rows.filter((r) => !r.valid).length,
      rows,
      ...extra,
    };
  }
}
