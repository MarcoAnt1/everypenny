import { BaseBankProcessor, ParsedTransaction } from "./baseBankProcessor";

export class AmexProcessor extends BaseBankProcessor {
    protected dateHeaders = ["date", "transaction date", "data"];
    protected descHeaders = [ "description", "appearance description", "details", "descricao"];
    protected amountHeaders = ["amount", "charge", "valor", "value"];

    protected parseRow(row: any[], indexes: { date: number; desc: number; amount: number; }): ParsedTransaction | null {
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
        
        const parsedDate = this.parseDateString(String(rawDate));

        return {
            date: parsedDate,
            description: description,
            amount: Math.abs(amount),
            type: amount > 0 ? "expense" : "income",
            valid: !!parsedDate,
        };
    }
}