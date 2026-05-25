import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

// TODO: Verify if the balance change logic is correct when updating or deleting a transaction, especially when changing the type (income/expense) or amount.

const router = Router();

const updateBalances = async (
    type: string,
    accountId: string,
    toAccountId: string | null,
    amount: number,
    accountType: string,
    toAccountType?: string
) => {
    if (type === 'income') {
        await prisma.account.update({
            where: { id: accountId },
            data: { balance: { increment: amount } }
        });
    } else if (type === 'expense') {
        await prisma.account.update({
            where: { id: accountId },
            data: { 
                balance: accountType === 'credit'
                    ? { increment: amount }
                    : { decrement: amount } }
        });
    } else if (type === 'transfer' && toAccountId) {
        await prisma.$transaction([
            prisma.account.update({
                where: { id: accountId },
                data: { balance: { decrement: amount } }
            }),
            prisma.account.update({
                where: { id: toAccountId },
                data: { 
                    balance: toAccountType === 'credit' 
                        ? { decrement: amount }
                        : { increment: amount} }
            }),
        ]);
    }
}

function balanceChange(oldType: string, oldAmount: number, newType: string, newAmount: number): number {
    const oldBalanceChange = oldType === 'income' ? oldAmount : -oldAmount;
    const newBalanceChange = newType === 'income' ? newAmount : -newAmount;
    return newBalanceChange - oldBalanceChange;
}

// GET all transactions
router.get('/', async (req: Request, res: Response) => {
    try {
        const { accountId, categoryId, type, startDate, endDate } = req.query;

        const transactions = await prisma.transaction.findMany({
            where: { 
                ...(accountId && { accountId: String(accountId) }),
                ...(categoryId && { categoryId: String(categoryId) }),
                ...(type && { type: String(type) }),
                ...(startDate && endDate && {
                    date: {
                        gte: new Date(String(startDate)),
                        lte: new Date(String(endDate))
                    }
                })
            },
            include: {
                account: true,
                toAccount: true,
                category: true,
                tags: { include: { tag: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// GET one transaction by id
router.get('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: req.params.id },
            include: {
                account: true,
                toAccount: true,
                category: true,
                tags: { include: { tag: true } }
            }
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transaction', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// POST create a new transaction
router.post('/', async (req: Request, res: Response) => {
    try {
        const { accountId, categoryId, toAccountId, amount, date, description, type, status, notes, tagIds } = req.body;

        if (type === 'transfer' && !toAccountId) {
            res.status(400).json({ error: 'Transfer requieres a destination account'});
            return;
        }

        const account = await prisma.account.findUnique({ where: { id: accountId }});
        const toAccount = toAccountId
            ? await prisma.account.findUnique({ where: { id: toAccountId }})
            : null;

        if (!account) {
            res.status(400).json({ error: 'Account not found'});
            return;
        }

        const transaction = await prisma.transaction.create({
            data: {
                accountId,
                categoryId: categoryId || null,
                toAccountId: toAccountId || null,
                description,
                amount,
                date: new Date(date),
                type,
                status,
                notes,
                tags: tagIds?.length ? {
                    create: tagIds.map((tagId: string) => ({ tagId }))
                } : undefined
            },
            include: {
                account: true,
                toAccount: true,
                category: true,
                tags: { include: { tag: true } }
            }
        });

        await updateBalances(
            type,
            accountId,
            toAccountId || null,
            amount,
            account.type,
            toAccount?.type
        )
        
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create transaction', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// PUT update a transaction by ID
router.put('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const existingTransaction = await prisma.transaction.findUnique({
            where: { id: req.params.id },
            include: { account: true }
        });

        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const { categoryId, toAccountId, description, amount, date, type, status, notes } = req.body;
        const transaction = await prisma.transaction.update({
            where: { id: req.params.id },
            data: { 
                categoryId: categoryId || null,
                toAccountId: toAccountId || null,
                description, 
                amount, date: new Date(date), 
                type, 
                status, 
                notes 
            },
            include: {
                account: true,
                toAccount: true,
                category: true,
                tags: { include: { tag: true } }
            }
        });

        await prisma.account.update({
            where: { id: transaction.accountId },
            data: { balance: { increment: balanceChange(existingTransaction?.type || '', existingTransaction?.amount || 0, type, amount) } }
        });

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update transaction', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// DELETE a transaction by ID
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const id = req.params.id;

        const existingTransaction = await prisma.transaction.findUnique({
            where: { id },
            include: { account: true }
        });

        if (!existingTransaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Update account balance before deleting the transaction
        const balanceChange = existingTransaction.type === 'income' ? -existingTransaction.amount : existingTransaction.amount;
        await prisma.account.update({
            where: { id: existingTransaction.accountId },
            data: { balance: { increment: balanceChange } }
        });
        
        // Delete related transaction tags first to maintain referential integrity
        await prisma.transactionTag.deleteMany({
            where: { transactionId: id }
        });

        await prisma.transaction.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transaction', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});




export default router;