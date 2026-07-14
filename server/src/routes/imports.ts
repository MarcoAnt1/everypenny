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
import { userCanEditTransactionInAccount } from "../helper/authorization";
import { Decimal } from "@prisma/client/runtime/library";
import { deltaOps, signAmount, Delta } from "../lib/balance";

const router = Router();

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
      res.json(result);
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

    const tagsCreate = (tagIds?: string[]) =>
      tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined;

    const ops: any[] = [];
    const deltas: Delta[] = [];

    for (const tx of valid) {
      const base = {
        categoryId: tx.categoryId || null,
        description: tx.description || "Imported transaction",
        date: new Date(tx.date),
        status: TxStatus.cleared,
        notes: "Imported from statement",
        tags: tagsCreate(tx.tagIds),
      };

      if (tx.type === TxType.transfer && tx.toAccountId) {
        const amt = new Decimal(tx.amount);
        const transferGroupId = crypto.randomUUID();

        ops.push(
          prisma.transaction.create({
            data: {
              ...base,
              accountId,
              toAccountId: tx.toAccountId,
              transferGroupId,
              amount: amt.negated(),
              type: TxType.transfer,
            },
          }),
          prisma.transaction.create({
            data: {
              ...base,
              accountId: tx.toAccountId,
              toAccountId: accountId,
              transferGroupId,
              amount: amt,
              type: TxType.transfer,
            },
          }),
        );
        deltas.push(
          { accountId, delta: amt.negated() },
          { accountId: tx.toAccountId, delta: amt },
        );
      } else {
        const type =
          tx.type === TxType.transfer ? TxType.expense : (tx.type as TxType);
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

    const merged = new Map<string, Decimal>();
    for (const d of deltas) {
      merged.set(
        d.accountId,
        merged.get(d.accountId) ?? new Decimal(0).plus(d.delta),
      );
    }

    const mergedDeltas: Delta[] = [...merged].map(([acc, delta]) => ({
      accountId: acc,
      delta,
    }));

    await prisma.$transaction([...ops, ...deltaOps(mergedDeltas)]);

    let warning: string | undefined;
    if (
      statementType &&
      Object.values(StatementType).includes(statementType) &&
      !COMPATIBLE[statementType as StatementType]?.includes(account.type)
    ) {
      warning = `A ${StatementType} statement was imported into a ${account.type} account. Double-check the results.`;
    }

    res.status(201).json({
      imported: valid.length,
      skipped,
      ...(warning ? { warning } : {}),
      message: `${valid.length} transactions imported successfully`,
    });
  } catch (err: any) {
    console.error("Confirm import error:", err);
    res.status(500).json({ error: `Failed to save transactions` });
  }
});

export default router;
