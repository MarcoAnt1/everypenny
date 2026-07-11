import "./lib/load-env";
import { env } from "./lib/env";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import categoryRoutes from "./routes/categories";
import budgetRoutes from "./routes/budgets";
import goalRoutes from "./routes/goals";
import tagRoutes from "./routes/tags";
import importRoutes from "./routes/imports";
import connectionsRouter from "./routes/connections";
import { authenticate } from "./middleware/auth";
import { setupSwagger } from "./swagger";
import helmet from "helmet";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const PORT = env.PORT;

setupSwagger(app);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.1.114:5173",
      "https://everypenny-sigma.vercel.app",
    ],
  }),
);
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRoutes);

// Routes
app.use("/api/accounts", authenticate, accountRoutes);
app.use("/api/transactions", authenticate, transactionRoutes);
app.use("/api/categories", authenticate, categoryRoutes);
app.use("/api/budgets", authenticate, budgetRoutes);
app.use("/api/goals", authenticate, goalRoutes);
app.use("/api/tags", authenticate, tagRoutes);
app.use("/api/import", authenticate, importRoutes);
app.use("/api/connections", authenticate, connectionsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "EveryPenny API is running" });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
