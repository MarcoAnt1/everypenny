export interface ParsedTransaction {
    rowIndex?: number
    date: string | null;
    description: string;
    amount: number;
    type: "expense" | "income" | "transfer";
    valid: boolean;
}

export interface ParseResult {
    total: number
    valid: number
    invalid: number
    period?: string
    rows: ParsedTransaction[]
}