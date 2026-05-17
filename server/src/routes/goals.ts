import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.json({ message: 'Goals route working!'});
})

export default router;