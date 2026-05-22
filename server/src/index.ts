import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import categoryRoutes from "./routes/categories";
import budgetRoutes from "./routes/budgets";
import goalRoutes from "./routes/goals";
import tagRoutes from "./routes/tags";
import importRoutes from "./routes/imports";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/import', importRoutes)

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'EveryPenny API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});