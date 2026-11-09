import { Router, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import {
  Bank,
  getParser,
  listSupported,
  StatementType,
} from "../parsers/registry";
import { AccountType, TxStatus, TxType } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import {
  getUserAccounts,
  userCanEditTransactionInAccount,
} from "../services/authorization";
import { Decimal } from "@prisma/client/runtime/library";
import {
  deltaOps,
  signAmount,
  mergeDeltas,
  Delta,
} from "../services/balance";
import {
  Direction,
  ExistingTx,
  TRANSFER_WINDOW_DAYS,
  closestByDate,
  isCounterpart,
  matchImportRows,
  signedAmount,
} from "../services/importMatching";

const router = Router();

// Existing transactions in the given accounts around the given dates (padded by
// the transfer window), shaped for the import matching rules.
async function loadExisting(
  accountIds: string[],
  dates: (string | null | undefined)[],
): Promise<ExistingTx[]> {
  const times = dates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t));
  if (accountIds.length === 0 || times.length === 0) return [];

  const pad = (TRANSFER_WINDOW_DAYS + 1) * 86_400_000;
  const rows = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      date: {
        gte: new Date(Math.min(...times) - pad),
        lte: new Date(Math.max(...times) + pad),
      },
    },
    select: {
      id: true,
      accountId: true,
      date: true,
      amount: true,
      description: true,
      type: true,
      transferGroupId: true,
      account: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    accountName: r.account.name,
    date: r.date,
    amount: Number(r.amount),
    description: r.description,
    type: r.type,
    transferGroupId: r.transferGroupId,
  }));
}

// Money in or out of the imported account. Sent by the client (from the
// parsed row) because a row re-typed as "transfer" no longer says which way.
const rowDirection = (tx: any): Direction =>
  tx.direction === "in" || tx.direction === "out"
    ? tx.direction
    : tx.type === TxType.income
      ? "in"
      : "out";

// Multer config - save file temporarily to /uploads
const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/pdf",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Which account types a given statement type is "expected" to import into.
// Used only for a soft warning — imports still proceed.
const COMPATIBLE: Record<StatementType, AccountType[]> = {
  [StatementType.CREDIT_CARD]: [AccountType.credit_card],
  [StatementType.CHECKING]: [
    AccountType.checking,
    AccountType.savings,
    AccountType.cash,
  ],
  [StatementType.SAVINGS]: [
    AccountType.savings,
    AccountType.checking,
    AccountType.cash,
  ],
  [StatementType.INVESTMENT]: [AccountType.investment],
};

// GET /api/import/supported — bank/statement-type pairs for the frontend dropdowns.
router.get("/supported", (_req: AuthRequest, res: Response) => {
  res.json(listSupported());
});

// POST /api/import/preview — parse a file and return rows without saving.
router.post(
  "/preview",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        error: "No valid file uploaded. Upload a PDF, CSV, or Excel file.",
      });
      return;
    }

    const bank = String(req.body.bank || "") as Bank;
    const statementType = String(req.body.statementType || "") as StatementType;

    try {
      if (!Object.values(Bank).includes(bank)) {
        return res.status(400).json({ error: "Invalid or missing bank" });
      }
      if (!Object.values(StatementType).includes(statementType)) {
        return res
          .status(400)
          .json({ error: "Invalid or missing statement type" });
      }

      const parser = getParser(bank, statementType);
      const result = await parser.parse(req.file.path);

      // Annotate rows with duplicate / own-transfer matches against what's
      // already saved, when we know the target account.
      const accountId = String(req.body.accountId || "");
      const accounts = await getUserAccounts(req.userId!);
      const rows = result.rows.map((r) => ({
        ...r,
        direction: (r.type === TxType.income ? "in" : "out") as Direction,
      }));

      if (accountId && accounts.some((a) => a.id === accountId)) {
        const existing = await loadExisting(
          accounts.map((a) => a.id),
          rows.map((r) => r.date),
        );
        const matches = matchImportRows(rows, accountId, existing);
        res.json({
          ...result,
          rows: rows.map((r, i) => ({ ...r, match: matches[i] })),
        });
        return;
      }

      res.json({ ...result, rows });
    } catch (error: any) {
      console.error("Import preview error:", error);
      res.status(500).json({
        error: "Could not parse the statement. Check the bank, type, and file.",
      });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  },
);

