import * as XLSX from "xlsx";
import { ParsedTransaction } from "../interfaces/parsedTransactions";
import { BaseStatementParser } from "./baseStatementParser";

export type XlsxColumnIndexes = {
  date: number;
  desc: number;
  amount: number;
  headerRow: number;
};

export abstract class XlsxParser extends BaseStatementParser {
  protected abstract dateHeaders: string[];
  protected abstract descHeaders: string[];
  protected abstract amountHeaders: string[];

  protected abstract mapRow(
    row: any[],
    indexes: XlsxColumnIndexes,
    rowIndex: number,
  ): ParsedTransaction | null;

  protected async extractRows(filePath: string): Promise<ParsedTransaction[]> {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    return this.parseMatrix(matrix);
  }

  // Parse an already-loaded sheet matrix into transactions. Exposed (separate
  // from file reading) so tests can exercise the logic with in-memory matrices.
  public parseMatrix(matrix: any[][]): ParsedTransaction[] {
    if (matrix.length === 0) {
      throw new Error("Statement file is empty");
    }

    const indexes = this.findHeaderRow(matrix);

    return matrix
      .slice(indexes.headerRow + 1)
      .map((row, i) => this.mapRow(row, indexes, i))
      .filter((r): r is ParsedTransaction => r !== null);
  }

  private findHeaderRow(matrix: any[][]): XlsxColumnIndexes {
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      const dateIdx = row.findIndex((cell) =>
        this.dateHeaders.includes(String(cell).toLowerCase().trim()),
      );
      const descIdx = row.findIndex((cell) =>
        this.descHeaders.includes(String(cell).toLowerCase().trim()),
      );
      const amountIdx = row.findIndex((cell) =>
        this.amountHeaders.includes(String(cell).toLowerCase().trim()),
      );

      if (dateIdx !== -1 && descIdx !== -1 && amountIdx !== -1) {
        return {
          date: dateIdx,
          desc: descIdx,
          amount: amountIdx,
          headerRow: i
        }
      }
    }
    throw new Error("Could not find a valid transaction header row");
  }
}
