import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// TODO: Replace with real user authentication and management
const TEMP_USER_ID = process.env.TEMP_USER_ID || '';

// GET all accounts
router.get('/', async (req: Request, res: Response) => {
    try {
        const accounts = await prisma.account.findMany({
            where: { userId: TEMP_USER_ID }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// GET one account by id
router.get('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const account = await prisma.account.findUnique({
            where: { id: req.params.id },
            include: { transactions: true }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch account', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// POST create a new account
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, type, institution, balance, currency } = req.body;
        const account = await prisma.account.create({
            data: {
                userId: TEMP_USER_ID,
                name,
                type,
                institution,
                balance,
                currency
            }
        });
        res.status(201).json(account);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// PUT update a account by ID
router.put('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const { name, type, institution, balance, currency } = req.body;
        const account = await prisma.account.update({
            where: { id: req.params.id },
            data: { name, type, institution, balance, currency }
        });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update account', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// DELETE a account by ID
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        await prisma.account.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}); 

export default router;