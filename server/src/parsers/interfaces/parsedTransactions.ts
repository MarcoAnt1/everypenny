import { TxType } from "@prisma/client";

export interface ParsedTransaction {
  rowIndex?: number;
  date: string | null;
  description: string;
  amount: number;
  type: TxType;
  toAccountId?: string | null;
  valid: boolean;
}

export interface ParseResult {
  total: number;
  valid: number;
  invalid: number;
  period?: string;
  rows: ParsedTransaction[];
}
