import { ParsedTransaction, ParseResult } from "./interfaces/parsedTransactions";
import * as XLSX from "xlsx";
import { StatementProcessor } from "./interfaces/statementProcessor";
import { parseDateString } from "../helper/formatHelper";

export class AmexProcessor implements StatementProcessor {
    protected dateHeaders = ["date", "transaction date", "data"];
    protected descHeaders = [ "description", "appearance description", "details", "descricao"];
    protected amountHeaders = ["amount", "charge", "valor", "value"];

    public async parse(filePath: string): Promise<ParseResult> { 
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

  private parseXlsxRow(row: any[], indexes: { date: number; desc: number; amount: number; }): ParsedTransaction | null {
      const rawDate = row[indexes.date];
      const rawDesc = row[indexes.desc];
      const rawAmount = row[indexes.amount];

      if (!rawDate || !rawDesc || !rawAmount) {
        return null;
      }

      const description = String(rawDesc).trim();
      const lowerDesc = description.toLowerCase();        
      if (lowerDesc.toLowerCase().includes("payment received") || lowerDesc.toLowerCase().includes("online payment")) {
        return null;
      }

      const amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount === 0) {
        return null;
      }
      
      const parsedDate = parseDateString(String(rawDate));

      return {
          date: parsedDate,
          description: description,
          amount: Math.abs(amount),
          type: amount > 0 ? "expense" : "income",
          valid: !!parsedDate,
      };
  }
}