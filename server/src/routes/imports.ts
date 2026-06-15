import { Router, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs";
import prisma from "../lib/prisma";
import { AmexProcessor } from "../parsers/amexProcessor";
import { NeoProcessor } from "../parsers/neoProcessor";
import { WealthSimpleProcessor } from "../parsers/wealthsimpleProcessor";

const router = Router();

// Multer config - save file temporarily to /uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
});

// --- PREVIEW ---
// POST /api/import/excel/preview
// Parses the file and returns row without saving
router.post(
  "/preview",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const bankType = (req.body.bankType || "").toUpperCase();

    try {
      let preview;

      if (bankType.includes("AMEX")) {
        const processor = new AmexProcessor();
        preview = await processor.parse(req.file.path);
      } else if (bankType.includes("NEO")) {
        const processor = new NeoProcessor();
        preview = await processor.parse(req.file.path);
      } else if (bankType.includes("WEALTHSIMPLE")) {
        const processor = new WealthSimpleProcessor();
        preview = await processor.parse(req.file.path);
      } else {
        res.status(400).json("Institution not registered");
      }

      if (!preview) {
        return null;
      }

      res.json(preview);
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to parse file sctructure" });
    } finally {
      fs.unlinkSync(req.file.path);
    }
  },
);

// --- CONFIRM ---
// POST /api/import/confirm
// Saves the confirmed transactions to the DB
router.post("/confirm", async (req: Request, res: Response) => {
  try {
    const { accountId, transactions } = req.body;

    if (!accountId || !transactions?.length) {
      res
        .status(400)
        .json({ error: "accountId and transactions are required" });
      return;
    }

    // Save all transactions
    const created = await prisma.$transaction(
      transactions.map((tx: any) => {
        const isTransferWithoutDestination =
          tx.type === "transfer" && !tx.toAccountId;
        return prisma.transaction.create({
          data: {
            accountId,
            categoryId: tx.categoryId || null,
            toAccountId: tx.toAccountId || null,
            description: tx.description || "Imported transaction",
            amount: Number(tx.amount),
            date: tx.date,
            type: isTransferWithoutDestination ? "expense" : tx.type,
            status: "cleared",
            notes: "Imported from statement",
            tags: tx.tagIds?.length
              ? {
                  create: tx.tagIds.map((tagId: string) => ({ tagId })),
                }
              : undefined,
          },
        });
      }),
    );

    for (const tx of transactions) {
      if (tx.type === "income") {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: { increment: tx.amount } },
        });
      } else if (tx.type === "expense") {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: { decrement: tx.amount } },
        });
      } else if (tx.type === "transfer" && tx.toAccountId) {
        await prisma.$transaction([
          prisma.account.update({
            where: { id: accountId },
            data: { balance: { decrement: tx.amount } },
          }),
          prisma.account.update({
            where: { id: tx.toAccountId },
            data: { balance: { increment: tx.amount } },
          }),
        ]);
      }
    }

    res.status(201).json({
      imported: created.length,
      message: `${created.length} transactions imported successfully`,
    });
  } catch (error) {
    console.error("Confirm import error:", error);
    res
      .status(500)
      .json({ error: `Failed to save transactions, details ${error}` });
  }
});

export default router;
