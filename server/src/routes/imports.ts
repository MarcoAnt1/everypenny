import { Router, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs";
import prisma from "../lib/prisma";
import { AmexProcessor } from "../processors/amexProcessor";

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
      "application/pdf"
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
  "/excel/preview",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const bankType = (req.body.bankType || "").toUpperCase();

    try {
      let preview;

      if (bankType == "AMEX") {
        const processor = new AmexProcessor();
        preview = processor.processXlsx(req.file.path);
      }

      if (!preview) {
        return null;
      }

      res.json({
        total: preview.length,
        valid: preview.filter((r) => r.valid).length,
        invalid: preview.filter((r) => !r.valid).length,
        rows: preview,
      });
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
    console.log("it got here");

    if (!accountId || !transactions?.length) {
      res
        .status(400)
        .json({ error: "accountId and transactions are required" });
      return;
    }

    // Save all transactions
    const created = await prisma.$transaction(
        transactions.map((tx: any) => {
            return prisma.transaction.create({
            data: {
                accountId,
                categoryId:  tx.categoryId  ?? null,
                description: tx.description ?? 'Imported transaction',
                amount:      Number(tx.amount),
                date:        tx.date,
                type:        tx.type     ?? 'expense',
                status:      'cleared',
                notes:       'Imported from Excel'
            }
            })
        })
    );

    // Update account balance
    const balanceDelta = transactions.reduce((sum: number, tx: any) => {
      return sum + (tx.type === "income" ? tx.amount : -tx.amount);
    }, 0);

    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceDelta } },
    });

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
