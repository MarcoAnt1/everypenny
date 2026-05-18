import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET all categories
router.get('/', async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                subcategories: true
            }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// GET one category by ID
router.get('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const category = await prisma.category.findUnique({
            where: { id: req.params.id },
            include: { subcategories: true }
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// POST create a new category
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, type, icon, parentId } = req.body;
        const category = await prisma.category.create({
            data: { name, type, icon, parentId }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// PUT update a category by ID
router.put('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const { name, type, icon, parentId } = req.body;
        const category = await prisma.category.update({
            where: { id: req.params.id },
            data: { name, type, icon, parentId }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// DELETE a category by ID
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        await prisma.category.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}); 

export default router;