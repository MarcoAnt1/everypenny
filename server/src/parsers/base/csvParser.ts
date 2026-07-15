import fs from "fs";
import { parse } from "csv-parse/sync";
import { ParsedTransaction } from "../interfaces/parsedTransactions";
import { BaseStatementParser } from "./baseStatementParser";

export abstract class CsvParser extends BaseStatementParser {
  protected abstract mapRow(
    row: Record<string, any>,
    rowIndex: number,
  ): ParsedTransaction | null;

  protected preprocessLines(lines: string[]): string[] {
    return lines.filter((line) => line.trim() !== "");
  }

  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const raw = fs.readFileSync(filePath, "utf-8");
    const cleaned = this.preprocessLines(raw.split("\n")).join("\n");

    const rows: Record<string, any>[] = parse(cleaned, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return this.parseRecords(rows);
  }

  // Parse already-parsed CSV records into transactions. Exposed (separate from
  // file reading) so tests can exercise the logic with in-memory records.
  public parseRecords(records: Record<string, any>[]): ParsedTransaction[] {
    return records
      .map((row, i) => this.mapRow(row, i))
      .filter((r): r is ParsedTransaction => r !== null);
  }
}
