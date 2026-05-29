import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import categoryRoutes from "./routes/categories";
import budgetRoutes from "./routes/budgets";
import goalRoutes from "./routes/goals";
import tagRoutes from "./routes/tags";
import importRoutes from "./routes/imports";
import { authenticate } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);

// Routes
app.use("/api/accounts", authenticate, accountRoutes);
app.use("/api/transactions", authenticate, transactionRoutes);
app.use("/api/categories", authenticate, categoryRoutes);
app.use("/api/budgets", authenticate, budgetRoutes);
app.use("/api/goals", authenticate, goalRoutes);
app.use("/api/tags", authenticate, tagRoutes);
app.use("/api/import", authenticate, importRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "EveryPenny API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
