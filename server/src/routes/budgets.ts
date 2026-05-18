import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// TODO: Replace with real user authentication and management
const TEMP_USER_ID = process.env.TEMP_USER_ID || '';

// GET all budgets
router.get('/', async (req: Request, res: Response) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { userId: TEMP_USER_ID },
            include: { category: true }
        });

        // Calculate spent amount for each budget
        const budgetsWithSpent = await Promise.all(
            budgets.map(async (budget) => {
                const now = new Date();
                const startDate = budget.period === 'monthly'
                    ? new Date(now.getFullYear(), now.getMonth(), 1)
                    : new Date(now.getFullYear(), 0, 1);
                
                const spending = await prisma.transaction.aggregate({
                    where: {
                        categoryId: budget.categoryId,
                        type: 'expense',
                        date: { gte: startDate, lte: now }
                    },
                    _sum: { amount: true }
                });

                const spent = spending._sum.amount || 0;
                return {
                    ...budget,
                    spent,
                    remaining: budget.limitAmount - spent,
                    percentage: Math.round((spent / budget.limitAmount) * 100)
                }
            })
        );
        res.json(budgetsWithSpent);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budgets', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// GET one budget by id
router.get('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const budget = await prisma.budget.findUnique({
            where: { id: req.params.id },
            include: { category: true }
        });
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        
        res.json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budget', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// POST create a new budget
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, categoryId, limitAmount, period } = req.body;
        const budget = await prisma.budget.create({
            data: {
                userId: TEMP_USER_ID,
                name,
                categoryId,
                limitAmount,
                period: period || 'monthly'
            },
            include: { category: true }
        });
        res.status(201).json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create budget', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// PUT update a budget by ID
router.put('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const { name, categoryId, limitAmount, period } = req.body;
        const budget = await prisma.budget.update({
            where: { id: req.params.id },
            data: { name, categoryId, limitAmount, period },
            include: { category: true }
        });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// DELETE a budget by ID
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        await prisma.budget.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete budget', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}); 

export default router;