// POST /api/import/confirm — save the reviewed transactions atomically.
router.post("/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, statementType, transactions } = req.body;

    if (!accountId || !Array.isArray(transactions) || transactions?.length === 0) {
      res
        .status(400)
        .json({ error: "accountId and transactions are required" });
      return;
    }

    const canEdit = await userCanEditTransactionInAccount(
      req.userId!,
      accountId,
    );
    if (!canEdit) {
      return res
        .status(403)
        .json({ error: "You do not have access to this account" });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      return res.status(404).json({ error: "Account not found"})
    }

    const valid = transactions.filter((t: any) => t.valid !== false);
    const skipped = transactions.length - valid.length;

    const destIds = [
      ...new Set(
        valid
          .filter((t: any) => t.type === TxType.transfer && t.toAccountId)
          .map((t: any) => t.toAccountId as string),
      ),
    ];

    for (const destId of destIds) {
      const ok = await userCanEditTransactionInAccount(req.userId!, destId);
      if (!ok) {
        return res.status(403).json({
          error: "You do not have access to a selected transfer destination",
        });
      }
    }

    // De-duplicated: a repeated tag id would violate (transactionId, tagId).
    const tagsCreate = (tagIds?: string[]) =>
      tagIds?.length
        ? { create: [...new Set(tagIds)].map((tagId) => ({ tagId })) }
        : undefined;

    // Plain rows in the transfer destinations that may be the other side of a
    // transfer being imported (e.g. the card's payment, imported earlier as
    // income). Those get linked as the second leg instead of duplicated.
    const counterpartPool = await loadExisting(
      destIds,
      valid
        .filter((t: any) => t.type === TxType.transfer && t.toAccountId)
        .map((t: any) => t.date),
    );
    const used = new Set<string>();

    const ops: any[] = [];
    const deltas: Delta[] = [];
    let linked = 0;

    for (const tx of valid) {
      const base = {
        categoryId: tx.categoryId || null,
        description: tx.description || "Imported transaction",
        date: new Date(tx.date),
        status: TxStatus.cleared,
        notes: "Imported from statement",
        tags: tagsCreate(tx.tagIds),
      };
      const direction = rowDirection(tx);

      if (tx.type === TxType.transfer && tx.toAccountId) {
        const date = new Date(tx.date);
        // Signed from this account's point of view: an incoming card payment
        // is +X here and -X in the account it came from.
        const signed = signedAmount(Number(tx.amount), direction);
        const amt = new Decimal(signed);
        const transferGroupId = crypto.randomUUID();

        const candidates = counterpartPool.filter(
          (e) =>
            e.accountId === tx.toAccountId &&
            !used.has(e.id) &&
            isCounterpart(e, date, signed),
        );
        const counterpart =
          candidates.find((e) => e.id === tx.linkTransactionId) ??
          closestByDate(date, candidates);

        ops.push(
          prisma.transaction.create({
            data: {
              ...base,
              accountId,
              toAccountId: tx.toAccountId,
              transferGroupId,
              amount: amt,
              type: TxType.transfer,
            },
          }),
        );
        deltas.push({ accountId, delta: amt });

        if (counterpart) {
          // Already recorded (and already in that account's balance): turn it
          // into this transfer's second leg rather than adding another.
          used.add(counterpart.id);
          linked++;
          ops.push(
            prisma.transaction.update({
              where: { id: counterpart.id },
              data: {
                type: TxType.transfer,
                toAccountId: accountId,
                transferGroupId,
                externalParty: null,
              },
            }),
          );
        } else {
          ops.push(
            prisma.transaction.create({
              data: {
                ...base,
                accountId: tx.toAccountId,
                toAccountId: accountId,
                transferGroupId,
                amount: amt.negated(),
                type: TxType.transfer,
              },
            }),
          );
          deltas.push({ accountId: tx.toAccountId, delta: amt.negated() });
        }
      } else {
        // A "transfer" without a destination is saved as a plain row in the
        // statement's direction.
        const type =
          tx.type === TxType.transfer
            ? direction === "in"
              ? TxType.income
              : TxType.expense
            : (tx.type as TxType);
        const signed = signAmount(type, tx.amount);

        ops.push(
          prisma.transaction.create({
            data: {
              ...base,
              accountId,
              toAccountId: null,
              amount: signed,
              type,
            },
          }),
        );
        deltas.push({ accountId, delta: signed });
      }
    }

    await prisma.$transaction([...ops, ...deltaOps(mergeDeltas(deltas))]);

    let warning: string | undefined;
    if (
      statementType &&
      Object.values(StatementType).includes(statementType) &&
      !COMPATIBLE[statementType as StatementType]?.includes(account.type)
    ) {
      warning = `A ${statementType} statement was imported into a ${account.type} account. Double-check the results.`;
    }

    res.status(201).json({
      imported: valid.length,
      skipped,
      linked,
      ...(warning ? { warning } : {}),
      message: `${valid.length} transactions imported successfully`,
    });
  } catch (err: any) {
    console.error("Confirm import error:", err);
    res.status(500).json({ error: `Failed to save transactions` });
  }
});

export default router;
