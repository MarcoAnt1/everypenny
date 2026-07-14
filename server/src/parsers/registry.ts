import { StatementParser } from "./interfaces/statementParser";
import { AmexCreditParser } from "./banks/amex/credit";
import { NeoCreditParser } from "./banks/neo/credit";
import { WealthsimpleCheckingParser } from "./banks/wealthsimple/checking";
import { CibcCreditParser } from "./banks/cibc/credit";

export enum Bank {
  AMEX = "amex",
  NEO = "neo",
  WEALTHSIMPLE = "wealthsimple",
  TD = "td",
  RBC = "rbc",
  BMO = "bmo",
  SCOTIABANK = "scotiabank",
  CIBC = "cibc",
}
export enum StatementType {
  CREDIT_CARD = "credit_card",
  CHECKING = "checking",
  SAVINGS = "savings",
  INVESTMENT = "investment",
}

type ParserFactory = () => StatementParser;

// Registered: only what's actually implemented.
const registry: Record<string, ParserFactory> = {
  [`${Bank.AMEX}:${StatementType.CREDIT_CARD}`]: () => new AmexCreditParser(),
  [`${Bank.NEO}:${StatementType.CREDIT_CARD}`]: () => new NeoCreditParser(),
  [`${Bank.CIBC}:${StatementType.CREDIT_CARD}`]: () => new CibcCreditParser(),
  [`${Bank.WEALTHSIMPLE}:${StatementType.CHECKING}`]: () =>
    new WealthsimpleCheckingParser(),
};

function key(bank: Bank, type: StatementType): string {
  return `${bank}:${type}`;
}

/**
 * Returns the parser for a (bank, statementType) pair.
 * Throws if the pair isn't supported.
 */
export function getParser(bank: Bank, type: StatementType): StatementParser {
  const factory = registry[key(bank, type)];
  if (!factory) {
    throw new Error(`No parser available for ${bank} / ${type}`);
  }

  return factory();
}

/**
 * Lists every supported (bank, statementType) pair.
 * Feeds the frontend's bank/type selection dropdowns.
 */
export function listSupported(): {
  bank: Bank;
  statementType: StatementType;
}[] {
  return Object.keys(registry).map((k) => {
    const [bank, statementType] = k.split(":");
    return {
      bank: bank as Bank,
      statementType: statementType as StatementType,
    };
  });
}
