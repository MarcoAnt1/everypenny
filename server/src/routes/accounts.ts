import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.json({ message: 'Accounts route working!'});
})

export default router;